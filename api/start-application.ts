import { createClient } from '@supabase/supabase-js';
import { generateApplicationDocument, isSignNowConfigured, type SignNowResult } from './_signnow';

const CONSENT_TEXT =
  'By submitting this request, you authorize Bypass Solution and its funding partners to contact you regarding funding options and to send a funding application for your electronic signature. Submission does not guarantee approval or funding.';

type Payload = Record<string, unknown>;
type ApiRequest = { method?: string; body?: unknown };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

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

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (req.body || {}) as Payload;

  // Honeypot: silently reject bots without revealing the trap.
  if (asString(payload, 'honeypot')) {
    return res.status(400).json({ error: 'Request could not be submitted.' });
  }

  // Lean lead-capture validation.
  const legalName = asString(payload, 'legalName');
  const ownerName = asString(payload, 'ownerName');
  const email = asString(payload, 'email');
  const phone = asString(payload, 'phone');
  const requestedAmount = asString(payload, 'requestedAmount');
  const useOfFunds = asString(payload, 'useOfFunds');
  const consent = payload.consent === true;

  const errors: string[] = [];
  if (!legalName) errors.push('Business legal name is required.');
  if (!ownerName) errors.push('Your name is required.');
  if (!email || !isEmail(email)) errors.push('A valid email is required.');
  if (!phone) errors.push('Phone number is required.');
  if (moneyToNumber(requestedAmount) <= 0) errors.push('Amount requested must be numeric.');
  if (!useOfFunds) errors.push('Use of funds is required.');
  if (!consent) errors.push('You must agree to be contacted to continue.');
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const lead = { legalName, ownerName, email, phone, requestedAmount, useOfFunds };

  // Persist the lead (primary goal — must not be lost even if signNow is down).
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Lead capture is not configured (missing Supabase server credentials).' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { firstName, lastName } = splitName(ownerName);

  const { data, error } = await supabase
    .from('leads')
    .insert({
      business_name: legalName,
      legal_name: legalName,
      first_name: firstName,
      last_name: lastName,
      owner_full_name: ownerName,
      email,
      phone,
      funding_amount_requested: moneyToNumber(requestedAmount),
      requested_amount: moneyToNumber(requestedAmount),
      use_of_funds: useOfFunds,
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

  // Generate + send the signNow application (best-effort; never blocks the lead).
  let signing: SignNowResult = { status: 'skipped' };
  if (isSignNowConfigured()) {
    signing = await generateApplicationDocument(lead);
  }

  try {
    await supabase.from('communications').insert({
      lead_id: leadId,
      channel: 'Email',
      direction: 'outbound',
      subject: signing.status === 'sent' ? 'Funding application sent for signature' : 'Funding request received',
      body:
        signing.status === 'sent'
          ? 'A signNow funding application was generated and emailed to the applicant for e-signature.'
          : 'Bypass Solution received the funding request and will follow up with next steps.',
      recipient: email,
      sender: 'info@bypasssolution.com',
      status: 'queued',
    });
  } catch (commError) {
    console.error('Failed to queue confirmation communication.', commError);
  }

  try {
    await supabase.from('audit_logs').insert({
      lead_id: leadId,
      action: 'application_started',
      metadata: { source: 'website', submitted_via: 'serverless_api', signnow: signing.status },
    });
  } catch (auditError) {
    console.error('Failed to write audit log.', auditError);
  }

  return res.status(200).json({
    id: leadId,
    confirmationId: leadId.slice(0, 8).toUpperCase(),
    signing: signing.status,
  });
}
