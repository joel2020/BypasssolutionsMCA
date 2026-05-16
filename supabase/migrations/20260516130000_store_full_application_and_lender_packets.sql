/*
  Store complete public applications and lender packets.
  - Full EIN/SSN/application payload is encrypted by Edge Functions before insert.
  - CRM users see only last-four values in normal tables.
  - Lender submission emails and packet snapshots are stored with each partner submission.
*/

create table if not exists public.application_sensitive_data (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  encryption_version text not null,
  encrypted_payload jsonb not null,
  ein_last_four text check (ein_last_four is null or char_length(ein_last_four) <= 4),
  ssn_last_four text check (ssn_last_four is null or char_length(ssn_last_four) <= 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.application_sensitive_data enable row level security;

drop policy if exists "Restricted CRM read application sensitive data" on public.application_sensitive_data;
create policy "Restricted CRM read application sensitive data"
  on public.application_sensitive_data for select
  to authenticated
  using (public.is_admin_role(array['admin','underwriter']));

drop policy if exists "Restricted CRM write application sensitive data" on public.application_sensitive_data;
create policy "Restricted CRM write application sensitive data"
  on public.application_sensitive_data for all
  to authenticated
  using (public.is_admin_role(array['admin']))
  with check (public.is_admin_role(array['admin']));

create index if not exists idx_application_sensitive_data_application_id on public.application_sensitive_data (application_id);
create index if not exists idx_application_sensitive_data_lead_id on public.application_sensitive_data (lead_id);

alter table public.partner_submissions add column if not exists response_status text;
alter table public.partner_submissions add column if not exists denial_reason text;
alter table public.partner_submissions add column if not exists denial_notes text;
alter table public.partner_submissions add column if not exists denied_at timestamptz;
alter table public.partner_submissions add column if not exists denied_by uuid references auth.users(id) on delete set null;
alter table public.partner_submissions add column if not exists included_document_ids uuid[] default array[]::uuid[];
alter table public.partner_submissions add column if not exists package_snapshot jsonb not null default '{}'::jsonb;
alter table public.partner_submissions add column if not exists email_subject text;
alter table public.partner_submissions add column if not exists email_body text;
alter table public.partner_submissions add column if not exists email_status text not null default 'not_sent';
alter table public.partner_submissions add column if not exists email_sent_at timestamptz;
alter table public.partner_submissions add column if not exists email_provider_message_id text;
alter table public.partner_submissions add column if not exists email_error text;

create index if not exists idx_partner_submissions_email_status on public.partner_submissions (email_status);
