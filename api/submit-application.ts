import { createClient } from '@supabase/supabase-js';

const CONSENT_TEXT = 'By submitting this application, you authorize Bypass Solution and its funding partners to review the information provided, contact you regarding funding options, and request additional documentation as needed. Submission does not guarantee approval or funding.';

type Payload = Record<string, unknown>;

function asString(payload: Payload, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function moneyToNumber(value: string) {
  return Number(digitsOnly(value)) || 0;
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server submission is not configured.' });
  }

  const payload = (req.body || {}) as Payload;
  if (asString(payload, 'honeypot')) {
    return res.status(400).json({ error: 'Application could not be submitted.' });
  }

  const required = ['legalName','businessAddress','businessPhone','businessEmail','startDate','entityType','industry','requestedAmount','useOfFunds','monthlyRevenue','annualRevenue','averageDailyBalance','currentAdvances','currentBank','nsfsLast90Days','ownerName','ownerTitle','ownershipPercentage','dateOfBirth','ssnLastFour','ownerPhone','ownerEmail','homeAddress'];
  const missing = required.filter((key) => !asString(payload, key));
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }

  if (digitsOnly(asString(payload, 'ssnLastFour')).length !== 4) {
    return res.status(400).json({ error: 'SSN last four must be exactly 4 digits.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { firstName, lastName } = splitName(asString(payload, 'ownerName'));

  const { data, error } = await supabase
    .from('leads')
    .insert({
      business_name: asString(payload, 'legalName'),
      legal_name: asString(payload, 'legalName'),
      dba: asString(payload, 'dba'),
      business_address: asString(payload, 'businessAddress'),
      business_phone: asString(payload, 'businessPhone'),
      business_email: asString(payload, 'businessEmail'),
      website: asString(payload, 'website'),
      ein_last_four: digitsOnly(asString(payload, 'einLastFour')).slice(0, 4),
      start_date: asString(payload, 'startDate'),
      entity_type: asString(payload, 'entityType'),
      industry: asString(payload, 'industry'),
      state: '',
      time_in_business: '',
      monthly_revenue: moneyToNumber(asString(payload, 'monthlyRevenue')),
      gross_monthly_revenue: moneyToNumber(asString(payload, 'monthlyRevenue')),
      net_monthly_deposits: moneyToNumber(asString(payload, 'monthlyRevenue')),
      annual_revenue: moneyToNumber(asString(payload, 'annualRevenue')),
      funding_amount_requested: moneyToNumber(asString(payload, 'requestedAmount')),
      requested_amount: moneyToNumber(asString(payload, 'requestedAmount')),
      first_name: firstName,
      last_name: lastName,
      owner_full_name: asString(payload, 'ownerName'),
      owner_title: asString(payload, 'ownerTitle'),
      owner_dob: asString(payload, 'dateOfBirth'),
      ssn_last_four: digitsOnly(asString(payload, 'ssnLastFour')).slice(0, 4),
      owner_home_address: asString(payload, 'homeAddress'),
      email: asString(payload, 'ownerEmail'),
      phone: asString(payload, 'ownerPhone'),
      ownership_pct: asString(payload, 'ownershipPercentage'),
      use_of_funds: asString(payload, 'useOfFunds'),
      existing_advances: asString(payload, 'currentAdvances') === 'Yes',
      current_advances: asString(payload, 'currentAdvances'),
      current_bank: asString(payload, 'currentBank'),
      nsfs_last_90_days: Number(asString(payload, 'nsfsLast90Days')) || 0,
      negative_days: 0,
      current_mca_balances: 0,
      current_daily_payments: 0,
      current_weekly_payments: 0,
      monthly_deposits: moneyToNumber(asString(payload, 'monthlyRevenue')),
      avg_daily_balance: moneyToNumber(asString(payload, 'averageDailyBalance')),
      number_of_deposits: 0,
      ending_balances: '',
      accepts_credit_cards: false,
      payment_processor: '',
      monthly_card_volume: 0,
      deposits_per_month: 0,
      routing_last_four: '',
      account_last_four: '',
      sms_opt_in: payload.smsOptIn === true,
      status: 'Application Started',
      source: 'Website',
      consent: true,
      consent_text: CONSENT_TEXT,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const leadId = data.id as string;

  try {
    await supabase.from('communications').insert({
      lead_id: leadId,
      channel: 'Email',
      direction: 'outbound',
      subject: 'Application received',
      body: 'Applicant confirmation queued: Bypass Solution received the funding application for review.',
      recipient: asString(payload, 'ownerEmail'),
      sender: 'info@bypasssolution.com',
      status: 'queued',
    });
  } catch {}

  try {
    await supabase.from('audit_logs').insert({
      lead_id: leadId,
      action: 'application_submitted',
      metadata: { source: 'website', submitted_via: 'serverless_api' },
    });
  } catch {}

  return res.status(200).json({
    id: leadId,
    confirmationId: leadId.slice(0, 8).toUpperCase(),
  });
}
