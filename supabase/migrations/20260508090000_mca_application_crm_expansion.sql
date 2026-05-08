/*
  Bypass Solution — MCA application and CRM expansion
  - Adds normalized MCA production tables requested for CRM, underwriting, communications, offers, partner submissions, commissions, status history, and duplicate detection.
  - Extends legacy leads/documents tables so the SPA application can create CRM records while preserving existing admin pages.
  - Enables private public-intake uploads: anonymous users may upload to the private application-documents bucket, but may not read files. CRM roles retain read/write access.
  - Stores only masked SSN/EIN/bank data from the public application flow.
*/

create extension if not exists pgcrypto;

-- Lead/application fields retained for existing UI compatibility.
alter table public.leads add column if not exists legal_name text;
alter table public.leads add column if not exists business_address text;
alter table public.leads add column if not exists business_phone text;
alter table public.leads add column if not exists business_email text;
alter table public.leads add column if not exists ein_last_four text check (ein_last_four is null or char_length(ein_last_four) <= 4);
alter table public.leads add column if not exists start_date date;
alter table public.leads add column if not exists entity_type text;
alter table public.leads add column if not exists annual_revenue numeric default 0;
alter table public.leads add column if not exists requested_amount numeric default 0;
alter table public.leads add column if not exists current_advances text;
alter table public.leads add column if not exists current_bank text;
alter table public.leads add column if not exists nsfs_last_90_days integer default 0;
alter table public.leads add column if not exists negative_days integer default 0;
alter table public.leads add column if not exists current_mca_balances numeric default 0;
alter table public.leads add column if not exists current_daily_payments numeric default 0;
alter table public.leads add column if not exists current_weekly_payments numeric default 0;
alter table public.leads add column if not exists gross_monthly_revenue numeric default 0;
alter table public.leads add column if not exists net_monthly_deposits numeric default 0;
alter table public.leads add column if not exists number_of_deposits integer default 0;
alter table public.leads add column if not exists ending_balances text;
alter table public.leads add column if not exists owner_full_name text;
alter table public.leads add column if not exists owner_title text;
alter table public.leads add column if not exists owner_dob date;
alter table public.leads add column if not exists ssn_last_four text check (ssn_last_four is null or char_length(ssn_last_four) <= 4);
alter table public.leads add column if not exists owner_home_address text;
alter table public.leads add column if not exists accepts_credit_cards boolean default false;
alter table public.leads add column if not exists payment_processor text;
alter table public.leads add column if not exists monthly_card_volume numeric default 0;
alter table public.leads add column if not exists deposits_per_month integer default 0;
alter table public.leads add column if not exists routing_last_four text check (routing_last_four is null or char_length(routing_last_four) <= 4);
alter table public.leads add column if not exists account_last_four text check (account_last_four is null or char_length(account_last_four) <= 4);
alter table public.leads add column if not exists sms_opt_in boolean default false;
alter table public.leads add column if not exists consent_text text;
alter table public.leads add column if not exists submitted_at timestamptz;
alter table public.leads add column if not exists decline_reason text;
alter table public.leads add column if not exists risk_notes text;
alter table public.leads add column if not exists underwriter_notes text;

