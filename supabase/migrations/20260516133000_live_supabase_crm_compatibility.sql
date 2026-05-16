create extension if not exists pgcrypto;

create or replace function public.default_organization_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from public.organizations order by created_at asc limit 1
$$;

revoke execute on function public.default_organization_id() from anon;

alter table public.leads alter column organization_id set default public.default_organization_id();
alter table public.applications alter column organization_id set default public.default_organization_id();
alter table public.businesses alter column organization_id set default public.default_organization_id();
alter table public.owners alter column organization_id set default public.default_organization_id();
alter table public.documents alter column organization_id set default public.default_organization_id();
alter table public.contact_submissions alter column organization_id set default public.default_organization_id();
alter table public.activity_logs alter column organization_id set default public.default_organization_id();
alter table public.funding_partners alter column organization_id set default public.default_organization_id();
alter table public.partner_submissions alter column organization_id set default public.default_organization_id();

alter table public.leads add column if not exists legal_name text;
alter table public.leads add column if not exists dba text;
alter table public.leads add column if not exists business_address text;
alter table public.leads add column if not exists business_city text;
alter table public.leads add column if not exists business_state text;
alter table public.leads add column if not exists business_zip text;
alter table public.leads add column if not exists business_phone text;
alter table public.leads add column if not exists business_email text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists ein_last_four text;
alter table public.leads add column if not exists entity_type text;
alter table public.leads add column if not exists merchant_type text;
alter table public.leads add column if not exists start_date date;
alter table public.leads add column if not exists products_services_sold text;
alter table public.leads add column if not exists industry text;
alter table public.leads add column if not exists state text;
alter table public.leads add column if not exists current_bank text;
alter table public.leads add column if not exists bank_account_type text;
alter table public.leads add column if not exists monthly_revenue numeric default 0;
alter table public.leads add column if not exists gross_monthly_revenue numeric default 0;
alter table public.leads add column if not exists net_monthly_deposits numeric default 0;
alter table public.leads add column if not exists average_monthly_sales numeric default 0;
alter table public.leads add column if not exists annual_revenue numeric default 0;
alter table public.leads add column if not exists funding_amount_requested numeric default 0;
alter table public.leads add column if not exists requested_amount numeric default 0;
alter table public.leads add column if not exists owner_full_name text;
alter table public.leads add column if not exists owner_dob date;
alter table public.leads add column if not exists ssn_last_four text;
alter table public.leads add column if not exists owner_home_address text;
alter table public.leads add column if not exists owner_city text;
alter table public.leads add column if not exists owner_state text;
alter table public.leads add column if not exists owner_zip text;
alter table public.leads add column if not exists credit_score_range text;
alter table public.leads add column if not exists ownership_pct text;
alter table public.leads add column if not exists use_of_funds text;
alter table public.leads add column if not exists urgency text;
alter table public.leads add column if not exists desired_timeline text;
alter table public.leads add column if not exists existing_advances boolean default false;
alter table public.leads add column if not exists current_advances text;
alter table public.leads add column if not exists current_mca_balances numeric default 0;
alter table public.leads add column if not exists current_daily_payments numeric default 0;
alter table public.leads add column if not exists current_weekly_payments numeric default 0;
alter table public.leads add column if not exists existing_financing_records jsonb default '[]'::jsonb;
alter table public.leads add column if not exists sms_opt_in boolean default false;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists consent boolean default false;
alter table public.leads add column if not exists consent_text text;
alter table public.leads add column if not exists consent_version text;
alter table public.leads add column if not exists submitted_at timestamptz;
alter table public.leads add column if not exists signature_name text;
alter table public.leads add column if not exists signature_date date;
alter table public.leads add column if not exists user_agent text;

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (status = any (array['new','contacted','qualified','application_started','converted','lost','unresponsive','New Lead','Contacted','Application Started','Documents Needed','Under Review','Pre-Approved','Offer Sent','Funded','Declined','Lost']));

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.default_organization_id() references public.organizations(id) on delete cascade,
  legal_name text not null,
  dba text,
  ein_last_four text,
  business_address text,
  phone text,
  email text,
  website text,
  industry text,
  entity_type text,
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.companies enable row level security;

alter table public.applications add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.applications add column if not exists owner_id uuid;
alter table public.applications add column if not exists source text default 'Website';
alter table public.applications add column if not exists monthly_revenue numeric default 0;
alter table public.applications add column if not exists annual_revenue numeric default 0;
alter table public.applications add column if not exists average_daily_balance numeric default 0;
alter table public.applications add column if not exists nsfs_last_90_days integer default 0;
alter table public.applications add column if not exists current_advances text;
alter table public.applications add column if not exists duplicate_fingerprint text;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status = any (array['started','submitted','under_review','approved','declined','withdrawn','New','Submitted','In Review','Underwriting','Approved','Offer Sent','Funded','Declined','Withdrawn']));

alter table public.owners add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.owners add column if not exists full_name text;
alter table public.owners add column if not exists dob date;
alter table public.owners add column if not exists ssn_last_four text;
alter table public.owners add column if not exists home_address text;
alter table public.owners add column if not exists sms_opt_in boolean default false;

