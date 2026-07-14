/*
  # Restrict the RLS helper functions to signed-in users

  These are SECURITY DEFINER. Postgres grants EXECUTE to PUBLIC by default, so
  `revoke ... from anon` alone was not enough — anon could still reach them via
  PUBLIC. (Harmless in practice: with no auth.uid() they return false. But the
  Supabase security advisor flags it, and least-privilege is the right default.)
*/

revoke execute on function public.can_see_lead(uuid, text)        from public, anon;
revoke execute on function public.can_write_lead(uuid, text)      from public, anon;
revoke execute on function public.can_see_application(uuid)       from public, anon;
revoke execute on function public.current_profile_name()          from public, anon;
revoke execute on function public.current_profile_role()          from public, anon;

grant execute on function public.can_see_lead(uuid, text)         to authenticated;
grant execute on function public.can_write_lead(uuid, text)       to authenticated;
grant execute on function public.can_see_application(uuid)        to authenticated;
grant execute on function public.current_profile_name()           to authenticated;
grant execute on function public.current_profile_role()           to authenticated;
