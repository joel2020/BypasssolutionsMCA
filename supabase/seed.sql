/*
  Elite Funding Solutions demo seed data.

  Demo only. This resets CRM operating tables and inserts:
  150 leads, 100 MCA deals, 40 approved deals, 25 approved but not accepted deals,
  35 funded deals, 20 renewal opportunities, 50 earnings records, 15 funding
  partners, and 10 demo users with active CRM profiles.
*/

create extension if not exists pgcrypto;

truncate table
  public.application_status_history,
  public.activity_logs,
  public.partner_submissions,
  public.communications,
  public.application_underwriting,
  public.duplicate_detections,
  public.offers,
  public.documents,
  public.tasks,
  public.notes,
  public.commissions,
  public.owners,
  public.applications,
  public.companies,
  public.leads,
  public.funding_partners,
  public.funders,
  public.consent_records,
  public.audit_logs,
  public.datamerch_checks,
  public.credit_pull_requests,
  public.credit_reports,
  public.contact_submissions
restart identity cascade;

delete from public.profiles
where email like '%@elitefundingsolutions.example';

delete from auth.users
where email like '%@elitefundingsolutions.example';

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
on conflict (name) do update
set sort_order = excluded.sort_order,
    is_terminal = excluded.is_terminal;

do $$
declare
  demo_password text := crypt('EliteDemo2026!', gen_salt('bf'));
  user_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000101'::uuid,
    '00000000-0000-0000-0000-000000000102'::uuid,
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000104'::uuid,
    '00000000-0000-0000-0000-000000000105'::uuid,
    '00000000-0000-0000-0000-000000000106'::uuid,
    '00000000-0000-0000-0000-000000000107'::uuid,
    '00000000-0000-0000-0000-000000000108'::uuid,
    '00000000-0000-0000-0000-000000000109'::uuid,
    '00000000-0000-0000-0000-000000000110'::uuid
  ];
  user_names text[] := array[
    'Ari Kaplan','Maya Singh','Derek Price','Nina Alvarez','Caleb Morrison',
    'Priya Shah','Marcus Reed','Elena Brooks','Tessa Grant','Noah Kim'
  ];
  user_emails text[] := array[
    'ari.kaplan@elitefundingsolutions.example',
    'maya.singh@elitefundingsolutions.example',
    'derek.price@elitefundingsolutions.example',
    'nina.alvarez@elitefundingsolutions.example',
    'caleb.morrison@elitefundingsolutions.example',
    'priya.shah@elitefundingsolutions.example',
    'marcus.reed@elitefundingsolutions.example',
    'elena.brooks@elitefundingsolutions.example',
    'tessa.grant@elitefundingsolutions.example',
    'noah.kim@elitefundingsolutions.example'
  ];
  user_roles text[] := array['admin','admin','underwriter','underwriter','sales_rep','sales_rep','sales_rep','sales_rep','viewer','viewer'];
  rep_initials text[] := array['CM','PS','MR','EB'];
  rep_user_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000105'::uuid,
    '00000000-0000-0000-0000-000000000106'::uuid,
    '00000000-0000-0000-0000-000000000107'::uuid,
    '00000000-0000-0000-0000-000000000108'::uuid
  ];
  partner_names text[] := array[
    'Cobalt River Capital','Ironwood Advance','Northbridge Funding','Velocity Working Capital','Atlas Merchant Finance',
    'Keystone Revenue Partners','SummitBridge Capital','Pinnacle MCA Group','HarborStone Finance','MainStreet Growth Fund',
    'BlueOak Capital','Redwood Business Funding','Prairie Merchant Capital','Metroline Funding','Ascend Advance Partners'
  ];
  industries text[] := array[
    'Restaurant','Transportation','Construction','Retail','Medical Practice','Automotive Services','Manufacturing',
    'Staffing','HVAC','Landscaping','Dental Practice','Wholesale','E-Commerce','Security','Facilities Services'
  ];
  first_names text[] := array[
    'Sarah','Michael','Olivia','Daniel','Rachel','James','Angela','Kevin','Melissa','Robert',
    'Natalie','Anthony','Priya','Jason','Lauren','Marcus','Heather','Carlos','Tiffany','Brandon'
  ];
  last_names text[] := array[
    'Johnson','Spencer','Bennett','Wilson','Adams','Carter','Lee','White','Green','Craig',
    'Morgan','Ramirez','Shah','Price','Brooks','Reed','Nguyen','Torres','Grant','Kim'
  ];
  company_prefixes text[] := array[
    'Bright','Urban','NorthStar','Summit','Coastal','GreenLeaf','FastLane','Blue Wave','Golden Gate','Peak',
    'All Pro','Premium','Velocity','Arrow','Cedar','Metro','Lakeside','Evergreen','Prime','Stonebridge'
  ];
  company_suffixes text[] := array[
    'Bistro','Logistics','Auto Group','Industrial','Plumbing','Landscaping','Towing','Cleaning','Retail','Performance Gym',
    'Construction','Staffing Co.','Transport','Security Solutions','Dental Studio','Market','Medical Group','Contracting','Wholesale','Home Services'
  ];
  states text[] := array['NY','NJ','PA','CT','FL','GA','TX','IL','CA','AZ','NC','OH','MI','CO','WA'];
  sources text[] := array['Website','Google Ads','Referral','Facebook','Instagram','Partner','Direct / Organic','Broker Network'];
  use_cases text[] := array[
    'Payroll bridge','Inventory purchase','Equipment upgrade','Marketing expansion',
    'Seasonal working capital','Vendor payoff','Location buildout','Tax payment plan'
  ];
  entity_types text[] := array['LLC','Corporation','S-Corp','Partnership'];
  processors text[] := array['Stripe','Square','Clover','Toast','Fiserv','Authorize.net'];
  banks text[] := array['Chase','Bank of America','Wells Fargo','TD Bank','PNC','Capital One','Citizens','KeyBank'];
  app_ids uuid[] := array[]::uuid[];
  partner_ids uuid[] := array[]::uuid[];
  lead_id uuid;
  app_id uuid;
  company_id uuid;
  v_owner_id uuid;
  partner_id uuid;
  selected_rep int;
  lead_status text;
  app_status text;
  industry text;
  owner_first text;
  owner_last text;
  legal_name text;
  dba_name text;
  monthly_revenue numeric;
  requested_amount numeric;
  avg_balance numeric;
  monthly_deposits numeric;
  current_mca_balances numeric;
  current_daily_payments numeric;
  current_weekly_payments numeric;
  buy_rate numeric;
  sell_rate numeric;
  payback_amount numeric;
  commission_pct numeric;
  commission_amount numeric;
  created_on timestamptz;
  renewal_amount numeric;
  payoff_balance numeric;
  net_new_money numeric;
  i int;
  j int;
