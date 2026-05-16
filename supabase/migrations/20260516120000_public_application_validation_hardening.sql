/*
  Public application validation hardening
  - Adds structured fields used by the production public intake.
  - Tightens public lead/contact inserts at the database layer.
  - Allows public consent audit inserts without exposing consent records for read.
  - Full SSN/EIN encryption is intentionally not added here because no key-management strategy exists yet.
*/

alter table public.leads add column if not exists business_city text;
alter table public.leads add column if not exists business_state text;
alter table public.leads add column if not exists business_zip text;
alter table public.leads add column if not exists merchant_type text;
alter table public.leads add column if not exists products_services_sold text;
alter table public.leads add column if not exists bank_account_type text;
alter table public.leads add column if not exists owner_city text;
alter table public.leads add column if not exists owner_state text;
alter table public.leads add column if not exists owner_zip text;
alter table public.leads add column if not exists average_monthly_sales numeric default 0;
alter table public.leads add column if not exists desired_timeline text;
alter table public.leads add column if not exists existing_financing_records jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists consent_version text;
alter table public.leads add column if not exists signature_name text;
alter table public.leads add column if not exists signature_date date;
alter table public.leads add column if not exists user_agent text;

alter table public.consent_records add column if not exists consent_version text;
alter table public.consent_records add column if not exists user_agent text;
alter table public.consent_records add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.leads drop constraint if exists leads_public_application_required_fields;
alter table public.leads add constraint leads_public_application_required_fields check (
  source <> 'Website'
  or (
    consent is true
    and char_length(coalesce(business_name,'')) > 0
    and char_length(coalesce(legal_name,'')) > 0
    and char_length(coalesce(entity_type,'')) > 0
    and char_length(coalesce(ein_last_four,'')) = 4
    and char_length(coalesce(merchant_type,'')) > 0
    and start_date is not null
    and char_length(coalesce(business_address,'')) > 0
    and char_length(coalesce(business_city,'')) > 0
    and char_length(coalesce(business_state,'')) > 0
    and char_length(coalesce(business_zip,'')) > 0
    and char_length(coalesce(business_phone,'')) > 0
    and char_length(coalesce(business_email,'')) > 0
    and business_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(coalesce(products_services_sold,'')) > 0
    and char_length(coalesce(industry,'')) > 0
    and char_length(coalesce(current_bank,'')) > 0
    and char_length(coalesce(first_name,'')) > 0
    and char_length(coalesce(last_name,'')) > 0
    and char_length(coalesce(email,'')) > 0
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(coalesce(phone,'')) > 0
    and owner_dob is not null
    and char_length(coalesce(ssn_last_four,'')) = 4
    and char_length(coalesce(owner_home_address,'')) > 0
    and char_length(coalesce(owner_city,'')) > 0
    and char_length(coalesce(owner_state,'')) > 0
    and char_length(coalesce(owner_zip,'')) > 0
    and requested_amount > 0
    and average_monthly_sales > 0
    and gross_monthly_revenue > 0
    and char_length(coalesce(use_of_funds,'')) > 0
    and char_length(coalesce(desired_timeline,'')) > 0
    and char_length(coalesce(signature_name,'')) > 0
    and signature_date is not null
    and char_length(coalesce(consent_version,'')) > 0
    and (
      existing_advances is false
      or jsonb_array_length(existing_financing_records) > 0
    )
  )
) not valid;

alter table public.contact_submissions drop constraint if exists contact_submissions_required_fields;
alter table public.contact_submissions add constraint contact_submissions_required_fields check (
  char_length(coalesce(name,'')) > 0
  and char_length(coalesce(email,'')) > 0
  and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(coalesce(message,'')) > 0
) not valid;

drop policy if exists "Public can submit safe website leads" on public.leads;
create policy "Public can submit complete website applications"
  on public.leads for insert
  to anon, authenticated
  with check (
    source = 'Website'
    and consent is true
    and char_length(coalesce(business_name,'')) > 0
    and char_length(coalesce(legal_name,'')) > 0
    and char_length(coalesce(entity_type,'')) > 0
    and char_length(coalesce(ein_last_four,'')) = 4
    and char_length(coalesce(merchant_type,'')) > 0
    and start_date is not null
    and char_length(coalesce(business_address,'')) > 0
    and char_length(coalesce(business_city,'')) > 0
    and char_length(coalesce(business_state,'')) > 0
    and char_length(coalesce(business_zip,'')) > 0
    and char_length(coalesce(business_phone,'')) > 0
    and char_length(coalesce(business_email,'')) > 0
    and char_length(coalesce(products_services_sold,'')) > 0
    and char_length(coalesce(industry,'')) > 0
    and char_length(coalesce(current_bank,'')) > 0
    and char_length(coalesce(first_name,'')) > 0
    and char_length(coalesce(last_name,'')) > 0
    and char_length(coalesce(email,'')) > 0
    and char_length(coalesce(phone,'')) > 0
    and owner_dob is not null
    and char_length(coalesce(ssn_last_four,'')) = 4
    and requested_amount > 0
    and average_monthly_sales > 0
    and gross_monthly_revenue > 0
    and char_length(coalesce(use_of_funds,'')) > 0
    and char_length(coalesce(desired_timeline,'')) > 0
    and char_length(coalesce(signature_name,'')) > 0
    and signature_date is not null
  );

drop policy if exists "Public can create website consent records" on public.consent_records;
create policy "Public can create website consent records"
  on public.consent_records for insert
  to anon, authenticated
  with check (
    source in ('website_application','website')
    and lead_id is not null
    and char_length(coalesce(email,'')) > 0
    and char_length(coalesce(consent_text,'')) > 0
    and char_length(coalesce(consent_version,'')) > 0
  );
