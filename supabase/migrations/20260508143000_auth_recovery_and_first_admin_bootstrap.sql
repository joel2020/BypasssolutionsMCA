/*
  Auth recovery and first-admin bootstrap hardening.

  The CRM profile table is public.profiles and it is keyed by auth.users.id.
  Browser code must query profiles.id = auth.uid(); email is informational only.
*/

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'underwriter', 'sales_rep', 'viewer')),
  status text not null default 'pending' check (status in ('active', 'pending', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and status = 'active'
  limit 1
$$;

create or replace function public.is_admin_role(allowed_roles text[] default array['admin','underwriter','sales_rep','viewer'])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select role = any(allowed_roles)
      from public.profiles
      where id = (select auth.uid())
        and status = 'active'
      limit 1
    ),
    false
  )
$$;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin_role(array['admin']));

create policy "Admins can manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin_role(array['admin']))
  with check (public.is_admin_role(array['admin']));

create index if not exists idx_profiles_role_status on public.profiles (role, status);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

create or replace function private.bootstrap_first_crm_admin(
  target_user_id uuid,
  target_email text,
  target_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_admin_count integer;
  auth_user_id uuid;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  select count(*)
  into existing_admin_count
  from public.profiles
  where role = 'admin'
    and status = 'active';

  if existing_admin_count > 0 then
    raise exception 'An active CRM admin already exists. Manage additional admins from the CRM settings page.';
  end if;

  select id
  into auth_user_id
  from auth.users
  where id = target_user_id
  limit 1;

  if auth_user_id is null then
    raise exception 'No Supabase Auth user exists for %', target_user_id;
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    target_user_id,
    nullif(lower(btrim(target_email)), ''),
    coalesce(nullif(btrim(target_full_name), ''), nullif(lower(btrim(target_email)), ''), 'CRM Admin'),
    'admin',
    'active'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin',
        status = 'active',
        updated_at = now();

  return target_user_id;
end;
$$;

revoke all on function private.bootstrap_first_crm_admin(uuid, text, text) from public;
revoke all on function private.bootstrap_first_crm_admin(uuid, text, text) from anon;
revoke all on function private.bootstrap_first_crm_admin(uuid, text, text) from authenticated;
grant execute on function private.bootstrap_first_crm_admin(uuid, text, text) to service_role;
