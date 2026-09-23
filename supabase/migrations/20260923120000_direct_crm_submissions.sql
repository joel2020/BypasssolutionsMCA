-- Allow a minimal internal draft while preserving the existing full-lead rule.
-- Public website submissions and all read/update policies remain unchanged.
drop policy if exists "lead_insert_internal" on public.leads;
create policy "lead_insert_internal" on public.leads for insert to authenticated
with check (
  public.is_admin_role(array['admin','underwriter','sales_rep'])
  and char_length(btrim(coalesce(business_name, ''))) > 0
  and (
    (char_length(coalesce(first_name, '')) > 0
      and char_length(coalesce(last_name, '')) > 0
      and char_length(coalesce(email, '')) > 0
      and coalesce(source, '') <> 'Website')
    or (status = 'Documents Needed' and source = 'CRM'
      and assigned_to = auth.uid() and created_by = auth.uid()
      and consent is false and submitted_at is null)
  )
);

-- A stable request ID makes retries safe after a lost response. Both records
-- commit together. SECURITY INVOKER deliberately retains all existing RLS.
create or replace function public.create_crm_submission(
  p_request_id uuid,
  p_business_name text,
  p_requested_amount numeric default 0,
  p_notes text default '',
  p_first_name text default '',
  p_last_name text default '',
  p_email text default '',
  p_phone text default ''
) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_application_id uuid;
begin
  if auth.uid() is null or not public.is_admin_role(array['admin','underwriter','sales_rep']) then
    raise exception 'You do not have permission to create submissions.';
  end if;
  if p_request_id is null or nullif(btrim(p_business_name), '') is null then
    raise exception 'Business name is required.';
  end if;
  if p_requested_amount is null or p_requested_amount < 0 or p_requested_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Requested amount must be zero or greater.';
  end if;

  insert into public.leads (
    id, business_name, first_name, last_name, email, phone,
    funding_amount_requested, requested_amount, notes, status, source,
    assigned_to, assigned_rep, created_by, consent, submitted_at
  ) values (
    p_request_id, btrim(p_business_name), btrim(coalesce(p_first_name, '')),
    btrim(coalesce(p_last_name, '')), lower(btrim(coalesce(p_email, ''))),
    btrim(coalesce(p_phone, '')), p_requested_amount, p_requested_amount,
    btrim(coalesce(p_notes, '')), 'Documents Needed', 'CRM', auth.uid(),
    coalesce(nullif(public.current_profile_name(), ''),
      (select nullif(email, '') from public.profiles where id = auth.uid()), 'Unassigned'), auth.uid(), false, null
  ) on conflict (id) do nothing;

  select * into v_lead from public.leads where id = p_request_id for update;
  if not found or v_lead.created_by is distinct from auth.uid() then
    raise exception 'Unable to access this submission.';
  end if;

  insert into public.applications (id, lead_id, status, source, requested_amount, assigned_to)
  values (p_request_id, p_request_id, 'New', 'CRM', p_requested_amount, auth.uid())
  on conflict (id) do nothing;
  select id into v_application_id from public.applications
  where id = p_request_id and lead_id = p_request_id;
  if not found then raise exception 'Unable to create the application.'; end if;
  return jsonb_build_object('lead_id', p_request_id, 'application_id', v_application_id);
end;
$$;

-- Convert once, even on repeated clicks or retries. A failed application insert
-- rolls back the stage change; a draft is not a lender submission.
create or replace function public.convert_lead_to_submission(p_lead_id uuid)
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_application_id uuid;
begin
  if auth.uid() is null or not public.is_admin_role(array['admin','underwriter','sales_rep']) then
    raise exception 'You do not have permission to create submissions.';
  end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or not public.can_write_lead(v_lead.assigned_to, v_lead.assigned_rep) then
    raise exception 'Unable to access this lead.';
  end if;
  if nullif(btrim(v_lead.business_name), '') is null then
    raise exception 'Business name is required.';
  end if;
  select id into v_application_id from public.applications
  where lead_id = p_lead_id order by created_at limit 1;
  if found then return v_application_id; end if;

  insert into public.applications (lead_id, status, source, requested_amount, monthly_revenue, assigned_to)
  values (p_lead_id, 'New', coalesce(v_lead.source, 'CRM'),
    coalesce(v_lead.funding_amount_requested, 0), coalesce(v_lead.monthly_revenue, 0), v_lead.assigned_to)
  returning id into v_application_id;
  update public.leads set status = 'Documents Needed', submitted_at = null where id = p_lead_id;
  if not found then raise exception 'Unable to update this lead.'; end if;
  update public.documents set application_id = v_application_id
  where lead_id = p_lead_id and application_id is null;
  return v_application_id;
end;
$$;

revoke all on function public.create_crm_submission(uuid,text,numeric,text,text,text,text,text) from public, anon;
grant execute on function public.create_crm_submission(uuid,text,numeric,text,text,text,text,text) to authenticated;
revoke all on function public.convert_lead_to_submission(uuid) from public, anon;
grant execute on function public.convert_lead_to_submission(uuid) to authenticated;
