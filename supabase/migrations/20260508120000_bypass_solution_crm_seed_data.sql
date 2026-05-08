/*
  Bypass Solution CRM sample operating data
  - Seeds MCA pipeline stages, funding partners, representative users, CRM applications, owners,
    underwriting snapshots, documents, tasks, notes, communications, offers, activity logs and commissions.
  - All sensitive fields are masked to last-four only for demo safety.
*/

insert into public.pipeline_stages (name, sort_order, is_terminal) values
  ('New', 10, false),
  ('Submitted', 20, false),
  ('In Review', 30, false),
  ('Underwriting', 40, false),
  ('Approved', 50, false),
  ('Offer Sent', 60, false),
  ('Funded', 70, true),
  ('Declined', 80, true),
  ('Withdrawn', 90, true)
on conflict (name) do update set sort_order = excluded.sort_order, is_terminal = excluded.is_terminal;

insert into public.funding_partners (name, contact_name, email, phone, min_revenue, max_funding, industries_accepted, status, notes)
select * from (values
  ('OnDeck', 'Partner Desk', 'submissions@ondeck.example', '(800) 555-0101', 10000::numeric, 500000::numeric, array['Restaurant','Manufacturing','Staffing'], 'Active', 'Primary fast-turnaround MCA partner.'),
  ('Forward Financing', 'ISO Team', 'submissions@forward.example', '(800) 555-0102', 15000::numeric, 400000::numeric, array['Transportation','HVAC'], 'Active', 'Good fit for transportation and service businesses.'),
  ('Rapid Finance', 'Submissions', 'submissions@rapid.example', '(800) 555-0103', 12000::numeric, 350000::numeric, array['Restaurant','Automotive Services','Transportation'], 'Active', 'Competitive pre-approval workflow.'),
  ('Credibly', 'Partner Support', 'submissions@credibly.example', '(800) 555-0104', 10000::numeric, 300000::numeric, array['Marketing','Facilities Services','Security'], 'Active', 'Useful for lighter documentation files.'),
  ('Kapitus', 'Submissions', 'submissions@kapitus.example', '(800) 555-0105', 20000::numeric, 750000::numeric, array['Construction','Auto Sales'], 'Active', 'Handles larger revenue files.'),
  ('Fora Financial', 'Funding Desk', 'submissions@fora.example', '(800) 555-0106', 12000::numeric, 500000::numeric, array['Contractor','Retail'], 'Active', 'Strong renewal and retail programs.')
) as partner(name, contact_name, email, phone, min_revenue, max_funding, industries_accepted, status, notes)
where not exists (select 1 from public.funding_partners fp where fp.name = partner.name);

