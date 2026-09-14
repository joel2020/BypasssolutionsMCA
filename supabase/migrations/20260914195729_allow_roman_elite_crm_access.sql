-- Allow Roman’s explicitly approved address in Bypass CRM. This does not allow
-- other elitefundingsol.com addresses. Verification and existing roles are preserved.
-- Existing profiles (including disabled/pending ones) are never overwritten.
create or replace function public.enroll_company_crm_user()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then return false; end if;
  select lower(u.email) into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false)
    and (u.banned_until is null or u.banned_until <= now())
    and exists (
      select 1 from auth.identities i
      where i.user_id = u.id and i.provider = 'google'
        and lower(i.identity_data->>'email') = lower(u.email)
        and i.identity_data->>'email_verified' = 'true'
    )
    and (
      lower(u.email) ~ '^[^@[:space:]]+@bypasssolution[.]com$'
      or lower(u.email) = 'roman@elitefundingsol.com'
    );
  if v_email is null then return false; end if;

  -- Legacy record access also matches full_name. Never use a self-editable
  -- Google display name, which could impersonate an existing rep's name.
  insert into public.profiles (id, email, full_name, role, status)
  values (v_user_id, v_email, v_email, 'sales_rep', 'active')
  on conflict (id) do nothing;
  return true;
end;
$$;

revoke all on function public.enroll_company_crm_user() from public, anon;
grant execute on function public.enroll_company_crm_user() to authenticated;

-- Configure this as Auth's Before User Created hook before enabling signups.
-- Reject external signups at the Auth boundary, before they receive any session.
create or replace function public.before_company_user_created(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(lower(event->'user'->>'email'), '') ~ '^[^@[:space:]]+@bypasssolution[.]com$'
    or lower(event->'user'->>'email') = 'roman@elitefundingsol.com' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'New CRM accounts require a @bypasssolution.com or approved email address.'
  ));
end;
$$;
revoke all on function public.before_company_user_created(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_company_user_created(jsonb) to supabase_auth_admin;
