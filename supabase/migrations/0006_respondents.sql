-- Study respondents: one verified person per account (Google or email code),
-- with consent and a short profile. Run after 0005_quiz_results.sql.

create table public.respondents (
  id            uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email         text,                       -- verified (Google, or a 6-digit email code)
  display_name  text,
  section       text,                       -- year level / section
  prior_ui      text check (prior_ui in ('yes', 'a little', 'no')),
  consent_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.respondents enable row level security;
create policy respondents_insert on public.respondents for insert with check (id = auth.uid());
create policy respondents_update on public.respondents for update using (id = auth.uid()) with check (id = auth.uid());
create policy respondents_read   on public.respondents for select using (id = auth.uid() or public.is_admin());

-- One pre-test and one post-test per account.
create unique index quiz_results_one_per_kind on public.quiz_results (player_id, kind);

-- Admin study table: each respondent with pre score, post score and the gain.
create or replace function public.admin_study()
returns table (
  respondent_id uuid, email text, display_name text, section text, prior_ui text, consent_at timestamptz,
  pre_score smallint, pre_at timestamptz, post_score smallint, post_at timestamptz, total smallint, gain integer
)
language sql stable security definer set search_path = public as $$
  select r.id, r.email, r.display_name, r.section, r.prior_ui, r.consent_at,
         pre.score, pre.created_at, post.score, post.created_at,
         coalesce(pre.total, post.total),
         case when pre.score is not null and post.score is not null then post.score - pre.score end
  from respondents r
  left join quiz_results pre  on pre.player_id  = r.id and pre.kind  = 'pre'
  left join quiz_results post on post.player_id = r.id and post.kind = 'post'
  where public.is_admin()
  order by r.created_at;
$$;
revoke all on function public.admin_study() from public;
grant execute on function public.admin_study() to authenticated;
