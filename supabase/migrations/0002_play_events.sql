-- EyeCon: gameplay analytics for the thesis.
-- Every meaningful moment is one row in play_events; level_stats summarises them per level.

create table public.play_events (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references public.profiles(id) on delete cascade,
  session_id  text not null,            -- one per editor visit of a level
  level_id    text,
  type        text not null check (type in (
                'level_open',      -- editor opened (first try or a revision)
                'submit',          -- sent to the client (attempt n)
                'reply',           -- client answered: approved or "fix again"
                'hint',            -- hint button used
                'level_leave',     -- left the editor without submitting
                'tutorial_step')), -- Piko onboarding progress
  attempt     smallint,               -- 1 = first submission of this level, 2+ = resubmits
  active_ms   integer,                -- time actually working (idle > 60s and hidden tab excluded)
  elapsed_ms  integer,                -- wall-clock time since the editor opened
  stars       smallint,
  approved    boolean,
  data        jsonb not null default '{}'::jsonb,   -- extra detail (tasks met/total, undo count, step name…)
  created_at  timestamptz not null default now()
);
create index play_events_level_idx  on public.play_events (level_id, type);
create index play_events_player_idx on public.play_events (player_id, created_at);

alter table public.play_events enable row level security;
-- Players add their own events and can't change history; admins read everything.
create policy events_insert on public.play_events for insert with check (player_id = auth.uid());
create policy events_read   on public.play_events for select using (player_id = auth.uid() or public.is_admin());

-- Per-level summary for the thesis (admins only, via the function below).
create or replace function public.admin_level_stats()
returns table (
  level_id text,
  players bigint,                -- players who opened it
  approved_players bigint,       -- players who got it approved
  first_try_approved bigint,     -- approved on the first submission
  avg_submissions numeric,       -- submissions per player who submitted
  avg_resubmits numeric,         -- "fix again" rounds per player
  median_active_min numeric,     -- median active minutes to approval
  avg_hints numeric,
  abandoned bigint,              -- editor visits left without submitting
  avg_first_stars numeric
) language sql stable security definer set search_path = public as $$
  with subs as (
    select level_id, player_id, count(*) n, min(attempt) filter (where approved) first_ok,
           sum(active_ms) total_active, bool_or(approved) ok
      from play_events where type = 'reply' group by 1, 2
  ), firsts as (
    select distinct on (level_id, player_id) level_id, player_id, stars
      from play_events where type = 'reply' order by level_id, player_id, created_at
  )
  select l.level_id,
         count(distinct l.player_id) filter (where l.type = 'level_open'),
         (select count(*) from subs s where s.level_id = l.level_id and s.ok),
         (select count(*) from subs s where s.level_id = l.level_id and s.first_ok = 1),
         (select round(avg(n), 2) from subs s where s.level_id = l.level_id),
         (select round(avg(n - 1), 2) from subs s where s.level_id = l.level_id),
         (select round((percentile_cont(.5) within group (order by total_active) / 60000.0)::numeric, 1) from subs s where s.level_id = l.level_id and s.ok),
         round(count(*) filter (where l.type = 'hint')::numeric / nullif(count(distinct l.player_id) filter (where l.type = 'level_open'), 0), 2),
         count(*) filter (where l.type = 'level_leave'),
         (select round(avg(stars), 2) from firsts f where f.level_id = l.level_id)
    from play_events l
   where l.level_id is not null and public.is_admin()
   group by l.level_id
   order by l.level_id;
$$;
grant execute on function public.admin_level_stats() to authenticated;
