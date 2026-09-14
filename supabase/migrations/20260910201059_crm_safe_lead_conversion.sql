-- Restrictive policies prevent surviving permissive legacy policies from widening access.
create policy "CRM lead read boundary" on public.leads as restrictive for select to authenticated
  using (public.can_see_lead(assigned_to, assigned_rep));
create policy "CRM lead insert boundary" on public.leads as restrictive for insert to authenticated
  with check (public.can_write_lead(assigned_to, assigned_rep));
create policy "CRM lead update boundary" on public.leads as restrictive for update to authenticated
  using (public.can_write_lead(assigned_to, assigned_rep))
  with check (public.can_write_lead(assigned_to, assigned_rep));
create policy "CRM lead delete boundary" on public.leads as restrictive for delete to authenticated
  using (public.is_admin_role(array['admin']));

-- One transaction: validate and save details, create/reuse the application, then move the lead.
-- Row locking serializes retries. Security invoker preserves the caller's RLS permissions.
create or replace function public.convert_lead_to_submission(p_lead_id uuid, p_details jsonb default '{}'::jsonb)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_details public.leads%rowtype;
  v_application_id uuid;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found or not coalesce(public.can_write_lead(v_lead.assigned_to, v_lead.assigned_rep), false) then
    raise exception 'Lead not found or access denied';
  end if;

  select id into v_application_id from public.applications where lead_id = p_lead_id order by created_at desc limit 1;
  if v_lead.status not in ('New Lead', 'Contacted', 'Application Started') then
    if v_application_id is not null then return v_application_id; end if;
    raise exception 'This lead is already past the submission stage. Refresh the lead before continuing.';
  end if;

  if (select count(*) from public.documents where lead_id = p_lead_id and doc_type = 'Bank Statement'
      and status in ('Uploaded', 'Under Review', 'Reviewed', 'Approved') and nullif(storage_path, '') is not null) < 4 then
    raise exception 'Upload 4 bank statements before converting this lead.';
  end if;

  v_details := jsonb_populate_record(v_lead, p_details);
  if nullif(trim(v_details.business_name), '') is null then raise exception 'Business name is required'; end if;
  if coalesce(v_details.funding_amount_requested, 0) < 0 or coalesce(v_details.monthly_revenue, 0) < 0 then
    raise exception 'Funding and revenue amounts cannot be negative';
  end if;
  -- Keep both legacy and normalized amounts consistent.
  v_details.requested_amount := v_details.funding_amount_requested;
  v_details.gross_monthly_revenue := v_details.monthly_revenue;
  v_details.legal_name := v_details.business_name;
  update public.leads set
      business_name = v_details.business_name,
      dba = v_details.dba,
      entity_type = v_details.entity_type,
      industry = v_details.industry,
      start_date = v_details.start_date,
      time_in_business = v_details.time_in_business,
      business_address = v_details.business_address,
      city = v_details.city,
      state = v_details.state,
      zip = v_details.zip,
      business_phone = v_details.business_phone,
      business_email = v_details.business_email,
      website = v_details.website,
      owner_full_name = v_details.owner_full_name,
      first_name = v_details.first_name,
      last_name = v_details.last_name,
      owner_title = v_details.owner_title,
      ownership_pct = v_details.ownership_pct,
      owner_dob = v_details.owner_dob,
      phone = v_details.phone,
      email = v_details.email,
      owner_home_address = v_details.owner_home_address,
      credit_score_range = v_details.credit_score_range,
      funding_amount_requested = v_details.funding_amount_requested,
      use_of_funds = v_details.use_of_funds,
      monthly_revenue = v_details.monthly_revenue,
      annual_revenue = v_details.annual_revenue,
      avg_daily_balance = v_details.avg_daily_balance,
      nsfs_last_90_days = v_details.nsfs_last_90_days,
      current_bank = v_details.current_bank,
      current_advances = v_details.current_advances,
      urgency = v_details.urgency,
      source = v_details.source,
      assigned_rep = v_details.assigned_rep,
      assigned_to = v_details.assigned_to,
      notes = v_details.notes,
      legal_name = v_details.legal_name,
      requested_amount = v_details.requested_amount,
      gross_monthly_revenue = v_details.gross_monthly_revenue
    where id = p_lead_id;
  if not found then raise exception 'Unable to save this lead'; end if;

  if v_application_id is null then
    insert into public.applications (lead_id,status,source,requested_amount,monthly_revenue,assigned_to,submitted_at)
      values (p_lead_id,'Submitted',coalesce(nullif(v_details.source,''),'CRM'),coalesce(v_details.funding_amount_requested,0),
        coalesce(v_details.monthly_revenue,0),v_details.assigned_to,v_now)
      returning id into v_application_id;
  else
    update public.applications set status='Submitted', source=coalesce(nullif(v_details.source,''),'CRM'),
      requested_amount=coalesce(v_details.funding_amount_requested,0), monthly_revenue=coalesce(v_details.monthly_revenue,0),
      assigned_to=v_details.assigned_to, submitted_at=v_now where id=v_application_id;
    if not found then raise exception 'Unable to update this application'; end if;
  end if;

  update public.leads set status='Under Review', submitted_at=v_now where id=p_lead_id;
  if not found then raise exception 'Unable to move this lead to submissions'; end if;
  return v_application_id;
end;
$$;
revoke all on function public.convert_lead_to_submission(uuid,jsonb) from public, anon;
grant execute on function public.convert_lead_to_submission(uuid,jsonb) to authenticated;
