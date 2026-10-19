-- Admins can remove a respondent (e.g. test runs) with their pre-test and post-test answers.
-- Their game save and play history are left alone.
create or replace function public.admin_delete_respondent(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  delete from public.quiz_results where player_id = p_id;
  delete from public.respondents where id = p_id;
end $$;
revoke all on function public.admin_delete_respondent(uuid) from public, anon;
grant execute on function public.admin_delete_respondent(uuid) to authenticated;
