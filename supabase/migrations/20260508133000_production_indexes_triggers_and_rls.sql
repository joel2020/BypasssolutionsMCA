/*
  Production CRM hardening follow-up.
  - Adds frequently used CRM indexes.
  - Ensures updated_at triggers are installed for normalized CRM tables.
  - Removes legacy broad policies that predate role-aware RLS.
*/

create index if not exists idx_profiles_role_status on public.profiles (role, status);
create index if not exists idx_leads_status_created_at on public.leads (status, created_at desc);
create index if not exists idx_leads_assigned_to_status on public.leads (assigned_to, status);
create index if not exists idx_applications_status_created_at on public.applications (status, created_at desc);
create index if not exists idx_applications_company_id on public.applications (company_id);
create index if not exists idx_application_underwriting_application_id on public.application_underwriting (application_id);
create index if not exists idx_offers_application_id_status on public.offers (application_id, status);
create index if not exists idx_partner_submissions_application_id on public.partner_submissions (application_id);
create index if not exists idx_application_status_history_application_id on public.application_status_history (application_id, created_at desc);
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','companies','owners','applications','funding_partners','partner_submissions',
    'email_templates','application_underwriting'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
      execute format('create trigger %I before update on public.%I for each row execute function public.update_updated_at()', t || '_updated_at', t);
    end if;
  end loop;
end $$;

-- Ensure role-aware policies from the production hardening migration are the only broad authenticated access path.
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;
drop policy if exists "Anyone can submit a lead" on public.leads;
