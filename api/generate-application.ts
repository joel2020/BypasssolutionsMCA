import { APPLICATION_FIELDS, normalizeApplicationField } from '../src/lib/applicationImport.js';
import { getWritableLead } from '../server/crmAccess.js';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Generate a filled, unsigned Bypass application. Keep the original source unchanged. */

const BUCKET = 'application-documents';
const TEMPLATE_PATH = '_templates/bypass-application.pdf';
const PAGE_HEIGHT = 792;

/** Exact field boxes on the application, lifted from the signNow template. */
const FIELDS: Array<{ key: string; x: number; y: number; w: number }> = [
  { key: 'business_legal_name', x: 110, y: 131, w: 190 },
  { key: 'business_dba', x: 418, y: 131, w: 168 },
  { key: 'business_address', x: 97, y: 157, w: 203 },
  { key: 'business_city_state_zip', x: 380, y: 157, w: 206 },
  { key: 'business_phone', x: 122, y: 182, w: 178 },
  { key: 'business_email', x: 375, y: 182, w: 211 },
  { key: 'business_website', x: 58, y: 207, w: 242 },
  { key: 'business_ein', x: 395, y: 207, w: 191 },
  { key: 'business_start_date', x: 103, y: 232, w: 197 },
  { key: 'entity_type', x: 499, y: 232, w: 87 },
  { key: 'industry', x: 139, y: 257, w: 447 },
  { key: 'requested_amount', x: 149, y: 282, w: 59 },
  { key: 'use_of_funds', x: 309, y: 282, w: 94 },
  { key: 'gross_annual_revenue', x: 520, y: 282, w: 66 },
  { key: 'owner_full_name', x: 133, y: 329, w: 167 },
  { key: 'owner_title', x: 375, y: 329, w: 211 },
  { key: 'owner_ownership_pct', x: 131, y: 354, w: 77 },
  { key: 'owner_dob', x: 270, y: 354, w: 133 },
  { key: 'owner_ssn', x: 507, y: 354, w: 79 },
  { key: 'owner_mobile', x: 112, y: 379, w: 474 },
  { key: 'owner_home_address', x: 84, y: 404, w: 502 },
  { key: 'partner_full_name', x: 105, y: 451, w: 195 },
  { key: 'partner_title', x: 390, y: 451, w: 196 },
  { key: 'partner_ownership_pct', x: 153, y: 476, w: 47 },
  { key: 'partner_dob', x: 290, y: 476, w: 105 },
  { key: 'partner_ssn', x: 515, y: 476, w: 71 },
  { key: 'partner_phone', x: 126, y: 501, w: 460 },
  { key: 'partner_home_address', x: 96, y: 526, w: 490 },
];

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};
type Lead = Record<string, unknown>;

function str(lead: Lead, ...keys: string[]) {
  for (const key of keys) {
    const v = lead[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && v > 0) return String(v);
  }
  return '';
}

function money(lead: Lead, ...keys: string[]) {
  for (const key of keys) {
    const v = Number(lead[key] ?? 0);
    if (Number.isFinite(v) && v > 0) return `$${v.toLocaleString('en-US')}`;
  }
  return '';
}

