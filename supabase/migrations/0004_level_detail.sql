-- EyeCon: one row per player for a single level (admin drill-down).
create or replace function public.admin_level_detail(p_level text)
returns table (
  player_id uuid,
  player_name text,
  opened_at timestamptz,          -- first time they opened the level
  submissions bigint,             -- how many times they sent it
  resubmits bigint,               -- "fix again" rounds (submissions − 1)
  approved boolean,
  approved_attempt smallint,      -- which submission got approved (1 = first try)
  active_min numeric,             -- active minutes until approval (or so far)
  elapsed_min numeric,            -- wall-clock minutes until approval (or so far)
  hints bigint,
  abandoned bigint,               -- editor visits left without sending
  first_stars smallint,
  best_stars smallint
) language sql stable security definer set search_path = public as $$
  with ev as (select * from public.play_events where level_id = p_level and public.is_admin()),
  ok as (
    select distinct on (player_id) player_id, attempt, created_at
      from ev where type = 'reply' and approved order by player_id, created_at
  )
  select e.player_id,
         coalesce(p.display_name, 'Guest'),
         min(e.created_at) filter (where e.type = 'level_open'),
         count(*) filter (where e.type = 'submit'),
         greatest(count(*) filter (where e.type = 'submit') - 1, 0),
         ok.player_id is not null,
         ok.attempt,
         round(sum(e.active_ms) filter (where e.type in ('submit', 'level_leave') and (ok.created_at is null or e.created_at <= ok.created_at)) / 60000.0, 1),
         round(extract(epoch from (coalesce(ok.created_at, max(e.created_at)) - min(e.created_at) filter (where e.type = 'level_open'))) / 60.0, 1),
         count(*) filter (where e.type = 'hint'),
         count(*) filter (where e.type = 'level_leave'),
         (array_agg(e.stars order by e.created_at) filter (where e.type = 'reply'))[1],
         max(e.stars) filter (where e.type = 'reply')
    from ev e
    left join ok on ok.player_id = e.player_id
    left join public.profiles p on p.id = e.player_id
   group by e.player_id, p.display_name, ok.player_id, ok.attempt, ok.created_at
   order by min(e.created_at);
$$;
grant execute on function public.admin_level_detail(text) to authenticated;
