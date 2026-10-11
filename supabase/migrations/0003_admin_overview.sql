-- EyeCon: headline numbers for the admin dashboard (admins only).
create or replace function public.admin_overview()
returns table (
  players bigint,          -- everyone who has a profile
  google_players bigint,   -- signed in with Google (not anonymous)
  active_7d bigint,        -- players with any event in the last 7 days
  submissions bigint,
  approvals bigint,
  total_active_hours numeric
) language sql stable security definer set search_path = public, auth as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p join auth.users u on u.id = p.id where not coalesce(u.is_anonymous, false)),
    (select count(distinct player_id) from public.play_events where created_at > now() - interval '7 days'),
    (select count(*) from public.play_events where type = 'submit'),
    (select count(*) from public.play_events where type = 'reply' and approved),
    (select round(coalesce(sum(active_ms), 0) / 3600000.0, 1) from public.play_events where type in ('submit', 'level_leave'))
  where public.is_admin();
$$;
grant execute on function public.admin_overview() to authenticated;

-- Submissions per day (last 30 days) for the activity chart.
create or replace function public.admin_daily_activity()
returns table (day date, submissions bigint, players bigint)
language sql stable security definer set search_path = public as $$
  select created_at::date, count(*), count(distinct player_id)
    from public.play_events
   where type = 'submit' and created_at > now() - interval '30 days' and public.is_admin()
   group by 1 order by 1;
$$;
grant execute on function public.admin_daily_activity() to authenticated;
