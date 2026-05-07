/*
  Bypass Solution production hardening
  - Adds role-based profiles for CRM authorization.
  - Adds regulated-data tables and private storage buckets.
  - Tightens RLS helpers for admin/underwriter/viewer and assigned sales reps.
  - Never store SSNs in plaintext; credit reports and documents remain private.
*/

create extension if not exists pgcrypto;

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

drop function if exists public.current_profile_role();
create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

drop function if exists public.is_admin_role(text[]);
create or replace function public.is_admin_role(allowed_roles text[] default array['admin','underwriter','sales_rep','viewer'])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role = any(allowed_roles) from public.profiles where id = auth.uid() and status = 'active'), false)
$$;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin_role(array['admin']));
create policy "Admins can manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin_role(array['admin']))
  with check (public.is_admin_role(array['admin']));

alter table public.leads add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.tasks add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.notes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.documents add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.offers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.commissions add column if not exists rep_id uuid references auth.users(id) on delete set null;

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  email text not null default '',
  ip_address inet,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  source text not null default 'website'
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.datamerch_checks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'not_configured',
  result_summary jsonb not null default '{}'::jsonb,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_pull_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  consent_record_id uuid references public.consent_records(id) on delete restrict,
  status text not null default 'pending',
  provider text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.credit_reports (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  request_id uuid references public.credit_pull_requests(id) on delete cascade,
  storage_path text not null,
  report_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.datamerch_checks enable row level security;
alter table public.credit_pull_requests enable row level security;
alter table public.credit_reports enable row level security;

-- Replace broad CRM policies with role-aware access where names exist from earlier migrations.
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Anyone can submit a lead" on public.leads;
drop policy if exists "Anyone can submit complete website leads" on public.leads;

create policy "Public can submit safe website leads"
  on public.leads for insert
  to anon, authenticated
  with check (
    source = 'Website'
    and consent is true
    and char_length(business_name) > 0
    and char_length(first_name) > 0
    and char_length(last_name) > 0
    and char_length(email) > 0
  );

create policy "CRM users can read authorized leads"
  on public.leads for select
  to authenticated
  using (
    public.is_admin_role(array['admin','underwriter','viewer'])
    or (public.is_admin_role(array['sales_rep']) and assigned_to = auth.uid())
  );

create policy "CRM users can update authorized leads"
  on public.leads for update
  to authenticated
  using (
    public.is_admin_role(array['admin','underwriter'])
    or (public.is_admin_role(array['sales_rep']) and assigned_to = auth.uid())
  )
  with check (
    public.is_admin_role(array['admin','underwriter'])
    or (public.is_admin_role(array['sales_rep']) and assigned_to = auth.uid())
  );

create policy "Admins can delete leads"
  on public.leads for delete
  to authenticated
  using (public.is_admin_role(array['admin']));

-- Generic CRM table policies. Drop broad legacy policies first so any logged-in
-- Supabase user cannot access CRM records without an active authorized profile.
do $$
declare
  t text;
  legacy_policy text;
begin
  foreach t in array array['notes','tasks','call_logs','documents','offers','funders','commissions','contact_submissions','consent_records','audit_logs','datamerch_checks','credit_pull_requests','credit_reports'] loop
    foreach legacy_policy in array array[
      'Authenticated users can read ' || t,
      'Authenticated users can insert ' || t,
      'Authenticated users can update ' || t,
      'Authenticated users can delete ' || t,
      'Anon can insert document records',
      'Authenticated users can read contact submissions'
    ] loop
      execute format('drop policy if exists %I on public.%I', legacy_policy, t);
    end loop;

    execute format('drop policy if exists "CRM read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "CRM write %1$s" on public.%1$I', t);
    execute format('create policy "CRM read %1$s" on public.%1$I for select to authenticated using (public.is_admin_role(array[''admin'',''underwriter'',''viewer'',''sales_rep'']))', t);
    execute format('create policy "CRM write %1$s" on public.%1$I for all to authenticated using (public.is_admin_role(array[''admin'',''underwriter'',''sales_rep''])) with check (public.is_admin_role(array[''admin'',''underwriter'',''sales_rep'']))', t);
  end loop;
end $$;

-- Private storage buckets. Public reads are intentionally disabled.
insert into storage.buckets (id, name, public)
values
  ('application-documents', 'application-documents', false),
  ('credit-reports', 'credit-reports', false),
  ('contracts', 'contracts', false)
on conflict (id) do update set public = false;

drop policy if exists "CRM can read private funding files" on storage.objects;
drop policy if exists "CRM can upload private funding files" on storage.objects;
create policy "CRM can read private funding files"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('application-documents','credit-reports','contracts') and public.is_admin_role(array['admin','underwriter','viewer','sales_rep']));
create policy "CRM can upload private funding files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('application-documents','credit-reports','contracts') and public.is_admin_role(array['admin','underwriter','sales_rep']));
