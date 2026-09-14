-- Some hosted projects have this column without a matching historical migration.
alter table public.partner_submissions add column if not exists included_document_ids uuid[];
create table public.lender_email_deliveries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  funding_partner_id uuid not null references public.funding_partners(id),
  recipient text not null,
  document_ids uuid[] not null,
  subject text not null,
  body text not null,
  state text not null default 'sending' check (state in ('sending','sent','unknown')),
  gmail_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.lender_email_deliveries enable row level security;
revoke all on public.lender_email_deliveries from public,anon,authenticated;
grant select on public.lender_email_deliveries to authenticated;
grant all on public.lender_email_deliveries to service_role;
create policy "Read own lender email deliveries" on public.lender_email_deliveries for select to authenticated
using (user_id=auth.uid() and public.current_profile_role() in ('admin','underwriter','sales_rep'));
alter table public.partner_submissions add column email_delivery_id uuid unique references public.lender_email_deliveries(id) on delete set null;

-- Called only after Gmail accepts a message. Logging succeeds or rolls back together.
create function public.complete_lender_email_delivery(p_delivery_id uuid,p_message_id text,p_thread_id text,p_from_email text)
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
  insert into public.gmail_messages(user_id,lead_id,gmail_message_id,gmail_thread_id,direction,from_email,to_emails,subject,snippet,body_text,sent_at,labels,has_attachments,raw_payload)
  values(delivery.user_id,delivery.lead_id,p_message_id,p_thread_id,'outbound',p_from_email,array[delivery.recipient],delivery.subject,left(delivery.body,180),delivery.body,now(),array['SENT'],true,jsonb_build_object('lender_delivery_id',p_delivery_id,'document_ids',delivery.document_ids))
  on conflict(user_id,gmail_message_id) do nothing;
  insert into public.communications(lead_id,direction,channel,subject,body,recipient,sender,status,created_by,gmail_message_id,gmail_thread_id,provider,provider_payload)
  values(delivery.lead_id,'outbound','Email',delivery.subject,delivery.body,delivery.recipient,p_from_email,'sent',delivery.user_id,p_message_id,p_thread_id,'gmail',jsonb_build_object('lender_delivery_id',p_delivery_id,'document_ids',delivery.document_ids))
  on conflict(created_by,gmail_message_id) do nothing;
  return submission_id;
end $$;
revoke all on function public.complete_lender_email_delivery(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_lender_email_delivery(uuid,text,text,text) to service_role;
