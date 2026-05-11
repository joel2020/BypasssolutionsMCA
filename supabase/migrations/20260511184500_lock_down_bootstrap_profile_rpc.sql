/*
  Lock down the CRM profile bootstrap helper.

  The helper is intended for service-role/admin SQL use only after an Auth user
  already exists. Browser roles must not be able to execute it through RPC.
*/

revoke all on function public.bootstrap_crm_profile(text, text, text) from public;
revoke all on function public.bootstrap_crm_profile(text, text, text) from anon;
revoke all on function public.bootstrap_crm_profile(text, text, text) from authenticated;
grant execute on function public.bootstrap_crm_profile(text, text, text) to service_role;
