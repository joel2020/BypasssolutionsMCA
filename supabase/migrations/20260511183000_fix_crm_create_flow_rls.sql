/*
  Production CRM create-flow RLS follow-up.

  - Keeps public website lead inserts narrow.
  - Lets active internal CRM users create lead/applicant records from the CRM.
  - Lets admin, underwriter, and sales_rep create/update funding partners.
  - Keeps viewer read-only.
  - Does not disable RLS or touch production data.
*/

drop policy if exists "CRM users can create leads" on public.leads;
drop policy if exists "lead_insert_internal" on public.leads;

create policy "lead_insert_internal"
  on public.leads for insert
  to authenticated
  with check (
    public.is_admin_role(array['admin','underwriter','sales_rep'])
    and char_length(coalesce(business_name, '')) > 0
    and char_length(coalesce(first_name, '')) > 0
    and char_length(coalesce(last_name, '')) > 0
    and char_length(coalesce(email, '')) > 0
    and coalesce(source, '') <> 'Website'
  );

drop policy if exists "crm_write_funding_partners" on public.funding_partners;
drop policy if exists "CRM write funding_partners" on public.funding_partners;

create policy "crm_write_funding_partners"
  on public.funding_partners for all
  to authenticated
  using (public.is_admin_role(array['admin','underwriter','sales_rep']))
  with check (
    public.is_admin_role(array['admin','underwriter','sales_rep'])
    and char_length(coalesce(name, '')) > 0
  );

drop policy if exists "crm_write_applications" on public.applications;
drop policy if exists "CRM write applications" on public.applications;

create policy "crm_write_applications"
  on public.applications for all
  to authenticated
  using (public.is_admin_role(array['admin','underwriter','sales_rep']))
  with check (
    public.is_admin_role(array['admin','underwriter','sales_rep'])
    and coalesce(requested_amount, 0) >= 0
  );