function buildValues(lead: Lead): Record<string, string> {
  const ownerName = str(lead, 'owner_full_name') || `${str(lead, 'first_name')} ${str(lead, 'last_name')}`.trim();
  const cityStateZip = [str(lead, 'city'), str(lead, 'state'), str(lead, 'zip')].filter(Boolean).join(', ');
  const einLast4 = str(lead, 'ein_last_four');
  const ssnLast4 = str(lead, 'ssn_last_four');

  return {
    business_legal_name: str(lead, 'legal_name', 'business_name'),
    business_dba: str(lead, 'dba'),
    business_address: str(lead, 'business_address'),
    business_city_state_zip: cityStateZip,
    business_phone: str(lead, 'business_phone', 'phone'),
    business_email: str(lead, 'business_email', 'email'),
    business_website: str(lead, 'website'),
    // Use masked saved values unless reviewed full identifiers were supplied for this PDF.
    business_ein: einLast4 ? `XX-XXX${einLast4}` : '',
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
    owner_ssn: ssnLast4 ? `XXX-XX-${ssnLast4}` : '',
    owner_mobile: str(lead, 'phone'),
    owner_home_address: str(lead, 'owner_home_address'),
  };
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

  const authHeader = (req.headers?.authorization || req.headers?.Authorization) as string | undefined;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing CRM session.' });

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid CRM session.' });

  let body: { leadId?: string; sourceDocumentId?: string; identifiers?: { ein?: string; ssn?: string }; partner?: Record<string, unknown> };
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {};
  } catch { return res.status(400).json({ error: 'Invalid request body.' }); }
  const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
  if (!leadId) return res.status(400).json({ error: 'leadId is required.' });

  const identifiers: Record<string, string> = {};
  for (const key of ['ein', 'ssn'] as const) {
    const raw = body.identifiers?.[key];
    if (raw === undefined || raw === '') continue;
    if (typeof raw !== 'string' || !/^\d{9}$/.test(raw.replace(/[\s-]/g, ''))) return res.status(400).json({ error: 'Full EIN and SSN must contain nine digits.' });
    identifiers[key] = raw.replace(/[\s-]/g, '');
  }

  const partner: Record<string, string> = {};
  for (const field of APPLICATION_FIELDS.filter(field => field.key.startsWith('partner_'))) {
    const raw = body.partner?.[field.key];
    if (raw === undefined || raw === '') continue;
    const value = typeof raw === 'string' ? normalizeApplicationField(field, raw) : null;
    if (value === null) return res.status(400).json({ error: `Check ${field.label.toLowerCase()}.` });
    partner[field.key] = value;
  }

  const access = await getWritableLead(authClient, userData.user.id, leadId);
  if (!access.lead) return res.status(access.status).json({ error: access.error });
  if (body.sourceDocumentId) {
    if (typeof body.sourceDocumentId !== 'string') return res.status(400).json({ error: 'Invalid source document.' });
    const { data: source, error: sourceError } = await authClient.from('documents').select('id').eq('id', body.sourceDocumentId).eq('lead_id', leadId).maybeSingle();
    if (sourceError || !source) return res.status(403).json({ error: 'The source application is not available on this lead.' });
  }
  const lead = access.lead;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // 1) Load the blank Bypass application.
    const { data: blank, error: blankError } = await admin.storage.from(BUCKET).download(TEMPLATE_PATH);
    if (blankError || !blank) throw new Error('The blank Bypass application template is missing from storage.');

    // 2) Draw the lead's details onto it.
    const pdf = await PDFDocument.load(await blank.arrayBuffer());
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.getPages()[0];
    const values = { ...buildValues(lead as Lead), ...partner };
    // Full identifiers live only in this private PDF, not unmasked CRM columns or logs.
    if (identifiers.ein) values.business_ein = `${identifiers.ein.slice(0,2)}-${identifiers.ein.slice(2)}`;
    if (identifiers.ssn) values.owner_ssn = `${identifiers.ssn.slice(0,3)}-${identifiers.ssn.slice(3,5)}-${identifiers.ssn.slice(5)}`;

    let filled = 0;
    for (const field of FIELDS) {
      const text = values[field.key];
      if (!text) continue;

      // Shrink to fit rather than overflow the box.
      let size = 9;
      while (size > 5 && font.widthOfTextAtSize(text, size) > field.w - 2) size -= 0.5;

      page.drawText(text, {
        // signNow measures from the top-left; pdf-lib from the bottom-left.
        x: field.x + 1,
        y: PAGE_HEIGHT - field.y - 11,
        size,
        font,
        color: rgb(0.05, 0.09, 0.17),
      });
      filled += 1;
    }

    const bytes = await pdf.save();

    // 3) Store it against the deal.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `leads/${leadId}/bypass-application-${stamp}.pdf`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const fileName = `Bypass Application - ${str(lead as Lead, 'business_name') || 'Applicant'}.pdf`;
    const { data: docRow, error: docError } = await admin
      .from('documents')
      .insert({
        lead_id: leadId,
        doc_type: 'Bypass Application',
        document_type: 'Bypass Application',
        file_name: fileName,
        file_size: bytes.length,
        storage_path: path,
        file_path: path,
        status: 'Uploaded',
        uploaded_by: userData.user.id,
      })
      .select('id')
      .single();
    if (docError) {
      await admin.storage.from(BUCKET).remove([path]);
      throw new Error('Unable to attach the generated application. Please retry.');
    }

    return res.status(200).json({ ok: true, documentId: docRow.id, fileName, fieldsFilled: filled });
  } catch (err) {
    console.error('generate-application failed');
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Unable to generate the application.' });
  }
}