insert into public.leads (
  business_name, dba, industry, entity_type, start_date, monthly_revenue, annual_revenue,
  funding_amount_requested, requested_amount, avg_daily_balance, monthly_deposits, nsfs_last_90_days,
  current_mca_balances, first_name, last_name, owner_full_name, owner_title, email, phone,
  status, assigned_rep, source, submitted_at, last_contact_at, consent, ssn_last_four, ein_last_four,
  routing_last_four, account_last_four, notes
) values
  ('Bright Bistro LLC','Bright Bistro','Restaurant','LLC','2018-04-12',120000,1440000,75000,75000,18750,562300,3,245000,'Sarah','Johnson','Sarah Johnson','Managing Member','sarah@brightbistro.com','(212) 555-0178','New','AT','Direct / Organic',now() - interval '2 hours',now() - interval '2 hours',true,'4321','1234','0021','7788','Owner requested same-week review.'),
  ('Urban Road Logistics','Urban Road','Transportation','Corporation','2016-09-02',410000,4920000,250000,250000,42500,905000,1,320000,'Mark','Spencer','Mark Spencer','President','mark@urbanroadlogistics.com','(718) 555-0144','Submitted','DP','Referral',now() - interval '1 day',now() - interval '3 hours',true,'1144','4411','9088','1255','Requested voided check and four months statements.'),
  ('Elite Auto Group','Elite Auto','Auto Sales','LLC','2013-03-19',500000,6000000,300000,300000,58700,1140000,0,125000,'David','Wilson','David Wilson','Owner','david@eliteautogroup.com','(201) 555-0199','In Review','AT','Partner',now() - interval '1 day',now() - interval '1 hour',true,'0199','8901','6601','4400','Strong deposits, verify floor plan debt.'),
  ('NorthStar Restaurant','NorthStar','Restaurant','S-Corp','2017-11-06',320000,3840000,200000,200000,31750,790000,2,175000,'Olivia','Bennett','Olivia Bennett','CEO','olivia@northstarrestaurant.com','(646) 555-0125','Approved','AT','Direct / Organic',now() - interval '2 days',now() - interval '2 hours',true,'0125','3319','1822','7400','Pre-approval pending landlord verification.'),
  ('NextGen Marketing','NextGen','Marketing','LLC','2019-06-21',210000,2520000,125000,125000,22500,540000,1,80000,'Justin','Hall','Justin Hall','Founder','justin@nextgenmarketing.com','(917) 555-0162','Offer Sent','AT','Direct / Organic',now() - interval '3 days',now() - interval '3 hours',true,'0162','7708','4471','3112','Offer email opened twice.'),
  ('Summit Industrial','Summit Industrial','Manufacturing','Corporation','2011-01-14',690000,8280000,350000,350000,73500,1480000,0,0,'Jason','Price','Jason Price','Managing Partner','jason@summitindustrial.com','(973) 555-0110','Funded','AT','Partner',now() - interval '5 days',now() - interval '1 day',true,'0110','5532','2209','6188','Commission scheduled for next payroll.'),
  ('Coastal Plumbing Inc.','Coastal Plumbing','Contractor','Corporation','2015-05-30',250000,3000000,150000,150000,28750,610000,0,95000,'James','Carter','James Carter','President','james@coastalplumbing.com','(732) 555-0140','New','DP','Referral',now() - interval '6 hours',now() - interval '6 hours',true,'0140','2188','9090','1120','Prefers morning calls.'),
  ('Sunshine Daycare','Sunshine Daycare','Childcare','LLC','2020-02-10',130000,1560000,80000,80000,16400,330000,2,45000,'Melissa','Green','Melissa Green','Owner','melissa@sunshinedaycare.com','(516) 555-0137','Submitted','KW','Direct / Organic',now() - interval '6 hours',now() - interval '6 hours',true,'0137','5501','8277','5300','Needs processing statements.'),
  ('GreenLeaf Landscaping','GreenLeaf','Landscaping','LLC','2018-08-08',180000,2160000,120000,120000,19800,430000,1,55000,'Chris','Martin','Chris Martin','Owner','chris@greenleaflandscaping.com','(908) 555-0170','In Review','KW','Referral',now() - interval '2 days',now() - interval '5 hours',true,'0170','4320','3344','7122','Seasonal revenue; normalize trailing six months.'),
  ('FastLane Towing','FastLane','Automotive Services','LLC','2019-10-01',150000,1800000,95000,95000,14250,365000,4,70000,'Brian','Turner','Brian Turner','Owner','brian@fastlanetowing.com','(347) 555-0188','Approved','KW','Partner',now() - interval '3 days',now() - interval '6 hours',true,'0188','9182','4455','1880','Condition approval on NSF explanation.'),
  ('Blue Wave Cleaning','Blue Wave','Facilities Services','LLC','2021-03-18',140000,1680000,85000,85000,15800,315000,0,38000,'Amber','Scott','Amber Scott','Founder','amber@bluewavecleaning.com','(914) 555-0120','Offer Sent','KW','Direct / Organic',now() - interval '4 days',now() - interval '1 day',true,'0120','6612','9910','6610','Owner reviewing weekly remittance option.'),
  ('Golden Gate Retail','Golden Gate','Retail','S-Corp','2014-07-24',260000,3120000,150000,150000,30000,680000,1,0,'Lisa','Tran','Lisa Tran','Owner','lisa@goldengateretail.com','(415) 555-0148','Funded','KW','Referral',now() - interval '6 days',now() - interval '2 days',true,'0148','7150','1190','7182','Renewal date set for September.'),
  ('Peak Performance Gym','Peak Performance','Fitness','LLC','2020-01-01',95000,1140000,60000,60000,9700,220000,2,25000,'Rachel','Adams','Rachel Adams','Owner','rachel@peakperformancegym.com','(203) 555-0192','New','AT','Direct / Organic',now() - interval '1 day',now() - interval '1 day',true,'0192','4001','6199','2221','Looking for equipment purchase funding.'),
  ('All Pro Construction','All Pro','Construction','Corporation','2012-04-04',350000,4200000,200000,200000,40200,820000,0,160000,'Tom','Reynolds','Tom Reynolds','President','tom@allproconstruction.com','(609) 555-0155','Submitted','AT','Partner',now() - interval '1 day',now() - interval '1 day',true,'0155','8820','6100','3144','Document requested: processing statements.'),
  ('Premium Staffing Co.','Premium Staffing','Staffing','LLC','2016-12-01',290000,3480000,175000,175000,33500,740000,0,115000,'Angela','Lee','Angela Lee','CEO','angela@premiumstaffing.com','(212) 555-0117','In Review','DP','Referral',now() - interval '2 days',now() - interval '1 day',true,'0117','5098','2200','4511','Payroll lender payoff letter requested.'),
  ('Pro HVAC Services','Pro HVAC','HVAC','LLC','2017-09-09',190000,2280000,110000,110000,21500,485000,1,62000,'Kevin','White','Kevin White','Owner','kevin@prohvacservices.com','(856) 555-0168','Approved','DP','Direct / Organic',now() - interval '3 days',now() - interval '23 hours',true,'0168','3451','7200','4409','Eligible for split funding option.'),
  ('Velocity Transport','Velocity','Transportation','LLC','2014-02-27',460000,5520000,275000,275000,50100,1100000,2,210000,'Steven','Moore','Steven Moore','Owner','steven@velocitytransport.com','(718) 555-0190','Offer Sent','DP','Partner',now() - interval '4 days',now() - interval '1 day',true,'0190','1820','8112','3719','Offer includes payoff of two positions.'),
  ('Arrow Security Solutions','Arrow Security','Security','LLC','2018-10-15',170000,2040000,100000,100000,17600,410000,0,0,'Robert','Craig','Robert Craig','Founder','robert@arrowsecurity.com','(646) 555-0181','Funded','DP','Direct / Organic',now() - interval '7 days',now() - interval '3 days',true,'0181','2711','4401','1170','Post-funding check-in scheduled.')
