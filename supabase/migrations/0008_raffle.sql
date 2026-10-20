-- Post-test raffle: one numbered entry per person who finished the post-test.
-- GCash numbers are private (only the player and admins can read them); the public
-- sees only how many entries there are and which entry numbers won.

create table public.raffle_entries (
  entry_no   bigint generated always as identity primary key,
  player_id  uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  gcash      text not null check (gcash ~ '^09[0-9]{9}$'),
  won        boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.raffle_entries enable row level security;
-- Only people who finished the post-test can enter, once.
create policy raffle_insert on public.raffle_entries for insert with check (
  player_id = auth.uid() and exists (select 1 from public.quiz_results q where q.player_id = auth.uid() and q.kind = 'post'));
create policy raffle_read on public.raffle_entries for select using (player_id = auth.uid() or public.is_admin());

-- Public numbers for the website: entry count and the winning entry numbers (no GCash).
create or replace function public.raffle_public()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'entries', (select count(*) from raffle_entries),
    'winners', coalesce((select json_agg(entry_no order by entry_no) from raffle_entries where won), '[]'::json));
$$;
grant execute on function public.raffle_public() to anon, authenticated;

-- Admin: draw n random winners from the entries that haven't won yet.
create or replace function public.admin_draw_raffle(n int default 3)
returns setof public.raffle_entries language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return query
    update raffle_entries set won = true
    where entry_no in (select entry_no from raffle_entries where not won order by random() limit n)
    returning *;
end $$;
grant execute on function public.admin_draw_raffle(int) to authenticated;

-- One entry per GCash number too (same person on another browser can't enter twice).
alter table public.raffle_entries add constraint raffle_entries_gcash_key unique (gcash);
