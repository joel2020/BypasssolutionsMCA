/*
  Production CRM profile bootstrap helpers.

  Purpose:
  - Prevent Supabase Auth users from getting stuck without a CRM profile by
    documenting/providing one safe SQL function operators can run after inviting
    an Auth user.
  - Does not create auth.users rows, passwords, JWTs, or service-role secrets.
  - Safe to rerun. It only upserts public.profiles for an existing auth user.

  Usage after creating/inviting the first admin in Supabase Auth:
    select public.bootstrap_crm_profile('admin@example.com', 'Admin Name', 'admin');
*/

create or replace function public.bootstrap_crm_profile(
  target_email text,
  target_full_name text,
  target_role text default 'admin'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  normalized_role text := lower(trim(target_role));
begin
  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'target_email is required';
  end if;

  if normalized_role not in ('admin', 'underwriter', 'sales_rep', 'viewer') then
    raise exception 'target_role must be admin, underwriter, sales_rep, or viewer';
  end if;

  select id
    into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  order by created_at asc
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for %. Invite/create the user first, then rerun bootstrap_crm_profile.', target_email;
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (target_user_id, lower(trim(target_email)), nullif(trim(target_full_name), ''), normalized_role, 'active')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = excluded.role,
        status = 'active',
        updated_at = now();

  return target_user_id;
end;
$$;

revoke all on function public.bootstrap_crm_profile(text, text, text) from public;
grant execute on function public.bootstrap_crm_profile(text, text, text) to service_role;

comment on function public.bootstrap_crm_profile(text, text, text)
  is 'Service-role-only helper to bind an existing Supabase Auth user to an active CRM profile. Run from Supabase SQL editor/admin context after inviting the user.';
