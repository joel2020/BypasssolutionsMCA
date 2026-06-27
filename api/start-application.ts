import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// signNow integration (inlined — Vercel excludes underscore-prefixed sibling
// files from the function bundle, so this cannot live in a separate module).
//
// Required env (set in Vercel → Settings → Environment Variables):
//   SIGNNOW_API_KEY        A signNow API token usable directly as a Bearer token.
//                          (Or use the OAuth password grant vars below.)
//   SIGNNOW_TEMPLATE_ID    The template the application document is copied from.
// Optional env:
//   SIGNNOW_API_BASE       Defaults to https://api.signnow.com (sandbox:
//                          https://api-eval.signnow.com).
//   SIGNNOW_CLIENT_BASIC / SIGNNOW_USERNAME / SIGNNOW_PASSWORD  OAuth alternative.
//   SIGNNOW_SIGNER_ROLE    Template role to invite (defaults to the first role).
//   SIGNNOW_FROM_EMAIL     Invite "from" address (defaults to SIGNNOW_USERNAME).
//   SIGNNOW_FIELD_MAP      JSON mapping signNow template field names -> lead keys,
//                          e.g. {"business_name":"legalName","amount":"requestedAmount"}.
// ---------------------------------------------------------------------------

interface SignNowLead {
  legalName: string;
  ownerName: string;
  email: string;
  phone: string;
  requestedAmount: string;
  useOfFunds: string;
}
type SignNowStatus = 'sent' | 'skipped' | 'error';

function signNowBase() {
  return (process.env.SIGNNOW_API_BASE || 'https://api.signnow.com').replace(/\/+$/, '');
}

function isSignNowConfigured() {
  return Boolean(
    process.env.SIGNNOW_TEMPLATE_ID &&
      (process.env.SIGNNOW_API_KEY ||
        (process.env.SIGNNOW_CLIENT_BASIC && process.env.SIGNNOW_USERNAME && process.env.SIGNNOW_PASSWORD)),
  );
}

async function signNowToken(): Promise<string> {
  if (process.env.SIGNNOW_API_KEY) return process.env.SIGNNOW_API_KEY;
  const body = new URLSearchParams({
    grant_type: 'password',
    username: process.env.SIGNNOW_USERNAME || '',
    password: process.env.SIGNNOW_PASSWORD || '',
  });
  const res = await fetch(`${signNowBase()}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${process.env.SIGNNOW_CLIENT_BASIC}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) throw new Error(`signNow auth failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('signNow auth returned no access_token.');
  return json.access_token;
}

function signNowPrefillFields(lead: SignNowLead): Array<{ field_name: string; prefilled_text: string }> {
  const values: Record<string, string> = {
    legalName: lead.legalName,
    ownerName: lead.ownerName,
    email: lead.email,
    phone: lead.phone,
    requestedAmount: lead.requestedAmount,
    useOfFunds: lead.useOfFunds,
  };
  const raw = process.env.SIGNNOW_FIELD_MAP;
  if (!raw) return [];
  let map: Record<string, string>;
  try {
    map = JSON.parse(raw) as Record<string, string>;
  } catch {
    return [];
  }
  return Object.entries(map)
    .map(([templateField, leadKey]) => ({ field_name: templateField, prefilled_text: values[leadKey] ?? '' }))
    .filter((f) => f.prefilled_text !== '');
}

async function signNowFetch(token: string, path: string, init: RequestInit) {
  return fetch(`${signNowBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

/** Best-effort: copy template, prefill, send role-based e-sign invite. Never throws. */
async function generateApplicationDocument(lead: SignNowLead): Promise<{ status: SignNowStatus; detail?: string }> {
  if (!isSignNowConfigured()) return { status: 'skipped', detail: 'signNow env not configured' };
  const templateId = process.env.SIGNNOW_TEMPLATE_ID as string;
  try {
    const token = await signNowToken();

    const copyRes = await signNowFetch(token, `/template/${templateId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ document_name: `Funding Application - ${lead.legalName || lead.ownerName || 'Applicant'}` }),
    });
    if (!copyRes.ok) throw new Error(`copy template (${copyRes.status}): ${await copyRes.text()}`);
    const documentId = ((await copyRes.json()) as { id?: string }).id;
    if (!documentId) throw new Error('signNow copy returned no document id.');

    const prefill = signNowPrefillFields(lead);
    if (prefill.length) {
      const prefillRes = await signNowFetch(token, `/v2/documents/${documentId}/prefill-texts`, {
        method: 'POST',
        body: JSON.stringify({ fields: prefill }),
      });
      if (!prefillRes.ok) console.error(`signNow prefill failed (${prefillRes.status}): ${await prefillRes.text()}`);
    }

    const docRes = await signNowFetch(token, `/document/${documentId}`, { method: 'GET' });
    if (!docRes.ok) throw new Error(`load document (${docRes.status}): ${await docRes.text()}`);
    const doc = (await docRes.json()) as { roles?: Array<{ role_id?: string; name?: string }> };
    const roles = doc.roles || [];
    const preferredRole = process.env.SIGNNOW_SIGNER_ROLE;
    const role = (preferredRole && roles.find((r) => r.name === preferredRole)) || roles[0];
    if (!role) throw new Error('signNow template has no roles to invite.');

    const fromEmail = process.env.SIGNNOW_FROM_EMAIL || process.env.SIGNNOW_USERNAME || '';
    const inviteRes = await signNowFetch(token, `/document/${documentId}/invite`, {
      method: 'POST',
      body: JSON.stringify({
        to: [{ email: lead.email, role_id: role.role_id || '', role: role.name || 'Signer', order: 1 }],
        from: fromEmail,
        subject: 'Complete your business funding application',
        message: 'Please review and sign your funding application to continue.',
      }),
    });
    if (!inviteRes.ok) throw new Error(`send invite (${inviteRes.status}): ${await inviteRes.text()}`);

    return { status: 'sent' };
  } catch (error) {
    console.error('signNow document generation failed.', error);
    return { status: 'error', detail: error instanceof Error ? error.message : 'unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Lean lead-capture endpoint
// ---------------------------------------------------------------------------

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

  // Body may arrive parsed (object) or raw (string) depending on the runtime.
  let payload: Payload = {};
  const rawBody = req.body;
  if (rawBody && typeof rawBody === 'object') payload = rawBody as Payload;
  else if (typeof rawBody === 'string' && rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody) as Payload;
    } catch {
      return res.status(400).json({ error: 'Invalid request body.' });
    }
  }

  if (asString(payload, 'honeypot')) {
    return res.status(400).json({ error: 'Request could not be submitted.' });
  }

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

  const lead: SignNowLead = { legalName, ownerName, email, phone, requestedAmount, useOfFunds };

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

  if (error) return res.status(500).json({ error: error.message });

  const leadId = data.id as string;

  let signing: { status: SignNowStatus; detail?: string } = { status: 'skipped' };
  if (isSignNowConfigured()) signing = await generateApplicationDocument(lead);

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
