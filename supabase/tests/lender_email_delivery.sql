begin;
insert into auth.users(id,email) values ('a3cb5033-e387-44dc-93ed-a145c2c21faf','lender-test@example.invalid');
insert into public.profiles(id,email,full_name,role,status) values ('a3cb5033-e387-44dc-93ed-a145c2c21faf','lender-test@example.invalid','Review Rep','sales_rep','active') on conflict(id) do update set role='sales_rep',status='active';
insert into public.leads(id,business_name,first_name,last_name,email,phone,assigned_to,assigned_rep,source,status,consent) values ('a3cb5033-e387-44dc-93ed-a145c2c21fae','Email fixture','Test','Client','client@example.invalid','2125550100','a3cb5033-e387-44dc-93ed-a145c2c21faf','Review Rep','CRM','New Lead',true);
insert into public.applications(id,lead_id,status,source,requested_amount,monthly_revenue,assigned_to,submitted_at) values ('a3cb5033-e387-44dc-93ed-a145c2c21fad','a3cb5033-e387-44dc-93ed-a145c2c21fae','Submitted','CRM',10000,20000,'a3cb5033-e387-44dc-93ed-a145c2c21faf',now());
insert into public.funding_partners(id,name,email,status) values ('a3cb5033-e387-44dc-93ed-a145c2c21fac','Fixture Lender','lender@example.invalid','Active');
insert into public.lender_email_deliveries(id,user_id,lead_id,application_id,funding_partner_id,recipient,document_ids,subject,body)
values ('a3cb5033-e387-44dc-93ed-a145c2c21fab','a3cb5033-e387-44dc-93ed-a145c2c21faf','a3cb5033-e387-44dc-93ed-a145c2c21fae','a3cb5033-e387-44dc-93ed-a145c2c21fad','a3cb5033-e387-44dc-93ed-a145c2c21fac','lender@example.invalid',array['a3cb5033-e387-44dc-93ed-a145c2c21faa']::uuid[],'Fixture subject','Fixture message');
set local role service_role;
do $$ declare first_id uuid; again_id uuid; begin
first_id:=public.complete_lender_email_delivery('a3cb5033-e387-44dc-93ed-a145c2c21fab','fixture-gmail-id','fixture-thread','rep@example.invalid');
again_id:=public.complete_lender_email_delivery('a3cb5033-e387-44dc-93ed-a145c2c21fab','fixture-gmail-id','fixture-thread','rep@example.invalid');
if first_id is null or first_id<>again_id then raise exception 'Duplicate completion'; end if;
if (select count(*) from public.partner_submissions where email_delivery_id='a3cb5033-e387-44dc-93ed-a145c2c21fab')<>1 then raise exception 'Duplicate submission'; end if;
if not exists(select 1 from public.gmail_messages where gmail_message_id='fixture-gmail-id' and has_attachments) then raise exception 'Missing mail log'; end if;
if not exists(select 1 from public.communications where gmail_message_id='fixture-gmail-id') then raise exception 'Missing lead log'; end if;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub='a3cb5033-e387-44dc-93ed-a145c2c21faf';
do $$ begin
if has_function_privilege(current_user,'public.complete_lender_email_delivery(uuid,text,text,text)','execute') then raise exception 'Completion callable by browser'; end if;
if has_table_privilege(current_user,'public.lender_email_deliveries','insert') then raise exception 'Browser can fabricate delivery'; end if;
if (select count(*) from public.lender_email_deliveries)<>1 then raise exception 'Owner receipt read failed'; end if;
end $$;
rollback;
select 'Lender completion, duplicate retry, attachment/email/submission logs and browser permissions passed; fixtures rolled back.' as verification;
