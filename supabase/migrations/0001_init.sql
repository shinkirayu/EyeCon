-- EyeCon: schema, admin check, and Row Level Security.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Players use anonymous auth; admins use email/password and are listed in public.admins.

-- ───────────── Admins ─────────────
create table public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: only the service role / dashboard can read or change this table.

-- True when the signed-in user is listed as an admin. SECURITY DEFINER so it can
-- read public.admins even though clients cannot; search_path pinned for safety.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Lets the admin page confirm a login without exposing the admins table.
create or replace function public.my_admin_username() returns text
language sql stable security definer set search_path = public as $$
  select username from public.admins where user_id = auth.uid();
$$;
grant execute on function public.my_admin_username() to authenticated;

-- ───────────── Players ─────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text check (char_length(display_name) between 1 and 24),
  currency      integer not null default 0,
  total_xp      integer not null default 0,
  state         jsonb   not null default '{}'::jsonb,   -- full game save (settings, workday, inventory, badges, mail state…)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.level_progress (
  player_id     uuid not null references public.profiles(id) on delete cascade,
  level_id      text not null,
  best_stars    smallint not null default 0 check (best_stars between 0 and 5),
  completed_at  timestamptz,
  design        jsonb,      -- approved design shown on the client's site
  draft         jsonb,      -- unfinished revision
  updated_at    timestamptz not null default now(),
  primary key (player_id, level_id)
);

create table public.submissions (
  id            bigint generated always as identity primary key,
  player_id     uuid not null references public.profiles(id) on delete cascade,
  level_id      text not null,
  stars         smallint not null check (stars between 0 and 5),
  score         numeric,
  approved      boolean not null,
  reward        integer not null default 0,
  xp            integer not null default 0,
  reply         text,       -- client's email text
  quote         text,       -- short feedback line
  elements      jsonb,      -- design as sent
  created_at    timestamptz not null default now()
);
create index submissions_player_idx on public.submissions (player_id, created_at desc);

-- ───────────── Content ─────────────
create table public.clients (
  id          text primary key,
  name        text not null,
  avatar      text,
  tier        text not null default 'novice',
  pay         integer not null default 40,
  sort_order  integer not null default 0,
  data        jsonb not null default '{}'::jsonb
);

create type public.level_status as enum ('draft', 'submitted', 'published', 'archived');

create table public.levels (
  id           text primary key default gen_random_uuid()::text,
  owner_id     uuid references auth.users(id) on delete set null,   -- null = built-in level
  status       public.level_status not null default 'draft',
  client_id    text references public.clients(id) on delete set null,
  day          smallint,      -- which workday it arrives on (built-in schedule)
  slot         smallint,      -- order within the day
  sort_order   integer not null default 0,
  title        text not null default 'Untitled level',
  data         jsonb not null,  -- canvas, elements, goals/checks, tools, email + reply templates, reward
  review_note  text,            -- admin feedback when sending a level back
  version      integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index levels_status_idx on public.levels (status, sort_order);

create table public.level_versions (
  level_id    text not null references public.levels(id) on delete cascade,
  version     integer not null,
  data        jsonb not null,
  published_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  primary key (level_id, version)
);

create table public.content_text (
  key          text primary key,        -- e.g. 'piko.tutorial.0', 'mail.reply.approved'
  area         text not null,           -- 'piko' | 'onboarding' | 'emails' | 'tasks' | 'feedback' | 'ui'
  value        text not null,           -- published text players see
  draft        text,                    -- unpublished edit
  note         text,                    -- where it appears / placeholders it supports
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now()
);

-- ───────────── updated_at ─────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch       before update on public.profiles       for each row execute function public.touch_updated_at();
create trigger level_progress_touch before update on public.level_progress for each row execute function public.touch_updated_at();
create trigger levels_touch         before update on public.levels         for each row execute function public.touch_updated_at();
create trigger content_touch        before update on public.content_text   for each row execute function public.touch_updated_at();

-- ───────────── Level status guard ─────────────
-- Players may only move their own level between 'draft' and 'submitted'.
-- Publishing/archiving happens through admin_set_level_status() below.
create or replace function public.guard_level_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.owner_id is distinct from auth.uid() then
      raise exception 'new levels must be your own drafts';
    end if;
  elsif new.status not in ('draft', 'submitted') or new.owner_id is distinct from old.owner_id then
    raise exception 'only admins can publish, archive, or change owner';
  end if;
  return new;
end $$;
create trigger levels_guard before insert or update on public.levels
  for each row execute function public.guard_level_status();

-- Admin review: publish / unpublish (archive) / send back, with a version snapshot on publish.
create or replace function public.admin_set_level_status(p_level text, p_status public.level_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.levels
     set status = p_status,
         review_note = coalesce(p_note, review_note),
         version = case when p_status = 'published' then version + 1 else version end
   where id = p_level
   returning version into v;
  if p_status = 'published' then
    insert into public.level_versions (level_id, version, data, published_by)
      select id, v, data, auth.uid() from public.levels where id = p_level;
  end if;
end $$;
grant execute on function public.admin_set_level_status(text, public.level_status, text) to authenticated;

-- Publish every content_text draft (admin "Publish" button).
create or replace function public.admin_publish_text(p_keys text[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.content_text set value = draft, draft = null, updated_by = auth.uid()
   where draft is not null and (p_keys is null or key = any(p_keys));
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.admin_publish_text(text[]) to authenticated;

-- ───────────── Row Level Security ─────────────
alter table public.profiles       enable row level security;
alter table public.level_progress enable row level security;
alter table public.submissions    enable row level security;
alter table public.clients        enable row level security;
alter table public.levels         enable row level security;
alter table public.level_versions enable row level security;
alter table public.content_text   enable row level security;

-- Players: own rows only (admins may read for support).
create policy profiles_own   on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_read on public.profiles for select using (public.is_admin());

create policy progress_own   on public.level_progress for all
  using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy submissions_read   on public.submissions for select using (player_id = auth.uid() or public.is_admin());
create policy submissions_insert on public.submissions for insert with check (player_id = auth.uid());
-- (no update/delete: history is append-only)

-- Content: everyone reads, admins write.
create policy clients_read  on public.clients for select using (true);
create policy clients_admin on public.clients for all using (public.is_admin()) with check (public.is_admin());

create policy text_read  on public.content_text for select using (true);
create policy text_admin on public.content_text for all using (public.is_admin()) with check (public.is_admin());
-- Drafts are readable by anyone above; the game only uses `value`. To hide drafts,
-- expose a view without the draft column instead.

-- Levels: published for all; own drafts/submissions for the creator; everything for admins.
create policy levels_read on public.levels for select
  using (status = 'published' or owner_id = auth.uid() or public.is_admin());
create policy levels_insert on public.levels for insert
  with check (owner_id = auth.uid() or public.is_admin());
create policy levels_update on public.levels for update
  using ((owner_id = auth.uid() and status in ('draft', 'submitted')) or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy levels_delete on public.levels for delete
  using ((owner_id = auth.uid() and status = 'draft') or public.is_admin());

create policy versions_read on public.level_versions for select using (public.is_admin());

-- ───────────── Storage: level images ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('level-assets', 'level-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy level_assets_read on storage.objects for select using (bucket_id = 'level-assets');
create policy level_assets_upload on storage.objects for insert
  with check (bucket_id = 'level-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy level_assets_delete on storage.objects for delete
  using (bucket_id = 'level-assets' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