create table if not exists public.application_underwriting (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.default_organization_id() references public.organizations(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  monthly_deposits numeric default 0,
  average_daily_balance numeric default 0,
  nsfs integer default 0,
  negative_days integer default 0,
  current_mca_balances numeric default 0,
  current_daily_payments numeric default 0,
  current_weekly_payments numeric default 0,
  gross_monthly_revenue numeric default 0,
  net_monthly_deposits numeric default 0,
  number_of_deposits integer default 0,
  ending_balances text,
  factor_rate numeric,
  buy_rate numeric,
  sell_rate numeric,
  term text,
  holdback_percentage numeric,
  payback_amount numeric,
  estimated_commission numeric,
  funding_partner text,
  offer_amount numeric,
  offer_status text,
  stipulations text,
  decline_reason text,
  risk_notes text,
  underwriter_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.application_underwriting enable row level security;

alter table public.documents add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.documents add column if not exists doc_type text;
alter table public.documents add column if not exists file_path text;
alter table public.documents add column if not exists uploaded_at timestamptz default now();
alter table public.documents add column if not exists uploaded_by uuid;
alter table public.documents alter column label set default 'Application document';
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents add constraint documents_status_check check (status = any (array['uploaded','in_review','approved','rejected','needs_replacement','expired','Pending','Uploaded','Reviewed','Approved','Rejected']));

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.default_organization_id() references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  email text,
  ip_address text,
  consent_text text,
  consented_at timestamptz default now(),
  source text,
  consent_version text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.consent_records enable row level security;

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.default_organization_id() references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  direction text not null default 'outbound',
  channel text not null default 'Email',
  subject text,
  body text,
  recipient text,
  sender text,
  status text not null default 'queued',
  related_template text,
  sent_by uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.communications enable row level security;

create table if not exists public.application_sensitive_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.default_organization_id() references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  encryption_version text not null,
  encrypted_payload jsonb not null,
  ein_last_four text,
  ssn_last_four text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.application_sensitive_data enable row level security;

alter table public.contact_submissions add column if not exists company text;
alter table public.contact_submissions alter column organization_id set default public.default_organization_id();

alter table public.activity_logs add column if not exists user_id uuid;

alter table public.partner_submissions alter column organization_id set default public.default_organization_id();
alter table public.partner_submissions alter column deal_id drop not null;
alter table public.partner_submissions add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.partner_submissions add column if not exists response_status text;
alter table public.partner_submissions add column if not exists denial_reason text;
alter table public.partner_submissions add column if not exists denial_notes text;
alter table public.partner_submissions add column if not exists denied_at timestamptz;
alter table public.partner_submissions add column if not exists denied_by uuid;
alter table public.partner_submissions add column if not exists included_document_ids uuid[] default array[]::uuid[];
alter table public.partner_submissions add column if not exists package_snapshot jsonb not null default '{}'::jsonb;
alter table public.partner_submissions add column if not exists email_body text;
alter table public.partner_submissions add column if not exists email_status text not null default 'not_sent';
alter table public.partner_submissions add column if not exists email_sent_at timestamptz;
alter table public.partner_submissions add column if not exists email_provider_message_id text;
alter table public.partner_submissions add column if not exists email_error text;
alter table public.partner_submissions drop constraint if exists partner_submissions_status_check;
alter table public.partner_submissions add constraint partner_submissions_status_check check (status = any (array['draft','submitted','in_review','more_info_needed','approved','declined','withdrawn','funded','Prepared','Submitted','In Review','Approved','Offer Sent','Declined','Withdrawn','No Response']));

create or replace view public.profiles
with (security_invoker = true)
as
select
  user_id as id,
  email,
  nullif(trim(concat_ws(' ', first_name, last_name)), '') as full_name,
  case when role in ('super_admin','manager','processor') then 'admin' else role end as role,
  case when is_active then 'active' else 'inactive' end as status,
  created_at,
  updated_at
from public.user_profiles
where user_id is not null;

grant select on public.profiles to authenticated;
grant select on public.profiles to service_role;

drop policy if exists "crm read companies" on public.companies;
drop policy if exists "crm write companies" on public.companies;
create policy "crm read companies" on public.companies
  for select to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep','viewer'));
create policy "crm write companies" on public.companies
  for all to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep'))
  with check (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep'));

drop policy if exists "crm read application_underwriting" on public.application_underwriting;
drop policy if exists "crm write application_underwriting" on public.application_underwriting;
create policy "crm read application_underwriting" on public.application_underwriting
  for select to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep','viewer'));
create policy "crm write application_underwriting" on public.application_underwriting
  for all to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor'))
  with check (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor'));

drop policy if exists "crm read consent_records" on public.consent_records;
drop policy if exists "crm write consent_records" on public.consent_records;
create policy "crm read consent_records" on public.consent_records
  for select to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep','viewer'));
create policy "crm write consent_records" on public.consent_records
  for all to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor'))
  with check (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor'));

drop policy if exists "crm read communications" on public.communications;
drop policy if exists "crm write communications" on public.communications;
create policy "crm read communications" on public.communications
  for select to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep','viewer'));
create policy "crm write communications" on public.communications
  for all to authenticated
  using (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep'))
  with check (public.current_user_role() in ('super_admin','admin','manager','underwriter','processor','sales_rep'));

drop policy if exists "restricted crm read application_sensitive_data" on public.application_sensitive_data;
drop policy if exists "restricted crm write application_sensitive_data" on public.application_sensitive_data;
create policy "restricted crm read application_sensitive_data" on public.application_sensitive_data
  for select to authenticated
  using (public.current_user_role() in ('admin','super_admin','underwriter'));
create policy "restricted crm write application_sensitive_data" on public.application_sensitive_data
  for all to authenticated
  using (public.current_user_role() in ('admin','super_admin'))
  with check (public.current_user_role() in ('admin','super_admin'));

create index if not exists idx_companies_organization_id on public.companies (organization_id);
create index if not exists idx_applications_company_id on public.applications (company_id);
create index if not exists idx_owners_application_id on public.owners (application_id);
create index if not exists idx_application_underwriting_application_id on public.application_underwriting (application_id);
create index if not exists idx_application_sensitive_data_application_id on public.application_sensitive_data (application_id);
create index if not exists idx_partner_submissions_application_id on public.partner_submissions (application_id);
