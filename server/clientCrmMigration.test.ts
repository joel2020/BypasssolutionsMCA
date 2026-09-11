import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it} from 'vitest';
const db=new PGlite();const rep='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002',lead='10000000-0000-0000-0000-000000000001';
beforeAll(async()=>{
 await db.exec(`create role authenticated;create role anon;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table profiles(id uuid,full_name text,role text,status text);
 insert into profiles values('${rep}','Assigned rep','sales_rep','active'),('${other}','Other rep','sales_rep','active');
 create function current_profile_role() returns text language sql stable security definer as $$select role from profiles where id=auth.uid() and status='active'$$;
 create function current_profile_name() returns text language sql stable security definer as $$select full_name from profiles where id=auth.uid() and status='active'$$;
 create function is_admin_role(roles text[]) returns boolean language sql stable as $$select coalesce(current_profile_role()=any(roles),false)$$;
 create function can_write_lead(owner uuid,rep_name text) returns boolean language sql stable as $$select auth.uid()=owner and current_profile_role()='sales_rep'$$;
 create table leads(id uuid primary key,assigned_to uuid,assigned_rep text,status text);insert into leads values('${lead}','${rep}','Assigned rep','New Lead');
 create table funding_partners(id uuid primary key default gen_random_uuid(),name text,max_funding numeric);
 create table notes(id uuid primary key default gen_random_uuid(),lead_id uuid,text text,created_by uuid,created_by_name text,created_at timestamptz default now());
 alter table notes enable row level security;create policy scoped_notes on notes for all to authenticated using(exists(select 1 from leads where leads.id=notes.lead_id and can_write_lead(assigned_to,assigned_rep))) with check(exists(select 1 from leads where leads.id=notes.lead_id and can_write_lead(assigned_to,assigned_rep)));
 create table lender_email_deliveries(id uuid primary key,user_id uuid,lead_id uuid,application_id uuid,funding_partner_id uuid,recipient text,document_ids uuid[],subject text,body text,state text,gmail_message_id text,sent_at timestamptz);
 create table partner_submissions(id uuid primary key default gen_random_uuid(),application_id uuid,funding_partner_id uuid,submitted_by uuid,status text,submitted_at timestamptz,notes text,included_document_ids uuid[],email_delivery_id uuid unique);
 create table gmail_messages(user_id uuid,lead_id uuid,gmail_message_id text,gmail_thread_id text,direction text,from_email text,to_emails text[],cc_emails text[],subject text,snippet text,body_text text,sent_at timestamptz,labels text[],has_attachments boolean,raw_payload jsonb,unique(user_id,gmail_message_id));
 create table communications(lead_id uuid,direction text,channel text,subject text,body text,recipient text,sender text,status text,created_by uuid,gmail_message_id text,gmail_thread_id text,provider text,provider_payload jsonb,unique(created_by,gmail_message_id));
 grant usage on schema public,auth to authenticated;grant all on all tables in schema public to authenticated;`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20260911022441_client_crm_updates.sql',import.meta.url),'utf8'));
},20000);
afterAll(()=>db.close());
const run=(sql:string,params:unknown[]=[],user=rep)=>db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await tx.exec('set local role authenticated');return tx.query(sql,params);});
it('accepts the six dispositions while leaving the underwriting stage unchanged',async()=>{
 for(const status of ['New lead','Contacted/Qualified','Low rev/Not interested','Unresponsive','Missing docs','Submitted'])await run('update leads set lead_status=$1 where id=$2',[status,lead]);
 expect((await db.query('select status,lead_status from leads')).rows).toEqual([{status:'New Lead',lead_status:'Submitted'}]);
 await expect(run("update leads set lead_status='Funded'")).rejects.toThrow();
});
it('persists a trimmed note with the authenticated author and timestamp',async()=>{
 const {rows}=await run('select * from add_deal_note($1,$2)',[lead,'  Reviewed synthetic file  ']);
 expect(rows[0]).toMatchObject({lead_id:lead,text:'Reviewed synthetic file',created_by:rep,created_by_name:'Assigned rep'});expect(rows[0]).toHaveProperty('created_at');
});
it('rejects unauthorized, blank and oversized notes',async()=>{
 await expect(run('select add_deal_note($1,$2)',[lead,'Wrong deal'],other)).rejects.toThrow(/access denied/);
 for(const text of ['   ','x'.repeat(5001)])await expect(run('select add_deal_note($1,$2)',[lead,text])).rejects.toThrow(/5000/);
});
it('blocks direct note author impersonation',async()=>{await expect(run('insert into notes(lead_id,text,created_by,created_by_name) values($1,$2,$3,$4)',[lead,'spoof',rep,'Admin'])).rejects.toThrow(/row-level security/);});
it('enforces numeric criteria, method and portal bounds',async()=>{
 await expect(db.exec("insert into funding_partners(name,min_credit_score) values('QA',200)")).rejects.toThrow();
 await expect(db.exec("insert into funding_partners(name,portal_url) values('QA','javascript:alert(1)')")).rejects.toThrow();
 await expect(db.exec("insert into funding_partners(name,preferred_submission_method) values('QA','unknown')")).rejects.toThrow();
 await db.exec("insert into funding_partners(name,submission_email,additional_cc_emails,min_credit_score) values('QA','submit@example.com','contact@example.com',650)");
});
it('records CC recipients when completing a lender delivery',async()=>{
 await db.query("insert into lender_email_deliveries(id,user_id,lead_id,recipient,cc_emails,document_ids,subject,body,state) values($1,$2,$3,'submit@example.com',array['contact@example.com'],'{}','QA','Synthetic','sending')",[other,rep,lead]);
 await db.query("select complete_lender_email_delivery($1,'gmail-qa','thread','sender@example.com')",[other]);
 expect((await db.query("select to_emails,cc_emails from gmail_messages where gmail_message_id='gmail-qa'")).rows).toEqual([{to_emails:['submit@example.com'],cc_emails:['contact@example.com']}]);
});
