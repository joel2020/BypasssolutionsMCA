-- Storage uses independent policies; private buckets alone do not scope reps to their deals.
create or replace function public.can_access_crm_file(p_path text, p_write boolean default false)
returns boolean language sql stable security invoker set search_path = public
as $$
  select case
    when public.is_admin_role(case when p_write then array['admin','underwriter'] else array['admin','underwriter','viewer'] end) then true
    when public.current_profile_role() = 'sales_rep' then exists (
      select 1 from public.leads l
      where (case when p_write then public.can_write_lead(l.assigned_to,l.assigned_rep)
             else public.can_see_lead(l.assigned_to,l.assigned_rep) end)
        and (
          (split_part(p_path,'/',1) = 'leads' and split_part(p_path,'/',2) = l.id::text)
          or exists (select 1 from public.applications a where a.lead_id = l.id
            and split_part(p_path,'/',1) = 'applications' and split_part(p_path,'/',2) = a.id::text)
          or exists (select 1 from public.documents d where d.lead_id = l.id
            and (d.storage_path = p_path or d.file_path = p_path))
        )
    )
    else false
  end
$$;
revoke all on function public.can_access_crm_file(text,boolean) from public, anon;
grant execute on function public.can_access_crm_file(text,boolean) to authenticated;

create policy "CRM file read boundary" on storage.objects as restrictive for select to authenticated
  using (bucket_id not in ('application-documents','credit-reports','contracts') or public.can_access_crm_file(name,false));
create policy "CRM file insert boundary" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('application-documents','credit-reports','contracts') or public.can_access_crm_file(name,true));
create policy "CRM file update boundary" on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('application-documents','credit-reports','contracts') or public.can_access_crm_file(name,true))
  with check (bucket_id not in ('application-documents','credit-reports','contracts') or public.can_access_crm_file(name,true));
create policy "CRM file delete boundary" on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('application-documents','credit-reports','contracts') or public.can_access_crm_file(name,true));
-- The old schema supplied no DELETE grant. Allow owners to remove their own uploaded files.
create policy "CRM can delete owned funding files" on storage.objects for delete to authenticated
  using (bucket_id in ('application-documents','credit-reports','contracts') and public.can_access_crm_file(name,true));
