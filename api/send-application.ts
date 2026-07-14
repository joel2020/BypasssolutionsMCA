import { createClient } from '@supabase/supabase-js';

// Generates the Bypass application in signNow from a CRM lead, prefills it,
// and emails the applicant an e-sign invite.
//
// Vercel env required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (read the lead)
//   SUPABASE_ANON_KEY                        (verify the caller's CRM session)
//   SIGNNOW_API_KEY                          (Bearer token for signNow)
// Optional:
//   SIGNNOW_TEMPLATE_ID  (defaults to the "Bypass Application - CRM" template)
//   SIGNNOW_API_BASE     (defaults to https://api.signnow.com)
//   SIGNNOW_FROM_EMAIL   (invite sender; defaults to the signNow account email)

const DEFAULT_TEMPLATE_ID = '34df2c26dd79457f8215bf99cb63fde692fd7c32';

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

type Lead = Record<string, unknown>;

function str(lead: Lead, ...keys: string[]) {
  for (const key of keys) {
    const value = lead[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && value > 0) return String(value);
  }
  return '';
}

function money(lead: Lead, ...keys: string[]) {
  for (const key of keys) {
    const value = lead[key];
    if (typeof value === 'number' && value > 0) return `$${value.toLocaleString('en-US')}`;
  }
  return '';
}

function signNowBase() {
  return (process.env.SIGNNOW_API_BASE || 'https://api.signnow.com').replace(/\/+$/, '');
}

async function signNow(path: string, init: RequestInit) {
  const res = await fetch(`${signNowBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.SIGNNOW_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`signNow ${path} (${res.status}): ${await res.text()}`);
  return res;
}

/** Maps a CRM lead onto the signNow template's named fields. */
function buildFields(lead: Lead) {
  const ownerName = str(lead, 'owner_full_name') || `${str(lead, 'first_name')} ${str(lead, 'last_name')}`.trim();
  const cityStateZip = [str(lead, 'city'), str(lead, 'state'), str(lead, 'zip')].filter(Boolean).join(', ');

  const map: Record<string, string> = {
    business_legal_name: str(lead, 'legal_name', 'business_name'),
    business_dba: str(lead, 'dba'),
    business_address: str(lead, 'business_address'),
    business_city_state_zip: cityStateZip,
    business_phone: str(lead, 'business_phone', 'phone'),
    business_email: str(lead, 'business_email', 'email'),
    business_website: str(lead, 'website'),
    business_start_date: str(lead, 'start_date'),
    entity_type: str(lead, 'entity_type'),
    industry: str(lead, 'industry'),
    requested_amount: money(lead, 'funding_amount_requested', 'requested_amount'),
    use_of_funds: str(lead, 'use_of_funds'),
    gross_annual_revenue: money(lead, 'annual_revenue'),
    owner_full_name: ownerName,
    owner_title: str(lead, 'owner_title'),
    owner_ownership_pct: str(lead, 'ownership_pct'),
    owner_dob: str(lead, 'owner_dob'),
    owner_mobile: str(lead, 'phone'),
    owner_home_address: str(lead, 'owner_home_address'),
    // EIN and SSN are intentionally left blank: we only store last-four, and we
    // don't want full tax IDs travelling through email. The signer fills them in.
  };

  return Object.entries(map)
    .filter(([, value]) => value !== '')
    .map(([field_name, prefilled_text]) => ({ field_name, prefilled_text }));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return res.status(500).json({ error: 'Server is not configured (Supabase credentials missing).' });
  }
  if (!process.env.SIGNNOW_API_KEY) {
    return res.status(500).json({ error: 'signNow is not configured (SIGNNOW_API_KEY missing).' });
  }

  // Only an authenticated CRM user may send an application.
  const authHeader = (req.headers?.authorization || req.headers?.Authorization) as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing CRM session.' });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid CRM session.' });

  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as { leadId?: string };
  const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
  if (!leadId) return res.status(400).json({ error: 'leadId is required.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: lead, error: leadError } = await admin.from('leads').select('*').eq('id', leadId).single();
  if (leadError || !lead) return res.status(404).json({ error: 'Lead not found.' });

  const signerEmail = str(lead as Lead, 'email', 'business_email');
  if (!signerEmail) return res.status(400).json({ error: 'This lead has no email address to send the application to.' });

  const templateId = process.env.SIGNNOW_TEMPLATE_ID || DEFAULT_TEMPLATE_ID;

  try {
    // 1) New document from the template.
    const copyRes = await signNow(`/template/${templateId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ document_name: `Bypass Application - ${str(lead as Lead, 'business_name') || 'Applicant'}` }),
    });
    const documentId = ((await copyRes.json()) as { id?: string }).id;
    if (!documentId) throw new Error('signNow returned no document id.');

    // 2) Prefill from the lead.
    const fields = buildFields(lead as Lead);
    if (fields.length) {
      await signNow(`/v2/documents/${documentId}/prefill-texts`, {
        method: 'PUT',
        body: JSON.stringify({ fields }),
      });
    }

    // 3) Send the e-sign invite to the applicant.
    const docRes = await signNow(`/document/${documentId}`, { method: 'GET' });
    const doc = (await docRes.json()) as { roles?: Array<{ role_id?: string; unique_id?: string; name?: string }> };
    const role = doc.roles?.[0];
    if (!role) throw new Error('Template has no signer role.');

    // NOTE: custom invite subject/message is a PAID signNow feature (error 65582
    // "Upgrade your subscription plan to personalize invite subject and message").
    // The account is on the free plan, so we send the invite without them.
    const fromEmail = process.env.SIGNNOW_FROM_EMAIL || 'roman@bypasssolution.com';
    await signNow(`/document/${documentId}/invite`, {
      method: 'POST',
      body: JSON.stringify({
        to: [{
          email: signerEmail,
          role_id: role.role_id || role.unique_id || '',
          role: role.name || 'Recipient 1',
          order: 1,
        }],
        from: fromEmail,
      }),
    });

    // 4) Record it on the lead.
    await admin.from('leads').update({ status: 'Application Started' }).eq('id', leadId);
    try {
      await admin.from('communications').insert({
        lead_id: leadId,
        channel: 'Email',
        direction: 'outbound',
        subject: 'Bypass application sent for signature',
        body: `signNow application generated and emailed to ${signerEmail} for e-signature.`,
        recipient: signerEmail,
        sender: fromEmail,
        status: 'sent',
      });
    } catch {
      // non-fatal
    }

    return res.status(200).json({ ok: true, documentId, sentTo: signerEmail, prefilled: fields.length });
  } catch (err) {
    console.error('signNow send failed', err);
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Unable to send the application.' });
  }
}
