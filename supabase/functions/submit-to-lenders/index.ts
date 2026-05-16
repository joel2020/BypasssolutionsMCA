import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { badRequest, corsHeaders, decryptJson, getSupabaseAdmin, jsonResponse, money, text } from '../_shared/public-intake.ts';

type SubmitPayload = {
  applicationId?: string;
  leadId?: string | null;
  fundingPartnerIds?: string[];
  includedDocumentIds?: string[];
  notes?: string;
};

type SensitiveApplication = {
  full_ein?: string;
  full_ssn?: string;
  business?: Record<string, unknown>;
  bank_reference?: Record<string, unknown>;
  owner?: Record<string, unknown>;
  funding_request?: Record<string, unknown>;
  existing_financing?: Array<Record<string, unknown>>;
  documents?: Array<Record<string, unknown>>;
  consent?: Record<string, unknown>;
};

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : money(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount || 0);
}

function line(label: string, value: unknown) {
  const clean = text(value, 800);
  return `${label}: ${clean || 'Not provided'}`;
}

function snapshotValue(primary: unknown, fallback: unknown = '') {
  return text(primary ?? fallback, 800);
}

async function currentUser(req: Request, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data: auth, error } = await supabase.auth.getUser(token);
  if (error || !auth.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'active' || !['admin', 'underwriter', 'sales_rep'].includes(profile.role)) return null;
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  return { authUserId: auth.user.id, profileId: userProfile?.id || null };
}

async function sendEmail(input: { to: string; subject: string; body: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('EMAIL_PROVIDER_API_KEY');
  const from = Deno.env.get('LENDER_EMAIL_FROM') || Deno.env.get('EMAIL_FROM') || 'submissions@elitefundingsolution.com';

  if (!apiKey) {
    return { status: 'queued_provider_not_configured', messageId: null, error: null };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.body,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: 'send_failed', messageId: null, error: text(result?.message || result?.error || response.statusText, 500) };
  }

  return { status: 'sent', messageId: text(result?.id, 180) || null, error: null };
}

