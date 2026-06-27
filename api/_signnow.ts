// signNow integration helper (server-only). Files prefixed with "_" are not
// routed by Vercel, so this is a private module imported by /api functions.
//
// Required env (set in Vercel → Settings → Environment Variables):
//   SIGNNOW_API_KEY        A signNow API token usable directly as a Bearer token.
//                          (Alternatively use the OAuth password grant vars below.)
//   SIGNNOW_TEMPLATE_ID    The template the application document is copied from.
//
// Optional env:
//   SIGNNOW_API_BASE       Defaults to https://api.signnow.com (use
//                          https://api-eval.signnow.com for the sandbox).
//   SIGNNOW_CLIENT_BASIC   base64(client_id:client_secret) — only needed if you
//   SIGNNOW_USERNAME       authenticate with the OAuth password grant instead of
//   SIGNNOW_PASSWORD       a direct API token.
//   SIGNNOW_SIGNER_ROLE    Template role name to invite (defaults to the first role).
//   SIGNNOW_FROM_EMAIL     "from" address on the signing invite (defaults to the
//                          authenticated account email / SIGNNOW_USERNAME).
//   SIGNNOW_FIELD_MAP      JSON object mapping signNow template field names to the
//                          lead keys to prefill, e.g.
//                          {"business_name":"legalName","amount":"requestedAmount"}.

export interface SignNowLead {
  legalName: string;
  ownerName: string;
  email: string;
  phone: string;
  requestedAmount: string;
  useOfFunds: string;
}

export interface SignNowResult {
  status: 'sent' | 'skipped' | 'error';
  documentId?: string;
  detail?: string;
}

function apiBase() {
  return (process.env.SIGNNOW_API_BASE || 'https://api.signnow.com').replace(/\/+$/, '');
}

export function isSignNowConfigured() {
  return Boolean(
    process.env.SIGNNOW_TEMPLATE_ID &&
      (process.env.SIGNNOW_API_KEY ||
        (process.env.SIGNNOW_CLIENT_BASIC && process.env.SIGNNOW_USERNAME && process.env.SIGNNOW_PASSWORD)),
  );
}

async function getAccessToken(): Promise<string> {
  // Preferred: a long-lived API token used directly as a Bearer token.
  if (process.env.SIGNNOW_API_KEY) return process.env.SIGNNOW_API_KEY;

  // Fallback: OAuth2 password grant.
  const body = new URLSearchParams({
    grant_type: 'password',
    username: process.env.SIGNNOW_USERNAME || '',
    password: process.env.SIGNNOW_PASSWORD || '',
  });
  const res = await fetch(`${apiBase()}/oauth2/token`, {
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

function buildFieldValues(lead: SignNowLead): Record<string, string> {
  // Default lead values available for prefill, keyed by lead field name.
  return {
    legalName: lead.legalName,
    ownerName: lead.ownerName,
    email: lead.email,
    phone: lead.phone,
    requestedAmount: lead.requestedAmount,
    useOfFunds: lead.useOfFunds,
  };
}

function resolvePrefillFields(lead: SignNowLead): Array<{ field_name: string; prefilled_text: string }> {
  const values = buildFieldValues(lead);
  const raw = process.env.SIGNNOW_FIELD_MAP;
  if (!raw) return [];
  let map: Record<string, string>;
  try {
    map = JSON.parse(raw) as Record<string, string>;
  } catch {
    return [];
  }
  return Object.entries(map)
    .map(([templateField, leadKey]) => ({
      field_name: templateField,
      prefilled_text: values[leadKey] ?? '',
    }))
    .filter((f) => f.prefilled_text !== '');
}

async function authedFetch(token: string, path: string, init: RequestInit) {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/**
 * Creates a document from the configured template, prefills any mapped fields,
 * and emails the applicant a signing invite. Best-effort: never throws — returns
 * a status so the caller can still capture the lead if signNow has a hiccup.
 */
export async function generateApplicationDocument(lead: SignNowLead): Promise<SignNowResult> {
  if (!isSignNowConfigured()) return { status: 'skipped', detail: 'signNow env not configured' };

  const templateId = process.env.SIGNNOW_TEMPLATE_ID as string;
  try {
    const token = await getAccessToken();

    // 1) Copy the template into a new document.
    const copyRes = await authedFetch(token, `/template/${templateId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ document_name: `Funding Application - ${lead.legalName || lead.ownerName || 'Applicant'}` }),
    });
    if (!copyRes.ok) throw new Error(`copy template (${copyRes.status}): ${await copyRes.text()}`);
    const documentId = ((await copyRes.json()) as { id?: string }).id;
    if (!documentId) throw new Error('signNow copy returned no document id.');

    // 2) Prefill mapped text fields (best-effort; skipped if no field map set).
    const prefillFields = resolvePrefillFields(lead);
    if (prefillFields.length) {
      const prefillRes = await authedFetch(token, `/v2/documents/${documentId}/prefill-texts`, {
        method: 'POST',
        body: JSON.stringify({ fields: prefillFields }),
      });
      if (!prefillRes.ok) {
        // Non-fatal: the applicant can still complete the fields in signNow.
        console.error(`signNow prefill failed (${prefillRes.status}): ${await prefillRes.text()}`);
      }
    }

    // 3) Resolve the signer role from the document, then send a role-based invite.
    const docRes = await authedFetch(token, `/document/${documentId}`, { method: 'GET' });
    if (!docRes.ok) throw new Error(`load document (${docRes.status}): ${await docRes.text()}`);
    const doc = (await docRes.json()) as { roles?: Array<{ unique_id?: string; role_id?: string; name?: string }> };
    const roles = doc.roles || [];
    const preferredRole = process.env.SIGNNOW_SIGNER_ROLE;
    const role = (preferredRole && roles.find((r) => r.name === preferredRole)) || roles[0];
    if (!role) throw new Error('signNow template has no roles to invite.');

    const fromEmail = process.env.SIGNNOW_FROM_EMAIL || process.env.SIGNNOW_USERNAME || '';
    const inviteRes = await authedFetch(token, `/document/${documentId}/invite`, {
      method: 'POST',
      body: JSON.stringify({
        to: [
          {
            email: lead.email,
            role_id: role.role_id || '',
            role: role.name || 'Signer',
            order: 1,
            prefill_signature_name: lead.ownerName || undefined,
          },
        ],
        from: fromEmail,
        subject: 'Complete your business funding application',
        message: 'Please review and sign your funding application to continue.',
      }),
    });
    if (!inviteRes.ok) throw new Error(`send invite (${inviteRes.status}): ${await inviteRes.text()}`);

    return { status: 'sent', documentId };
  } catch (error) {
    console.error('signNow document generation failed.', error);
    return { status: 'error', detail: error instanceof Error ? error.message : 'unknown error' };
  }
}