begin
  for i in 1..10 loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    values (
      user_ids[i],
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      user_emails[i],
      demo_password,
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', user_roles[i]),
      jsonb_build_object('full_name', user_names[i], 'demo_account', true),
      now() - ((30 - i) || ' days')::interval,
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

    insert into public.profiles (id, email, full_name, role, status)
    values (user_ids[i], user_emails[i], user_names[i], user_roles[i], 'active')
    on conflict (id) do update set
      email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      status = excluded.status,
      updated_at = now();
  end loop;

  for i in 1..15 loop
    insert into public.funding_partners (
      name, contact_name, email, phone, min_revenue, max_funding,
      industries_accepted, status, notes
    )
    values (
      partner_names[i],
      user_names[((i - 1) % array_length(user_names, 1)) + 1],
      lower(regexp_replace(partner_names[i], '[^a-zA-Z0-9]+', '.', 'g')) || '@partners.elitefundingsolutions.example',
      format('(800) 555-%s', lpad((2100 + i)::text, 4, '0')),
      15000 + (i * 2500),
      175000 + (i * 65000),
      array[
        industries[((i - 1) % array_length(industries, 1)) + 1],
        industries[(i % array_length(industries, 1)) + 1],
        industries[((i + 4) % array_length(industries, 1)) + 1]
      ],
      case when i in (13, 15) then 'Inactive' else 'Active' end,
      format('Demo partner. Prefers %s files with clean deposits and clear payoff letters.', industries[((i - 1) % array_length(industries, 1)) + 1])
    )
    returning id into partner_id;

    partner_ids := array_append(partner_ids, partner_id);

    insert into public.funders (
      name, contact_name, email, phone, min_revenue, min_time_in_business,
      industries_accepted, states, max_funding, notes, status
    )
    values (
      partner_names[i],
      user_names[((i - 1) % array_length(user_names, 1)) + 1],
      lower(regexp_replace(partner_names[i], '[^a-zA-Z0-9]+', '.', 'g')) || '@partners.elitefundingsolutions.example',
      format('(800) 555-%s', lpad((2100 + i)::text, 4, '0')),
      15000 + (i * 2500),
      case when i % 3 = 0 then '6 months' when i % 3 = 1 then '12 months' else '24 months' end,
      array[
        industries[((i - 1) % array_length(industries, 1)) + 1],
        industries[(i % array_length(industries, 1)) + 1],
        industries[((i + 4) % array_length(industries, 1)) + 1]
      ],
      case when i % 5 = 0 then 'NY, NJ, PA, CT, FL, TX, CA' else 'All 50 states' end,
      175000 + (i * 65000),
      format('Demo partner. Typical response time %s hours.', 4 + (i % 4) * 3),
      case when i in (13, 15) then 'Inactive' else 'Active' end
    );
  end loop;

  for i in 1..150 loop
    selected_rep := ((i - 1) % 4) + 1;
    industry := industries[((i - 1) % array_length(industries, 1)) + 1];
    owner_first := first_names[((i - 1) % array_length(first_names, 1)) + 1];
    owner_last := last_names[((i + 2) % array_length(last_names, 1)) + 1];
    legal_name := company_prefixes[((i - 1) % array_length(company_prefixes, 1)) + 1] || ' ' ||
                  company_suffixes[((i + 3) % array_length(company_suffixes, 1)) + 1] || ' ' ||
                  lpad(i::text, 3, '0') || ' LLC';
    dba_name := trim(replace(replace(legal_name, ' LLC', ''), lpad(i::text, 3, '0'), ''));
    monthly_revenue := 45000 + ((i * 13750) % 735000);
    requested_amount := 25000 + ((i * 9250) % 425000);
    avg_balance := round(monthly_revenue * (0.08 + ((i % 9)::numeric / 100)), 0);
    monthly_deposits := round(monthly_revenue * (1.82 + ((i % 7)::numeric / 20)), 0);
    current_mca_balances := case when i % 5 = 0 then 0 else 18000 + ((i * 6100) % 275000) end;
    current_daily_payments := case when current_mca_balances = 0 then 0 else round(current_mca_balances / (70 + (i % 60)), 0) end;
    current_weekly_payments := round(current_daily_payments * 5, 0);
    created_on := now() - ((150 - i) || ' days')::interval - (((i * 7) % 24) || ' hours')::interval;

    if i <= 35 then
      lead_status := 'Funded';
      app_status := 'Funded';
    elsif i <= 60 then
      lead_status := 'Offer Sent';
      app_status := 'Offer Sent';
    elsif i <= 100 then
      lead_status := 'Pre-Approved';
      app_status := 'Approved';
    else
      lead_status := case
        when i <= 110 then 'Under Review'
        when i <= 120 then 'Documents Needed'
        when i <= 132 then 'Application Started'
        when i <= 142 then 'Contacted'
        else 'New Lead'
      end;
      app_status := null;
    end if;

    insert into public.leads (
      created_at, updated_at, business_name, legal_name, dba, industry, website, state,
      time_in_business, monthly_revenue, annual_revenue, funding_amount_requested,
      requested_amount, first_name, last_name, owner_full_name, owner_title, owner_dob,
      email, business_email, phone, business_phone, credit_score_range, ownership_pct,
      use_of_funds, existing_advances, current_advances, current_bank, monthly_deposits,
      gross_monthly_revenue, net_monthly_deposits, number_of_deposits, avg_daily_balance,
      nsfs_last_90_days, negative_days, current_mca_balances, current_daily_payments,
      current_weekly_payments, ending_balances, accepts_credit_cards, payment_processor,
      monthly_card_volume, deposits_per_month, routing_last_four, account_last_four,
      ssn_last_four, ein_last_four, status, assigned_rep, assigned_to, source,
      submitted_at, last_contact_at, lead_score, sms_opt_in, consent, consent_text,
      notes, risk_notes, underwriter_notes, entity_type, start_date, business_address,
      owner_home_address
    )
    values (
      created_on,
      created_on + interval '3 hours',
      legal_name,
      legal_name,
      dba_name,
      industry,
      'https://demo' || i || '.elitefundingsolutions.example',
      states[((i - 1) % array_length(states, 1)) + 1],
      (2 + (i % 13)) || ' years',
      monthly_revenue,
      monthly_revenue * 12,
      requested_amount,
      requested_amount,
      owner_first,
      owner_last,
      owner_first || ' ' || owner_last,
      case when i % 4 = 0 then 'CEO' when i % 4 = 1 then 'Owner' when i % 4 = 2 then 'Managing Member' else 'President' end,
      (date '1973-01-01' + ((i * 389) % 9500)),
      lower(owner_first || '.' || owner_last || i || '@demo.elitefundingsolutions.example'),
      lower('funding+' || i || '@demo.elitefundingsolutions.example'),
      format('(%s) 555-%s', 201 + (i % 70), lpad((1000 + i)::text, 4, '0')),
      format('(%s) 555-%s', 301 + (i % 60), lpad((2000 + i)::text, 4, '0')),
      case when i % 5 = 0 then '580-639' when i % 5 = 1 then '640-679' when i % 5 = 2 then '680-719' else '720+' end,
      case when i % 7 = 0 then '80%' else '100%' end,
      case when i <= 20 then 'Renewal / additional working capital' else use_cases[((i - 1) % array_length(use_cases, 1)) + 1] end,
      current_mca_balances > 0,
      case when current_mca_balances > 0 then 'Current MCA balance ' || current_mca_balances::text || ', daily payments ' || current_daily_payments::text else 'None disclosed' end,
      banks[((i - 1) % array_length(banks, 1)) + 1],
      monthly_deposits,
      round(monthly_revenue * (1.04 + ((i % 5)::numeric / 100)), 0),
      monthly_deposits,
      24 + (i % 36),
      avg_balance,
      i % 5,
      i % 8,
      current_mca_balances,
      current_daily_payments,
      current_weekly_payments,
      format('M1:%s; M2:%s; M3:%s', avg_balance + (i * 10), avg_balance - (i * 8), avg_balance + (i * 6)),
      i % 3 <> 0,
      processors[((i - 1) % array_length(processors, 1)) + 1],
      round(monthly_revenue * (0.28 + ((i % 6)::numeric / 100)), 0),
      18 + (i % 38),
      lpad(((1100 + i) % 10000)::text, 4, '0'),
      lpad(((7100 + i) % 10000)::text, 4, '0'),
      lpad(((4100 + i) % 10000)::text, 4, '0'),
      lpad(((8100 + i) % 10000)::text, 4, '0'),
      lead_status,
      rep_initials[selected_rep],
      rep_user_ids[selected_rep],
      sources[((i - 1) % array_length(sources, 1)) + 1],
      created_on,
      created_on + interval '2 hours',
      52 + (i % 47),
      true,
      true,
      'Demo consent for calls, SMS, and email about MCA funding options.',
      format('Elite demo lead %s. Owner is seeking %s with monthly deposits of %s.', i, requested_amount, monthly_deposits),
      case when i % 6 = 0 then 'Watch recent NSFs and verify payoff letter.' else 'Bank activity supports requested amount.' end,
      case when i <= 100 then 'Underwriting snapshot seeded with current positions and renewal math.' else 'Lead stage only; awaiting full package.' end,
      entity_types[((i - 1) % array_length(entity_types, 1)) + 1],
      (date '2010-01-01' + ((i * 67) % 4200)),
      format('%s Main Street, Suite %s, %s', 100 + i, 10 + (i % 80), states[((i - 1) % array_length(states, 1)) + 1]),
      format('%s Oak Avenue, %s', 500 + i, states[((i - 1) % array_length(states, 1)) + 1])
    )
    returning id into lead_id;

    insert into public.consent_records (lead_id, email, consent_text, consented_at, source)
    values (lead_id, lower(owner_first || '.' || owner_last || i || '@demo.elitefundingsolutions.example'), 'Demo consent for Elite Funding Solutions MCA application follow-up.', created_on, 'website');

    insert into public.notes (lead_id, text, created_by_name, created_by)
    values
      (lead_id, format('Initial call completed. Merchant requested %s for %s.', requested_amount, use_cases[((i - 1) % array_length(use_cases, 1)) + 1]), user_names[5 + ((i - 1) % 4)], rep_user_ids[selected_rep]),
      (lead_id, format('Current positions: balance %s, daily %s, weekly %s.', current_mca_balances, current_daily_payments, current_weekly_payments), user_names[3 + ((i - 1) % 2)], user_ids[3 + ((i - 1) % 2)]);

    insert into public.tasks (lead_id, title, task_type, assigned_rep, assigned_to, due_date, priority, status, description)
    values (
      lead_id,
      'Complete merchant follow-up',
      'Follow Up',
      rep_initials[selected_rep],
      rep_user_ids[selected_rep],
      current_date + ((i % 12) - 4),
      case when i % 5 = 0 then 'High' when i % 5 in (1,2) then 'Medium' else 'Low' end,
      case when i % 4 = 0 then 'Completed' when i % 4 = 1 then 'In Progress' else 'Open' end,
      'Confirm outstanding documents and next best offer path.'
    );

    if i <= 100 then
      insert into public.companies (
        legal_name, dba, ein_last_four, business_address, phone, email, website,
        industry, entity_type, start_date, created_at, updated_at
      )
      values (
        legal_name,
        dba_name,
        lpad(((8100 + i) % 10000)::text, 4, '0'),
        format('%s Main Street, Suite %s, %s', 100 + i, 10 + (i % 80), states[((i - 1) % array_length(states, 1)) + 1]),
        format('(%s) 555-%s', 301 + (i % 60), lpad((2000 + i)::text, 4, '0')),
        lower('funding+' || i || '@demo.elitefundingsolutions.example'),
        'https://demo' || i || '.elitefundingsolutions.example',
        industry,
        entity_types[((i - 1) % array_length(entity_types, 1)) + 1],
        (date '2010-01-01' + ((i * 67) % 4200)),
        created_on,
        created_on + interval '3 hours'
      )
      returning id into company_id;

      insert into public.applications (
        lead_id, company_id, status, source, requested_amount, use_of_funds,
        monthly_revenue, annual_revenue, average_daily_balance, nsfs_last_90_days,
        current_advances, assigned_to, submitted_at, duplicate_fingerprint,
        created_at, updated_at
      )
      values (
        lead_id,
        company_id,
        app_status,
        sources[((i - 1) % array_length(sources, 1)) + 1],
        requested_amount,
        case when i <= 20 then 'Renewal / additional working capital' else use_cases[((i - 1) % array_length(use_cases, 1)) + 1] end,
        monthly_revenue,
        monthly_revenue * 12,
        avg_balance,
        i % 5,
        case when current_mca_balances > 0 then 'Current MCA balance ' || current_mca_balances::text else 'None disclosed' end,
        rep_user_ids[selected_rep],
        created_on,
        md5(lower(legal_name) || lower(owner_first || owner_last) || i::text),
        created_on,
        created_on + interval '3 hours'
      )
      returning id into app_id;

      app_ids := array_append(app_ids, app_id);

      insert into public.owners (
        application_id, full_name, title, ownership_percentage, dob, ssn_last_four,
        phone, email, home_address, sms_opt_in, created_at, updated_at
      )
      values (
        app_id,
        owner_first || ' ' || owner_last,
        case when i % 4 = 0 then 'CEO' when i % 4 = 1 then 'Owner' when i % 4 = 2 then 'Managing Member' else 'President' end,
        case when i % 7 = 0 then 80 else 100 end,
        (date '1973-01-01' + ((i * 389) % 9500)),
        lpad(((4100 + i) % 10000)::text, 4, '0'),
        format('(%s) 555-%s', 201 + (i % 70), lpad((1000 + i)::text, 4, '0')),
        lower(owner_first || '.' || owner_last || i || '@demo.elitefundingsolutions.example'),
        format('%s Oak Avenue, %s', 500 + i, states[((i - 1) % array_length(states, 1)) + 1]),
        true,
        created_on,
        created_on + interval '3 hours'
      )
      returning id into v_owner_id;

      update public.applications
      set owner_id = v_owner_id
      where id = app_id;

      buy_rate := round((1.18 + ((i % 10)::numeric / 100))::numeric, 2);
      sell_rate := round((buy_rate + 0.04 + ((i % 4)::numeric / 100))::numeric, 2);
      payback_amount := round(requested_amount * sell_rate, 0);
      partner_id := partner_ids[((i - 1) % 12) + 1];
      payoff_balance := current_mca_balances;
      renewal_amount := case when i <= 20 then round((payoff_balance * 1.18) + requested_amount * 0.42, 0) else 0 end;
      net_new_money := greatest(renewal_amount - payoff_balance, 0);

      insert into public.application_underwriting (
        application_id, monthly_deposits, average_daily_balance, nsfs, negative_days,
        current_mca_balances, current_daily_payments, current_weekly_payments,
        gross_monthly_revenue, net_monthly_deposits, number_of_deposits, ending_balances,
        factor_rate, buy_rate, sell_rate, term, holdback_percentage, payback_amount,
        estimated_commission, funding_partner, offer_amount, offer_status, stipulations,
        risk_notes, underwriter_notes, created_at, updated_at
      )
      values (
        app_id,
        monthly_deposits,
        avg_balance,
        i % 5,
        i % 8,
        current_mca_balances,
        current_daily_payments,
        current_weekly_payments,
        round(monthly_revenue * (1.04 + ((i % 5)::numeric / 100)), 0),
        monthly_deposits,
        24 + (i % 36),
        format('M1:%s; M2:%s; M3:%s', avg_balance + (i * 10), avg_balance - (i * 8), avg_balance + (i * 6)),
        sell_rate,
        buy_rate,
        sell_rate,
        case when i % 3 = 0 then '90 business days' when i % 3 = 1 then '120 business days' else '156 business days' end,
        10 + (i % 8),
        payback_amount,
        round(requested_amount * 0.06, 0),
        partner_names[((i - 1) % 12) + 1],
        requested_amount,
        case when app_status = 'Funded' then 'Funded' when app_status = 'Offer Sent' then 'Approved not accepted' else 'Approved' end,
        case when i % 4 = 0 then 'Landlord verification; payoff letter; final bank login refresh.' else 'Signed application; bank statements; voided check.' end,
        case when i % 6 = 0 then 'Verify NSFs and existing MCA payoff before contracts.' else 'Deposit trend and average balances are within partner box.' end,
        case when i <= 20 then format('Renewal calc: payoff %s, renewal gross %s, net new money %s, estimated payment relief %s.', payoff_balance, renewal_amount, net_new_money, greatest(current_daily_payments - round(payback_amount / 120, 0), 0)) else 'Approved file. Current positions and cash-flow load reviewed.' end,
        created_on,
        created_on + interval '3 hours'
      );

      for j in 1..3 loop
        insert into public.documents (
          lead_id, application_id, file_name, doc_type, document_type, storage_path,
          file_path, file_size, mime_type, status, review_notes, uploaded_by,
          uploaded_at, created_at
        )
        values (
          lead_id,
          app_id,
          case j when 1 then 'bank-statements-q' || ((i % 4) + 1) || '.pdf' when 2 then 'voided-check.pdf' else 'merchant-application.pdf' end,
          case j when 1 then 'Bank Statements' when 2 then 'Voided Check' else 'Signed Application' end,
          case j when 1 then 'Bank Statements' when 2 then 'Voided Check' else 'Signed Application' end,
          'application-documents/' || app_id || '/' || case j when 1 then 'bank-statements.pdf' when 2 then 'voided-check.pdf' else 'merchant-application.pdf' end,
          'application-documents/' || app_id || '/' || case j when 1 then 'bank-statements.pdf' when 2 then 'voided-check.pdf' else 'merchant-application.pdf' end,
          185000 + (i * 1100) + (j * 3500),
          'application/pdf',
          case when j = 1 and i % 11 = 0 then 'Pending' when j = 1 then 'Approved' else 'Reviewed' end,
          case when j = 1 then 'Deposits reviewed against application revenue.' else 'Demo document metadata only.' end,
          rep_user_ids[selected_rep],
          created_on + (j || ' hours')::interval,
          created_on + (j || ' hours')::interval
        );
      end loop;

      insert into public.tasks (
        lead_id, application_id, title, task_type, assigned_rep, assigned_to,
        due_date, priority, status, description, created_at, updated_at
      )
      values (
        lead_id,
        app_id,
        case when i <= 20 then 'Confirm renewal acceptance window' else 'Send underwriting update' end,
        case when i <= 20 then 'Renewal Review' else 'Underwriting' end,
        rep_initials[selected_rep],
        rep_user_ids[selected_rep],
        current_date + ((i % 10) - 3),
        case when i <= 20 then 'High' when i % 3 = 0 then 'Medium' else 'Low' end,
        case when app_status = 'Funded' then 'Completed' when i % 2 = 0 then 'In Progress' else 'Open' end,
        case when i <= 20 then format('Renewal opportunity: payoff %s, gross renewal %s, net new %s.', payoff_balance, renewal_amount, net_new_money) else 'Keep merchant warm while lender package is active.' end,
        created_on,
        created_on + interval '3 hours'
      );

      insert into public.notes (lead_id, application_id, text, created_by_name, created_by, created_at)
      values
        (lead_id, app_id, format('Merchant info confirmed: %s in %s, %s monthly revenue, %s requested.', legal_name, industry, monthly_revenue, requested_amount), user_names[5 + ((i - 1) % 4)], rep_user_ids[selected_rep], created_on + interval '30 minutes'),
        (lead_id, app_id, format('Financials: deposits %s, average daily balance %s, NSFs %s.', monthly_deposits, avg_balance, i % 5), user_names[3 + ((i - 1) % 2)], user_ids[3 + ((i - 1) % 2)], created_on + interval '90 minutes'),
        (lead_id, app_id, case when i <= 20 then format('Renewal calculations captured. Payoff %s, renewal gross %s, net new money %s.', payoff_balance, renewal_amount, net_new_money) else format('Current positions captured. MCA balance %s, daily payment %s.', current_mca_balances, current_daily_payments) end, user_names[3], user_ids[3], created_on + interval '2 hours');

      insert into public.application_status_history (application_id, lead_id, old_status, new_status, changed_by, notes, created_at)
      values
        (app_id, lead_id, null, 'Submitted', rep_user_ids[selected_rep], 'Application package created from demo seed.', created_on),
        (app_id, lead_id, 'Submitted', 'Underwriting', user_ids[3], 'Bank statements reviewed and current positions calculated.', created_on + interval '1 hour'),
        (app_id, lead_id, 'Underwriting', app_status, user_ids[4], 'Final demo status assigned for dashboard distribution.', created_on + interval '3 hours');

      insert into public.activity_logs (application_id, lead_id, user_id, action, metadata, created_at)
      values
        (app_id, lead_id, rep_user_ids[selected_rep], 'application_created', jsonb_build_object('seed', 'elite_funding_solutions_demo', 'requested_amount', requested_amount), created_on),
        (app_id, lead_id, user_ids[3], 'underwriting_completed', jsonb_build_object('monthly_deposits', monthly_deposits, 'current_mca_balances', current_mca_balances), created_on + interval '1 hour'),
        (app_id, lead_id, user_ids[4], 'status_changed', jsonb_build_object('new_status', app_status, 'funding_partner', partner_names[((i - 1) % 12) + 1]), created_on + interval '3 hours');

      if i <= 20 then
        insert into public.activity_logs (application_id, lead_id, user_id, action, metadata, created_at)
        values (
          app_id,
          lead_id,
          rep_user_ids[selected_rep],
          'renewal_opportunity_created',
          jsonb_build_object(
            'payoff_balance', payoff_balance,
            'renewal_gross_amount', renewal_amount,
            'net_new_money', net_new_money,
            'current_daily_payments', current_daily_payments,
            'projected_daily_payment', round(payback_amount / 120, 0)
          ),
          created_on + interval '4 hours'
        );
      end if;

      insert into public.communications (
        lead_id, application_id, direction, channel, subject, body, recipient,
        sender, status, related_template, sent_by, created_by, created_at
      )
      values
        (lead_id, app_id, 'outbound', 'Email', 'Elite Funding Solutions application update', 'Your MCA file has been reviewed and your funding specialist will follow up with next steps.', lower(owner_first || '.' || owner_last || i || '@demo.elitefundingsolutions.example'), 'deals@elitefundingsolutions.example', 'logged', 'status_update', rep_user_ids[selected_rep], rep_user_ids[selected_rep], created_on + interval '2 hours'),
        (lead_id, app_id, 'outbound', 'Call', 'Funding call', 'Reviewed revenue, positions, payoff needs, and funding timeline.', format('(%s) 555-%s', 201 + (i % 70), lpad((1000 + i)::text, 4, '0')), user_names[5 + ((i - 1) % 4)], 'logged', null, rep_user_ids[selected_rep], rep_user_ids[selected_rep], created_on + interval '4 hours');

      for j in 1..3 loop
        insert into public.partner_submissions (
          application_id, funding_partner_id, submitted_by, status, submitted_at,
          response_at, notes, created_at, updated_at
        )
        values (
          app_id,
          partner_ids[((i + j - 2) % 12) + 1],
          rep_user_ids[selected_rep],
          case
            when app_status = 'Funded' and j = 1 then 'Approved'
            when app_status = 'Offer Sent' and j <= 2 then 'Offer Sent'
            when app_status = 'Approved' and j = 1 then 'Approved'
            when j = 3 and i % 4 = 0 then 'Declined'
            else 'Submitted'
          end,
          created_on + (j || ' hours')::interval,
          case when app_status in ('Funded','Offer Sent','Approved') or (j = 3 and i % 4 = 0) then created_on + ((j + 4) || ' hours')::interval else null end,
          case when j = 1 then 'Primary submission based on partner box.' else 'Secondary offer path for comparison.' end,
          created_on + (j || ' hours')::interval,
          created_on + ((j + 1) || ' hours')::interval
        );
      end loop;

      insert into public.offers (
        lead_id, application_id, funder_name, funding_partner_id, funding_amount,
        offer_amount, payback_amount, factor_rate, buy_rate, sell_rate,
        holdback_percentage, estimated_payment, payment_amount, term, frequency,
        payment_frequency, commission_pct, commission_amount, stipulations, status,
        created_by_name, created_by, created_at, updated_at
      )
      values (
        lead_id,
        app_id,
        partner_names[((i - 1) % 12) + 1],
        partner_id,
        requested_amount,
        requested_amount,
        payback_amount,
        sell_rate,
        buy_rate,
        sell_rate,
        10 + (i % 8),
        round(payback_amount / case when i % 3 = 0 then 90 when i % 3 = 1 then 120 else 156 end, 0),
        round(payback_amount / case when i % 3 = 0 then 90 when i % 3 = 1 then 120 else 156 end, 0),
        case when i % 3 = 0 then '90 business days' when i % 3 = 1 then '120 business days' else '156 business days' end,
        case when i % 4 = 0 then 'Weekly' else 'Daily' end,
        case when i % 4 = 0 then 'Weekly' else 'Daily' end,
        6,
        round(requested_amount * 0.06, 0),
        case when i <= 20 then 'Renewal payoff letter; signed funding agreement; final bank verification.' else 'Signed contract; voided check; bank verification.' end,
        case when app_status = 'Funded' then 'Accepted' when app_status = 'Offer Sent' then 'Sent' else 'Draft' end,
        user_names[5 + ((i - 1) % 4)],
        rep_user_ids[selected_rep],
        created_on + interval '5 hours',
        created_on + interval '6 hours'
      );
    end if;
  end loop;

  for i in 1..50 loop
    app_id := app_ids[((i - 1) % 35) + 1];

    select l.id, l.first_name, l.last_name, l.business_name, l.assigned_rep, l.funding_amount_requested, o.funder_name
    into lead_id, owner_first, owner_last, legal_name, dba_name, requested_amount, industry
    from public.applications a
    join public.leads l on l.id = a.lead_id
    left join public.offers o on o.application_id = a.id
    where a.id = app_id
    limit 1;

    commission_pct := case when i % 5 = 0 then 3.5 when i % 3 = 0 then 7 else 6 end;
    commission_amount := round(requested_amount * (commission_pct / 100), 0);

    insert into public.commissions (
      lead_id, application_id, rep_id, lead_name, business_name, funder_name,
      rep_name, funded_amount, commission_pct, commission_amount, status,
      funded_date, created_at
    )
    values (
      lead_id,
      app_id,
      rep_user_ids[((i - 1) % 4) + 1],
      owner_first || ' ' || owner_last || ' - ' || legal_name,
      legal_name,
      coalesce(industry, partner_names[((i - 1) % 12) + 1]),
      dba_name,
      requested_amount,
      commission_pct,
      commission_amount,
      case when i <= 28 then 'Paid' when i <= 42 then 'Pending' else 'Unpaid' end,
      (current_date - (i % 45))::date,
      now() - ((i % 45) || ' days')::interval
    );
  end loop;
end $$;

do $$
declare
  checks jsonb;
  expected jsonb;
begin
  select jsonb_build_object(
    'leads', (select count(*) from public.leads),
    'deals', (select count(*) from public.applications),
    'approved_deals', (select count(*) from public.applications where status = 'Approved'),
    'approved_not_accepted', (select count(*) from public.applications where status = 'Offer Sent'),
    'funded_deals', (select count(*) from public.applications where status = 'Funded'),
    'renewal_opportunities', (select count(*) from public.activity_logs where action = 'renewal_opportunity_created'),
    'renewal_review_tasks', (select count(*) from public.tasks where task_type = 'Renewal Review'),
    'earnings_records', (select count(*) from public.commissions),
    'funding_partners', (select count(*) from public.funding_partners),
    'legacy_funders', (select count(*) from public.funders),
    'demo_users', (select count(*) from public.profiles where email like '%@elitefundingsolutions.example'),
    'deals_with_underwriting', (select count(distinct application_id) from public.application_underwriting),
    'deals_with_notes', (select count(distinct application_id) from public.notes where application_id is not null),
    'deals_with_activity', (select count(distinct application_id) from public.activity_logs where application_id is not null),
    'deals_with_partner_submissions', (select count(distinct application_id) from public.partner_submissions),
    'deals_with_documents', (select count(distinct application_id) from public.documents where application_id is not null)
  ) into checks;

  expected := jsonb_build_object(
    'leads', 150,
    'deals', 100,
    'approved_deals', 40,
    'approved_not_accepted', 25,
    'funded_deals', 35,
    'renewal_opportunities', 20,
    'renewal_review_tasks', 20,
    'earnings_records', 50,
    'funding_partners', 15,
    'legacy_funders', 15,
    'demo_users', 10,
    'deals_with_underwriting', 100,
    'deals_with_notes', 100,
    'deals_with_activity', 100,
    'deals_with_partner_submissions', 100,
    'deals_with_documents', 100
  );

  if checks <> expected then
    raise exception 'Elite demo seed count check failed. Expected %, got %', expected, checks;
  end if;

  raise notice 'Elite demo seed loaded: %', checks;
end $$;