alter table public.documents add column if not exists document_type text;
alter table public.documents add column if not exists file_path text;
alter table public.documents add column if not exists file_size bigint;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists uploaded_at timestamptz default now();

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba text,
  ein_last_four text check (ein_last_four is null or char_length(ein_last_four) <= 4),
  business_address text,
  phone text,
  email text,
  website text,
  industry text,
  entity_type text,
  start_date date,
  duplicate_key text generated always as (lower(regexp_replace(coalesce(email,'') || '|' || coalesce(phone,'') || '|' || coalesce(ein_last_four,'') || '|' || coalesce(legal_name,''), '[^a-z0-9|]', '', 'g'))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  application_id uuid,
  full_name text not null,
  title text,
  ownership_percentage numeric,
  dob date,
  ssn_last_four text check (ssn_last_four is null or char_length(ssn_last_four) <= 4),
  phone text,
  email text,
  home_address text,
  sms_opt_in boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  company_id uuid references public.companies(id) on delete restrict,
  owner_id uuid,
  status text not null default 'New' check (status in ('New','Submitted','In Review','Underwriting','Approved','Offer Sent','Funded','Declined','Withdrawn')),
  source text not null default 'Website',
  requested_amount numeric default 0,
  use_of_funds text,
  monthly_revenue numeric default 0,
  annual_revenue numeric default 0,
  average_daily_balance numeric default 0,
  nsfs_last_90_days integer default 0,
  current_advances text,
  assigned_to uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  duplicate_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owners drop constraint if exists owners_application_id_fkey;
alter table public.owners add constraint owners_application_id_fkey foreign key (application_id) references public.applications(id) on delete cascade;
alter table public.applications drop constraint if exists applications_owner_id_fkey;
alter table public.applications add constraint applications_owner_id_fkey foreign key (owner_id) references public.owners(id) on delete set null;

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.pipeline_stages (name, sort_order, is_terminal) values
  ('New', 10, false),
  ('Submitted', 20, false),
  ('In Review', 30, false),
  ('Underwriting', 40, false),
  ('Approved', 50, false),
  ('Offer Sent', 60, false),
  ('Funded', 70, true),
  ('Declined', 80, true),
  ('Withdrawn', 90, true)
on conflict (name) do update set sort_order = excluded.sort_order, is_terminal = excluded.is_terminal;

create table if not exists public.funding_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  min_revenue numeric default 0,
  max_funding numeric default 0,
  industries_accepted text[] default array[]::text[],
  status text default 'Active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offers add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.offers add column if not exists funding_partner_id uuid references public.funding_partners(id) on delete set null;
alter table public.offers add column if not exists offer_amount numeric;
alter table public.offers add column if not exists buy_rate numeric;
alter table public.offers add column if not exists sell_rate numeric;
alter table public.offers add column if not exists holdback_percentage numeric;
alter table public.offers add column if not exists payment_frequency text;
alter table public.offers add column if not exists payment_amount numeric;
alter table public.offers add column if not exists commission_amount numeric;
alter table public.offers add column if not exists stipulations text;

create table if not exists public.partner_submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  funding_partner_id uuid references public.funding_partners(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  status text not null default 'Prepared',
  submitted_at timestamptz,
  response_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  direction text not null default 'outbound' check (direction in ('inbound','outbound','internal')),
  channel text not null check (channel in ('Email','SMS','Call','Note','System event')),
  subject text,
  body text,
  recipient text,
  sender text,
  status text not null default 'queued',
  related_template text,
  sent_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.email_templates (slug, name, subject, body) values
  ('applicant_confirmation', 'Applicant confirmation', 'Bypass Solution received your funding application', 'Thank you for applying. Our team will review your information and contact you regarding next steps.'),
  ('internal_admin_alert', 'Internal admin alert', 'New funding application submitted', 'A new funding application has been submitted and is ready for CRM review.'),
  ('document_request', 'Document request', 'Documents needed for your Bypass Solution application', 'Please upload the requested documents so our team can continue review.'),
  ('follow_up', 'Follow-up', 'Following up on your working capital application', 'We are following up on your application and are available to answer questions.'),
  ('offer_sent', 'Offer sent', 'Your funding options are ready to review', 'Your funding specialist has sent available options for your review.'),
  ('status_update', 'Status update', 'Update on your Bypass Solution application', 'There is an update on your funding application.'),
  ('decline', 'Decline notice', 'Update on your funding application', 'After review, we are unable to present funding options at this time.'),
  ('funded_confirmation', 'Funded confirmation', 'Your business funding has been completed', 'Congratulations. Your funding has been completed according to your signed agreement.')
on conflict (slug) do update set subject = excluded.subject, body = excluded.body;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.application_underwriting (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists public.duplicate_detections (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  match_type text not null check (match_type in ('email','phone','ein','business_name')),
  match_value text not null,
  matched_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.commissions add column if not exists application_id uuid references public.applications(id) on delete set null;
alter table public.tasks add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.tasks add column if not exists description text;
alter table public.notes add column if not exists application_id uuid references public.applications(id) on delete cascade;
alter table public.documents add column if not exists application_id uuid references public.applications(id) on delete cascade;

create index if not exists idx_leads_duplicate_email on public.leads (lower(email));
create index if not exists idx_leads_duplicate_phone on public.leads (phone);
create index if not exists idx_leads_ein_last_four on public.leads (ein_last_four);
create index if not exists idx_leads_business_name on public.leads (lower(business_name));
create index if not exists idx_applications_status on public.applications (status);
create index if not exists idx_applications_assigned_to on public.applications (assigned_to);
create index if not exists idx_communications_application_id on public.communications (application_id);
create index if not exists idx_activity_logs_application_id on public.activity_logs (application_id);
create index if not exists idx_tasks_due_date_status on public.tasks (due_date, status);
create index if not exists idx_documents_application_id on public.documents (application_id);

alter table public.companies enable row level security;
alter table public.owners enable row level security;
alter table public.applications enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.funding_partners enable row level security;
alter table public.partner_submissions enable row level security;
alter table public.communications enable row level security;
alter table public.email_templates enable row level security;
alter table public.activity_logs enable row level security;
alter table public.application_status_history enable row level security;
alter table public.application_underwriting enable row level security;
alter table public.duplicate_detections enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['companies','owners','applications','pipeline_stages','funding_partners','partner_submissions','communications','email_templates','activity_logs','application_status_history','application_underwriting','duplicate_detections'] loop
    execute format('drop policy if exists "CRM read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "CRM write %1$s" on public.%1$I', t);
    execute format('create policy "CRM read %1$s" on public.%1$I for select to authenticated using (public.is_admin_role(array[''admin'',''underwriter'',''viewer'',''sales_rep'']))', t);
    execute format('create policy "CRM write %1$s" on public.%1$I for all to authenticated using (public.is_admin_role(array[''admin'',''underwriter'',''sales_rep''])) with check (public.is_admin_role(array[''admin'',''underwriter'',''sales_rep'']))', t);
  end loop;
end $$;

-- Public application insert is limited to safe, consented website submissions.
drop policy if exists "Public can submit safe website leads" on public.leads;
create policy "Public can submit safe website leads"
  on public.leads for insert
  to anon, authenticated
  with check (
    source = 'Website'
    and consent is true
    and ssn_last_four is not null
    and char_length(ssn_last_four) <= 4
    and char_length(coalesce(routing_last_four,'')) <= 4
    and char_length(coalesce(account_last_four,'')) <= 4
    and char_length(business_name) > 0
    and char_length(first_name) > 0
    and char_length(last_name) > 0
    and char_length(email) > 0
  );

-- Allow the anonymous applicant to create document metadata and queued communication/activity rows only for website intake.
drop policy if exists "Public can create pending document metadata" on public.documents;
create policy "Public can create pending document metadata"
  on public.documents for insert
  to anon, authenticated
  with check (status = 'Pending' and storage_path is not null and char_length(storage_path) > 0);

drop policy if exists "Public can queue intake communications" on public.communications;
create policy "Public can queue intake communications"
  on public.communications for insert
  to anon, authenticated
  with check (status in ('queued','logged') and channel in ('Email','System event'));

drop policy if exists "Public can log website intake activity" on public.activity_logs;
create policy "Public can log website intake activity"
  on public.activity_logs for insert
  to anon, authenticated
  with check (action = 'application_submitted');

-- Private bucket: public writes only, never public reads. CRM read/write policies from previous migration still apply.
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Public can upload private application documents" on storage.objects;
create policy "Public can upload private application documents"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'application-documents'
    and array_length(string_to_array(name, '/'), 1) >= 3
    and lower((storage.extension(name))) in ('pdf','jpg','jpeg','png')
  );
