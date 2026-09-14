-- Additive client-requested workflow fields; existing underwriting stages remain intact.
alter table public.leads add column lead_status text
  check (lead_status in ('New lead','Contacted/Qualified','Low rev/Not interested','Unresponsive','Missing docs','Submitted'));

alter table public.funding_partners
  add column submission_email text,
  add column additional_cc_emails text,
  add column portal_url text check (portal_url is null or portal_url ~* '^https?://[^[:space:]]+$'),
  add column preferred_submission_method text not null default 'email' check (preferred_submission_method in ('email','portal','api','manual')),
  add column min_funding_amount numeric check (min_funding_amount >= 0),
  add column min_time_in_business_months integer check (min_time_in_business_months >= 0),
  add column min_credit_score integer check (min_credit_score between 300 and 850),
  add column max_existing_positions integer check (max_existing_positions >= 0),
  add column max_negative_days integer check (max_negative_days >= 0),
  add column max_nsf_count integer check (max_nsf_count >= 0),
  add column avg_approval_days integer check (avg_approval_days >= 0),
  add column states_served text[] not null default '{}',
  add column restricted_states text[] not null default '{}',
  add column product_types text[] not null default '{MCA,Revenue based financing}',
  add column restricted_industries text[] not null default '{}',
  add column required_documents text[] not null default '{completed_application,bank_statements,drivers_license}',
  add column criteria_notes text,
  add column bonus_notes text;

create function public.add_deal_note(p_lead_id uuid, p_text text)
returns public.notes language plpgsql security invoker set search_path=public as $$
declare author_name text; result public.notes;
begin
  if auth.uid() is null or coalesce(public.current_profile_role(),'') not in ('admin','underwriter','sales_rep') then
    raise exception 'An active CRM account with write access is required';
  end if;
  if not exists(select 1 from public.leads where id=p_lead_id and public.can_write_lead(assigned_to,assigned_rep)) then
    raise exception 'Deal not found or access denied';
  end if;
  if p_text is null or length(btrim(p_text))=0 or length(p_text)>5000 then raise exception 'Enter a note between 1 and 5000 characters'; end if;
  author_name=coalesce(nullif(public.current_profile_name(),''),'CRM user');
  insert into public.notes(lead_id,text,created_by,created_by_name)
    values(p_lead_id,btrim(p_text),auth.uid(),author_name) returning * into result;
  return result;
end $$;
revoke all on function public.add_deal_note(uuid,text) from public,anon;
grant execute on function public.add_deal_note(uuid,text) to authenticated;
create policy "Verified note author" on public.notes as restrictive for insert to authenticated
  with check(created_by=auth.uid() and created_by_name=coalesce(nullif(public.current_profile_name(),''),'CRM user'));
create policy "Own note edits" on public.notes as restrictive for update to authenticated
  using(created_by=auth.uid() or public.is_admin_role(array['admin']))
  with check((created_by=auth.uid() and created_by_name=coalesce(nullif(public.current_profile_name(),''),'CRM user')) or public.is_admin_role(array['admin']));

alter table public.lender_email_deliveries add column cc_emails text[] not null default '{}';

create or replace function public.complete_lender_email_delivery(p_delivery_id uuid,p_message_id text,p_thread_id text,p_from_email text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare delivery public.lender_email_deliveries; submission_id uuid;
begin
  if nullif(p_message_id,'') is null then raise exception 'Missing Gmail message ID'; end if;
  select * into delivery from public.lender_email_deliveries where id=p_delivery_id for update;
  if not found then raise exception 'Delivery not found'; end if;
  if delivery.state='sent' and delivery.gmail_message_id<>p_message_id then raise exception 'Delivery already recorded'; end if;
  update public.lender_email_deliveries set state='sent',gmail_message_id=p_message_id,sent_at=coalesce(sent_at,now()) where id=p_delivery_id;
  insert into public.partner_submissions(application_id,funding_partner_id,submitted_by,status,submitted_at,notes,included_document_ids,email_delivery_id)
  values(delivery.application_id,delivery.funding_partner_id,delivery.user_id,'Submitted',now(),delivery.body,delivery.document_ids,p_delivery_id)
  on conflict(email_delivery_id) do update set email_delivery_id=excluded.email_delivery_id returning id into submission_id;
  insert into public.gmail_messages(user_id,lead_id,gmail_message_id,gmail_thread_id,direction,from_email,to_emails,cc_emails,subject,snippet,body_text,sent_at,labels,has_attachments,raw_payload)
  values(delivery.user_id,delivery.lead_id,p_message_id,p_thread_id,'outbound',p_from_email,array[delivery.recipient],delivery.cc_emails,delivery.subject,left(delivery.body,180),delivery.body,now(),array['SENT'],true,jsonb_build_object('lender_delivery_id',p_delivery_id,'document_ids',delivery.document_ids,'cc_emails',delivery.cc_emails))
  on conflict(user_id,gmail_message_id) do nothing;
  insert into public.communications(lead_id,direction,channel,subject,body,recipient,sender,status,created_by,gmail_message_id,gmail_thread_id,provider,provider_payload)
  values(delivery.lead_id,'outbound','Email',delivery.subject,delivery.body,delivery.recipient,p_from_email,'sent',delivery.user_id,p_message_id,p_thread_id,'gmail',jsonb_build_object('lender_delivery_id',p_delivery_id,'document_ids',delivery.document_ids,'cc_emails',delivery.cc_emails))
  on conflict(created_by,gmail_message_id) do nothing;
  return submission_id;
end $$;
revoke all on function public.complete_lender_email_delivery(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_lender_email_delivery(uuid,text,text,text) to service_role;
