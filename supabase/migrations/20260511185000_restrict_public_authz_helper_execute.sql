/*
  Restrict direct execution of public RLS helper functions.

  Authenticated users still need execute permission because existing RLS policies
  call these helpers. Anonymous users do not need them.
*/

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_role() from anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_role() to service_role;

revoke all on function public.is_admin_role(text[]) from public;
revoke all on function public.is_admin_role(text[]) from anon;
grant execute on function public.is_admin_role(text[]) to authenticated;
grant execute on function public.is_admin_role(text[]) to service_role;