on conflict do nothing;

insert into public.companies (legal_name, dba, email, phone, industry, entity_type, start_date, ein_last_four)
select business_name, dba, email, phone, industry, entity_type, start_date, ein_last_four from public.leads
where business_name in ('Bright Bistro LLC','Urban Road Logistics','Elite Auto Group','NorthStar Restaurant','NextGen Marketing','Summit Industrial','Coastal Plumbing Inc.','Sunshine Daycare','GreenLeaf Landscaping','FastLane Towing','Blue Wave Cleaning','Golden Gate Retail','Peak Performance Gym','All Pro Construction','Premium Staffing Co.','Pro HVAC Services','Velocity Transport','Arrow Security Solutions')
on conflict do nothing;


-- Enable the requested Kanban entry stage on normalized applications.
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status in ('New','Submitted','In Review','Underwriting','Approved','Offer Sent','Funded','Declined','Withdrawn'));

insert into public.applications (lead_id, company_id, status, source, requested_amount, monthly_revenue, annual_revenue, average_daily_balance, nsfs_last_90_days, submitted_at)
select l.id, c.id, case when l.status = 'In Review' then 'Underwriting' else l.status end, l.source, l.funding_amount_requested, l.monthly_revenue, l.annual_revenue, l.avg_daily_balance, l.nsfs_last_90_days, l.submitted_at
from public.leads l join public.companies c on c.legal_name = l.business_name
where l.business_name in ('Bright Bistro LLC','Urban Road Logistics','Elite Auto Group','NorthStar Restaurant','NextGen Marketing','Summit Industrial','Coastal Plumbing Inc.','Sunshine Daycare','GreenLeaf Landscaping','FastLane Towing','Blue Wave Cleaning','Golden Gate Retail','Peak Performance Gym','All Pro Construction','Premium Staffing Co.','Pro HVAC Services','Velocity Transport','Arrow Security Solutions')
on conflict do nothing;

insert into public.application_underwriting (application_id, monthly_deposits, average_daily_balance, nsfs, current_mca_balances, factor_rate, payback_amount, funding_partner, offer_amount, offer_status)
select a.id, l.monthly_deposits, l.avg_daily_balance, l.nsfs_last_90_days, l.current_mca_balances,
  case when l.status = 'Funded' then 1.24 when l.status = 'Offer Sent' then 1.27 else 1.30 end,
  round(l.funding_amount_requested * case when l.status = 'Funded' then 1.24 when l.status = 'Offer Sent' then 1.27 else 1.30 end),
  case when l.assigned_rep = 'DP' then 'Forward Financing' when l.industry = 'Construction' then 'Kapitus' else 'OnDeck' end,
  l.funding_amount_requested,
  case when l.status = 'Funded' then 'Funded' when l.status = 'Offer Sent' then 'Sent' else 'Active' end
from public.applications a join public.leads l on l.id = a.lead_id
on conflict do nothing;

insert into public.activity_logs (application_id, lead_id, action, metadata)
select a.id, a.lead_id, 'seeded_crm_activity', jsonb_build_object('business', l.business_name, 'status', a.status, 'message', 'Sample CRM audit trail entry')
from public.applications a join public.leads l on l.id = a.lead_id
on conflict do nothing;

