import { createClient } from '@supabase/supabase-js';

type Payload = Record<string, unknown>;
type ApiRequest = { method?: string; body?: unknown };
type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => unknown };
};
type LeadRow = { id: string } & Record<string, unknown>;

function asString(payload: Payload, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Server portal access is not configured.');
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = (req.body || {}) as Payload;
    const confirmationId = asString(payload, 'confirmationId').toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 8);
    const email = asString(payload, 'email').toLowerCase();

    if (!confirmationId || confirmationId.length !== 8 || !email) {
      return res.status(400).json({ error: 'Enter a valid confirmation ID and email.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id,business_name,legal_name,first_name,last_name,email,business_email,phone,status,funding_amount_requested,requested_amount,use_of_funds,industry,submitted_at,created_at,underwriter_notes,risk_notes')
      .or(`email.eq.${email},business_email.eq.${email}`)
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    const lead = ((leads || []) as LeadRow[]).find((item) => String(item.id).replace(/-/g, '').slice(0, 8).toLowerCase() === confirmationId);
    if (!lead) return res.status(404).json({ error: 'No application found for that confirmation ID and email.' });

    const { data: docs } = await supabase
      .from('documents')
      .select('id,file_name,doc_type,document_type,status,uploaded_at,created_at,file_size,mime_type')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    return res.status(200).json({
      lead: {
        id: lead.id,
        confirmationId: String(lead.id).replace(/-/g, '').slice(0, 8).toUpperCase(),
        businessName: lead.business_name || lead.legal_name,
        ownerName: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        email: lead.email || lead.business_email,
        phone: lead.phone,
        status: lead.status || 'Application Received',
        requestedAmount: lead.requested_amount || lead.funding_amount_requested || 0,
        useOfFunds: lead.use_of_funds,
        industry: lead.industry,
        submittedAt: lead.submitted_at || lead.created_at,
        underwriterNotes: lead.underwriter_notes || '',
        riskNotes: lead.risk_notes || '',
      },
      documents: docs || [],
      requestedDocuments: [
        { type: 'bank_statement', label: '3 to 6 months business bank statements', required: true },
        { type: 'government_id', label: 'Government-issued ID', required: true },
        { type: 'voided_check', label: 'Voided check', required: true },
        { type: 'merchant_statement', label: 'Merchant processing statements, if applicable', required: false },
        { type: 'existing_advance_statement', label: 'Existing funding statements, if applicable', required: false },
        { type: 'other', label: 'Additional underwriting documents', required: false }
      ]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal lookup failed.';
    return res.status(500).json({ error: message });
  }
}
