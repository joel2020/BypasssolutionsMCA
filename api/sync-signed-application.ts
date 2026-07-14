import { createClient } from '@supabase/supabase-js';

/**
 * Pulls the executed Bypass application back onto the deal.
 *
 * Once the merchant signs the application we sent them, this downloads the
 * signed PDF from signNow and attaches it to the opportunity. That signed
 * document is what makes the application genuinely Bypass's — it is the thing a
 * funder is entitled to rely on.
 *
 * Safe to call repeatedly: it no-ops until the document is actually signed, and
 * won't attach the same signed copy twice.
 */

const BUCKET = 'application-documents';
const SIGNED_DOC_TYPE = 'Signed Bypass Application';

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};

function signNowBase() {
  return (process.env.SIGNNOW_API_BASE || 'https://api.signnow.com').replace(/\/+$/, '');
}

async function signNow(path: string, init: RequestInit = {}) {
  const res = await fetch(`${signNowBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.SIGNNOW_API_KEY}`, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`signNow ${path} (${res.status}): ${await res.text()}`);
  return res;
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
    return res.status(500).json({ error: 'Server is not configured.' });
  }
  if (!process.env.SIGNNOW_API_KEY) {
    return res.status(500).json({ error: 'signNow is not configured.' });
  }

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

  const documentId = String((lead as Record<string, unknown>).signnow_document_id || '');
  if (!documentId) {
    return res.status(200).json({ ok: true, signed: false, reason: 'No application has been sent for signature yet.' });
  }

  try {
    const docRes = await signNow(`/document/${documentId}`);
    const doc = (await docRes.json()) as {
      signatures?: unknown[];
      field_invites?: Array<{ status?: string }>;
    };

    const signed =
      (doc.signatures?.length ?? 0) > 0 ||
      (doc.field_invites ?? []).some((i) => (i.status || '').toLowerCase() === 'fulfilled');

    if (!signed) {
      return res.status(200).json({ ok: true, signed: false, reason: 'The merchant has not signed it yet.' });
    }

    // Already attached? Don't duplicate.
    const { data: existing } = await admin
      .from('documents')
      .select('id')
      .eq('lead_id', leadId)
      .eq('doc_type', SIGNED_DOC_TYPE)
      .limit(1);
    if (existing && existing.length > 0) {
      return res.status(200).json({ ok: true, signed: true, alreadyAttached: true, documentId: existing[0].id });
    }

    // Download the executed copy (flattened, with the signature).
    const pdfRes = await signNow(`/document/${documentId}/download?type=collapsed`);
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `leads/${leadId}/signed-bypass-application-${stamp}.pdf`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const businessName = String((lead as Record<string, unknown>).business_name || 'Applicant');
    const { data: docRow, error: docError } = await admin
      .from('documents')
      .insert({
        lead_id: leadId,
        doc_type: SIGNED_DOC_TYPE,
        document_type: SIGNED_DOC_TYPE,
        file_name: `Signed Bypass Application - ${businessName}.pdf`,
        file_size: bytes.length,
        storage_path: path,
        file_path: path,
        status: 'Approved',
        uploaded_by: userData.user.id,
      })
      .select('id')
      .single();
    if (docError) throw docError;

    await admin.from('leads').update({ signnow_signed_at: new Date().toISOString() }).eq('id', leadId);

    return res.status(200).json({ ok: true, signed: true, documentId: docRow.id });
  } catch (err) {
    console.error('sync-signed-application failed', err);
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Unable to check the signature status.' });
  }
}