insert into public.owners (application_id, full_name, title, ownership_percentage, ssn_last_four, phone, email, sms_opt_in)
select a.id, l.owner_full_name, l.owner_title, 100, l.ssn_last_four, l.phone, l.email, true
from public.applications a join public.leads l on l.id = a.lead_id
where not exists (select 1 from public.owners o where o.application_id = a.id);

update public.applications a
set owner_id = o.id
from public.owners o
where o.application_id = a.id and a.owner_id is null;

insert into public.documents (lead_id, application_id, file_name, doc_type, document_type, storage_path, file_path, status, review_notes, mime_type)
select l.id, a.id, doc.file_name, doc.doc_type, doc.doc_type, 'application-documents/' || a.id || '/' || doc.file_name, 'application-documents/' || a.id || '/' || doc.file_name, doc.status, doc.review_notes, 'application/pdf'
from public.applications a
join public.leads l on l.id = a.lead_id
cross join (values
  ('bank-statements.pdf', 'Bank Statements', 'Approved', 'Verified encrypted upload.'),
  ('government-id.pdf', 'Government ID', 'Reviewed', 'Identity matched owner record.'),
  ('voided-check.pdf', 'Voided Check', 'Reviewed', 'Account details stored as masked last-four only.')
) as doc(file_name, doc_type, status, review_notes)
where l.business_name in ('Bright Bistro LLC','Urban Road Logistics','Elite Auto Group')
on conflict do nothing;

insert into public.tasks (lead_id, application_id, title, task_type, assigned_rep, due_date, priority, status, description)
select l.id, a.id, 'Follow up on missing MCA statements', 'Request Documents', l.assigned_rep, current_date + 1, 'High', 'Open', 'Confirm final document checklist before underwriting submission.'
from public.applications a join public.leads l on l.id = a.lead_id
where l.status in ('Submitted','New')
on conflict do nothing;

insert into public.notes (lead_id, application_id, text, created_by_name)
select l.id, a.id, coalesce(l.notes, 'Initial CRM note added during seed import.'), 'Joel Carias'
from public.applications a join public.leads l on l.id = a.lead_id
on conflict do nothing;

insert into public.offers (lead_id, application_id, funder_name, funding_partner_id, funding_amount, offer_amount, payback_amount, factor_rate, sell_rate, estimated_payment, payment_amount, term, frequency, payment_frequency, commission_pct, commission_amount, status, created_by_name)
select l.id, a.id, uw.funding_partner, fp.id, l.funding_amount_requested, l.funding_amount_requested, uw.payback_amount, uw.factor_rate, uw.factor_rate, round(uw.payback_amount / 120), round(uw.payback_amount / 120), '120 business days', 'Daily', 'Daily', 6, round(l.funding_amount_requested * 0.06), case when l.status = 'Funded' then 'Accepted' when l.status = 'Offer Sent' then 'Sent' else 'Draft' end, 'Joel Carias'
from public.applications a
join public.leads l on l.id = a.lead_id
join public.application_underwriting uw on uw.application_id = a.id
left join public.funding_partners fp on fp.name = uw.funding_partner
where l.status in ('Offer Sent','Funded','Approved')
on conflict do nothing;

insert into public.communications (lead_id, application_id, direction, channel, subject, body, recipient, sender, status)
select l.id, a.id, 'outbound', 'Email', 'Bypass Solution application update', 'Your working capital file has an update in the Bypass Solution CRM.', l.email, 'success@bypasssolution.com', 'logged'
from public.applications a join public.leads l on l.id = a.lead_id
on conflict do nothing;

insert into public.partner_submissions (application_id, funding_partner_id, status, submitted_at, notes)
select a.id, fp.id, case when l.status in ('Offer Sent','Funded','Approved') then 'Submitted' else 'Prepared' end, case when l.status in ('Offer Sent','Funded','Approved') then now() - interval '1 day' else null end, 'Seeded partner submission record.'
from public.applications a
join public.leads l on l.id = a.lead_id
left join public.application_underwriting uw on uw.application_id = a.id
left join public.funding_partners fp on fp.name = uw.funding_partner
where fp.id is not null
on conflict do nothing;

insert into public.commissions (lead_id, application_id, lead_name, business_name, funder_name, rep_name, funded_amount, commission_pct, commission_amount, status, funded_date)
select l.id, a.id, l.first_name || ' ' || l.last_name || ' — ' || l.business_name, l.business_name, uw.funding_partner, l.assigned_rep, l.funding_amount_requested, 6, round(l.funding_amount_requested * 0.06), 'Pending', current_date
from public.applications a
join public.leads l on l.id = a.lead_id
join public.application_underwriting uw on uw.application_id = a.id
where l.status = 'Funded'
on conflict do nothing;
