/*
  Allow authorized CRM users to create lead/applicant records from inside the CRM.
  Existing public website lead policies only allow source = 'Website', which blocks
  manual CRM-created applicants such as source = 'CRM'.
*/

create policy if not exists "CRM users can create leads"
  on public.leads for insert
  to authenticated
  with check (
    public.is_admin_role(array['admin','underwriter','sales_rep'])
    and char_length(coalesce(business_name, '')) > 0
    and char_length(coalesce(first_name, '')) > 0
    and char_length(coalesce(last_name, '')) > 0
    and char_length(coalesce(email, '')) > 0
  );