function buildPacket(args: {
  application: Record<string, unknown>;
  lead: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  owner: Record<string, unknown> | null;
  underwriting: Record<string, unknown> | null;
  documents: Array<Record<string, unknown>>;
  sensitive: SensitiveApplication | null;
  notes?: string;
}) {
  const sensitive = args.sensitive || {};
  const business = sensitive.business || {};
  const owner = sensitive.owner || {};
  const funding = sensitive.funding_request || {};
  const bank = sensitive.bank_reference || {};
  const financing = sensitive.existing_financing || [];

  const legalName = snapshotValue(business.legal_name, args.company?.legal_name || args.lead?.business_name);
  const requestedAmount = args.application.requested_amount || args.lead?.funding_amount_requested || funding.requested_amount;
  const monthlyRevenue = args.application.monthly_revenue || args.lead?.monthly_revenue || funding.monthly_revenue;

  const snapshot = {
    business: {
      legal_name: legalName,
      dba: snapshotValue(business.dba, args.company?.dba),
      ein: snapshotValue(sensitive.full_ein, args.company?.ein_last_four ? `***-**${args.company.ein_last_four}` : ''),
      entity_type: snapshotValue(business.entity_type, args.company?.entity_type),
      merchant_type: snapshotValue(business.merchant_type, args.lead?.merchant_type),
      start_date: snapshotValue(business.start_date, args.company?.start_date),
      address: snapshotValue(business.address, args.company?.business_address),
      phone: snapshotValue(business.phone, args.company?.phone || args.lead?.business_phone),
      email: snapshotValue(business.email, args.company?.email || args.lead?.business_email),
      website: snapshotValue(business.website, args.company?.website || args.lead?.website),
      industry: snapshotValue(business.industry, args.company?.industry || args.lead?.industry),
      products_services_sold: snapshotValue(business.products_services_sold, args.lead?.products_services_sold),
    },
    owner: {
      full_name: snapshotValue(owner.full_name, args.owner?.full_name || args.lead?.owner_full_name),
      ownership_percentage: snapshotValue(owner.ownership_percentage, args.owner?.ownership_percentage || args.lead?.ownership_pct),
      email: snapshotValue(owner.email, args.owner?.email || args.lead?.email),
      phone: snapshotValue(owner.phone, args.owner?.phone || args.lead?.phone),
      date_of_birth: snapshotValue(owner.date_of_birth, args.owner?.dob || args.lead?.owner_dob),
      ssn: snapshotValue(sensitive.full_ssn, args.owner?.ssn_last_four ? `***-**${args.owner.ssn_last_four}` : ''),
      home_address: snapshotValue(owner.home_address, args.owner?.home_address || args.lead?.owner_home_address),
      credit_score_range: snapshotValue(owner.credit_score_range, args.lead?.credit_score_range),
    },
    bank_reference: {
      bank_name: snapshotValue(bank.bank_name, args.lead?.current_bank),
      account_type: snapshotValue(bank.account_type, args.lead?.bank_account_type),
    },
    funding_request: {
      requested_amount: Number(requestedAmount || 0),
      monthly_revenue: Number(monthlyRevenue || 0),
      average_monthly_sales: Number(funding.average_monthly_sales || args.lead?.average_monthly_sales || 0),
      use_of_funds: snapshotValue(funding.use_of_funds, args.application.use_of_funds || args.lead?.use_of_funds),
      desired_timeline: snapshotValue(funding.desired_timeline, args.lead?.desired_timeline || args.lead?.urgency),
    },
    existing_financing: financing,
    underwriting: args.underwriting || {},
    documents: args.documents.map((doc) => ({
      id: doc.id,
      file_name: doc.file_name,
      document_type: doc.document_type || doc.doc_type,
      storage_path: doc.storage_path || doc.file_path,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      status: doc.status,
    })),
    consent: sensitive.consent || {},
    notes: text(args.notes, 1500),
  };

  const documentLines = snapshot.documents.map((doc) => `- ${doc.document_type}: ${doc.file_name} (${doc.storage_path})`).join('\n') || '- No documents selected';
  const financingLines = financing.length
    ? financing.map((record) => `- ${snapshotValue(record.lender_name)} | Balance ${formatMoney(record.current_balance)} | Payment ${formatMoney(record.payment_amount)} ${snapshotValue(record.payment_frequency)} | ${snapshotValue(record.status)}`).join('\n')
    : '- No active or recent revenue-based financing disclosed';

  const subject = `Funding submission: ${legalName} for ${formatMoney(requestedAmount)}`;
  const body = [
    'Elite Funding Solutions lender submission',
    '',
    line('Business legal name', snapshot.business.legal_name),
    line('DBA', snapshot.business.dba),
    line('EIN', snapshot.business.ein),
    line('Entity type', snapshot.business.entity_type),
    line('Merchant type', snapshot.business.merchant_type),
    line('Business started', snapshot.business.start_date),
    line('Industry', snapshot.business.industry),
    line('Products/services', snapshot.business.products_services_sold),
    line('Business address', snapshot.business.address),
    line('Business phone', snapshot.business.phone),
    line('Business email', snapshot.business.email),
    '',
    line('Owner', snapshot.owner.full_name),
    line('Ownership', snapshot.owner.ownership_percentage),
    line('Owner email', snapshot.owner.email),
    line('Owner phone', snapshot.owner.phone),
    line('DOB', snapshot.owner.date_of_birth),
    line('SSN', snapshot.owner.ssn),
    line('Home address', snapshot.owner.home_address),
    line('Credit score range', snapshot.owner.credit_score_range),
    '',
    line('Requested amount', formatMoney(snapshot.funding_request.requested_amount)),
    line('Monthly gross revenue', formatMoney(snapshot.funding_request.monthly_revenue)),
    line('Average monthly sales', formatMoney(snapshot.funding_request.average_monthly_sales)),
    line('Use of funds', snapshot.funding_request.use_of_funds),
    line('Desired timeline', snapshot.funding_request.desired_timeline),
    '',
    line('Bank reference', snapshot.bank_reference.bank_name),
    line('Account type', snapshot.bank_reference.account_type),
    '',
    'Existing financing',
    financingLines,
    '',
    'Included documents',
    documentLines,
    '',
    line('Submission notes', snapshot.notes),
    '',
    'Disclosure: Elite Funding Solutions is a commercial funding marketplace, not a bank. This package is shared under the applicant authorization and consent stored in the CRM.',
  ].join('\n');

  return { subject, body, snapshot };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, errors: ['Method not allowed.'] }, 405);

  try {
    const supabase = getSupabaseAdmin();
    const user = await currentUser(req, supabase);
    if (!user) return jsonResponse(req, { ok: false, errors: ['Unauthorized.'] }, 401);

    const payload = await req.json() as SubmitPayload;
    if (!payload.applicationId) return badRequest(req, ['Application ID is required.']);
    const partnerIds = Array.isArray(payload.fundingPartnerIds) ? payload.fundingPartnerIds.filter(Boolean) : [];
    if (partnerIds.length === 0) return badRequest(req, ['At least one funding partner is required.']);

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', payload.applicationId)
      .single();
    if (applicationError) throw applicationError;

    const leadId = payload.leadId || application.lead_id || null;
    const [{ data: lead }, { data: company }, { data: owner }, { data: underwriting }, { data: sensitiveRecord }, { data: documents }, { data: partners }] = await Promise.all([
      leadId ? supabase.from('leads').select('*').eq('id', leadId).maybeSingle() : Promise.resolve({ data: null }),
      application.company_id ? supabase.from('companies').select('*').eq('id', application.company_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('owners').select('*').eq('application_id', payload.applicationId).limit(1).maybeSingle(),
      supabase.from('application_underwriting').select('*').eq('application_id', payload.applicationId).limit(1).maybeSingle(),
      supabase.from('application_sensitive_data').select('*').eq('application_id', payload.applicationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('documents').select('*').eq('application_id', payload.applicationId).in('id', payload.includedDocumentIds?.length ? payload.includedDocumentIds : ['00000000-0000-0000-0000-000000000000']),
      supabase.from('funding_partners').select('*').in('id', partnerIds),
    ]);

    const sensitive = sensitiveRecord?.encrypted_payload
      ? await decryptJson<SensitiveApplication>(sensitiveRecord.encrypted_payload)
      : null;
    const selectedDocuments = documents || [];
    const emailFrom = Deno.env.get('LENDER_EMAIL_FROM') || Deno.env.get('EMAIL_FROM') || 'submissions@elitefundingsolution.com';
    const results = [];

    for (const partner of partners || []) {
      const packet = buildPacket({
        application,
        lead,
        company,
        owner,
        underwriting,
        documents: selectedDocuments,
        sensitive,
        notes: payload.notes,
      });

      const partnerEmail = text(partner.email, 240);
      const sendResult = partnerEmail
        ? await sendEmail({ to: partnerEmail, subject: packet.subject, body: packet.body })
        : { status: 'missing_recipient', messageId: null, error: 'Funding partner has no email address.' };
      const status = sendResult.status === 'sent' ? 'Submitted' : 'Prepared';

      const { data: submission, error: submissionError } = await supabase.from('partner_submissions').insert({
        application_id: payload.applicationId,
        funding_partner_id: partner.id,
        submitted_by: user.profileId,
        status,
        submitted_at: new Date().toISOString(),
        notes: text(payload.notes, 1500) || null,
        included_document_ids: selectedDocuments.map((doc) => doc.id),
        package_snapshot: { ...packet.snapshot, funding_partner: { id: partner.id, name: partner.name, contact_name: partner.contact_name, email: partner.email } },
        email_subject: packet.subject,
        email_body: packet.body,
        email_status: sendResult.status,
        email_sent_at: sendResult.status === 'sent' ? new Date().toISOString() : null,
        email_provider_message_id: sendResult.messageId,
        email_error: sendResult.error,
      }).select('id').single();
      if (submissionError) throw submissionError;

      await supabase.from('communications').insert({
        lead_id: leadId,
        application_id: payload.applicationId,
        direction: 'outbound',
        channel: 'Email',
        subject: packet.subject,
        body: packet.body,
        recipient: partnerEmail || text(partner.name, 180),
        sender: emailFrom,
        status: sendResult.status,
        related_template: 'lender_submission',
        sent_by: user.authUserId,
        created_by: user.authUserId,
      });

      results.push({ partnerId: partner.id, submissionId: submission.id, emailStatus: sendResult.status });
    }

    await supabase.from('activity_logs').insert({
      application_id: payload.applicationId,
      lead_id: leadId,
      user_id: user.authUserId,
      action: 'lender_submission_sent',
      metadata: {
        funding_partner_ids: partnerIds,
        included_document_ids: selectedDocuments.map((doc) => doc.id),
        results,
      },
    });

    return jsonResponse(req, { ok: true, results });
  } catch (error) {
    console.error('submit-to-lenders failed', error instanceof Error ? error.message : error);
    return jsonResponse(req, { ok: false, errors: ['Lender submission is temporarily unavailable.'] }, 500);
  }
});
