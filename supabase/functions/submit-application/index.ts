import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { badRequest, clientIp, corsHeaders, encryptJson, getSupabaseAdmin, isEmail, jsonResponse, lastFour, money, onlyDigits, text } from '../_shared/public-intake.ts';

const CONSENT_VERSION = 'website-application-consent-2026-05-16';
const CONSENT_TEXT = 'By submitting this application, you certify that the information provided is accurate and authorize Elite Funding Solutions and its funding partners to review the application, documents, business credit, owner background, and related funding information for commercial funding options. Submission does not guarantee approval or funding.';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg']);

type UploadedDoc = {
  bucket: string;
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  docType: string;
};

type FinancingRecord = {
  lenderName?: string;
  originalAmount?: string;
  currentBalance?: string;
  paymentAmount?: string;
  paymentFrequency?: string;
  status?: string;
};

type ApplicationPayload = Record<string, unknown> & {
  documents?: UploadedDoc[];
  financingRecords?: FinancingRecord[];
};

function extension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function validatePayload(payload: ApplicationPayload) {
  const errors: string[] = [];
  const requiredText = [
    ['legalName', 'Business legal name'],
    ['entityType', 'Entity type'],
    ['merchantType', 'Merchant type'],
    ['startDate', 'Date business started'],
    ['businessAddress', 'Business location'],
    ['businessCity', 'City'],
    ['businessState', 'State'],
    ['businessZip', 'ZIP'],
    ['businessPhone', 'Business phone'],
    ['businessEmail', 'Business email'],
    ['productsSold', 'Products or services sold'],
    ['industry', 'Industry'],
    ['bankName', 'Bank name'],
    ['ownerFirstName', 'Owner first name'],
    ['ownerLastName', 'Owner last name'],
    ['ownerEmail', 'Owner email'],
    ['ownerPhone', 'Owner phone or mobile'],
    ['dateOfBirth', 'Date of birth'],
    ['homeAddress', 'Home address'],
    ['homeCity', 'City'],
    ['homeState', 'State'],
    ['homeZip', 'ZIP'],
    ['requestedAmount', 'Amount requested'],
    ['useOfFunds', 'Use of funds'],
    ['averageMonthlySales', 'Average monthly sales'],
    ['monthlyRevenue', 'Monthly gross revenue'],
    ['desiredTimeline', 'Desired timeline'],
    ['hasExistingFinancing', 'Existing financing answer'],
    ['signedLegalName', 'Signed legal name'],
    ['signatureDate', 'Signature date'],
  ];

  for (const [key, label] of requiredText) {
    if (!text(payload[key])) errors.push(`${label} is required.`);
  }

  if (onlyDigits(payload.ein).length !== 9) errors.push('Full 9-digit EIN is required.');
  if (onlyDigits(payload.ssn).length !== 9) errors.push('Full 9-digit SSN is required.');
  if (payload.businessEmail && !isEmail(payload.businessEmail)) errors.push('Business email is invalid.');
  if (payload.ownerEmail && !isEmail(payload.ownerEmail)) errors.push('Owner email is invalid.');

  const ownership = Number(payload.ownershipPercentage);
  if (!ownership || ownership < 1 || ownership > 100) errors.push('Ownership percentage must be 1 to 100.');
  if (money(payload.requestedAmount) <= 0) errors.push('Amount requested must be numeric.');
  if (money(payload.averageMonthlySales) <= 0) errors.push('Average monthly sales must be numeric.');
  if (money(payload.monthlyRevenue) <= 0) errors.push('Monthly gross revenue must be numeric.');

  for (const key of ['certifyConsent', 'creditAuthorization', 'sharingAuthorization', 'esignConsent', 'privacyConsent']) {
    if (payload[key] !== true) errors.push(`${key} is required.`);
  }

  if (payload.hasExistingFinancing === 'Yes') {
    const records = Array.isArray(payload.financingRecords) ? payload.financingRecords : [];
    const hasCompleteRecord = records.some((record) =>
      text(record.lenderName)
      && (money(record.originalAmount) > 0 || money(record.currentBalance) > 0)
      && money(record.paymentAmount) > 0
      && text(record.paymentFrequency)
      && text(record.status)
    );
    if (!hasCompleteRecord) errors.push('At least one complete existing financing record is required.');
  }

  const docs = Array.isArray(payload.documents) ? payload.documents : [];
  const bankStatements = docs.filter((doc) => doc.docType === 'bank_statement');
  const governmentIds = docs.filter((doc) => doc.docType === 'government_id');
  if (bankStatements.length < 3) errors.push('At least 3 bank statements are required.');
  if (governmentIds.length < 1) errors.push('Driver license or government-issued ID is required.');

  for (const doc of docs) {
    if (doc.bucket !== 'application-documents') errors.push('Invalid document bucket.');
    if (!text(doc.path, 500) || !text(doc.fileName, 180)) errors.push('Document metadata is incomplete.');
    if (!allowedMimeTypes.has(doc.mimeType)) errors.push(`Unsupported file type: ${doc.fileName}`);
    if (!allowedExtensions.has(extension(doc.fileName))) errors.push(`Unsupported file extension: ${doc.fileName}`);
    if (!doc.fileSize || doc.fileSize > MAX_FILE_SIZE) errors.push(`File is too large: ${doc.fileName}`);
  }

  return errors;
}

function fullBusinessAddress(payload: ApplicationPayload) {
  return [
    text(payload.businessAddress, 240),
    text(payload.businessCity, 80),
    text(payload.businessState, 40),
    text(payload.businessZip, 20),
  ].filter(Boolean).join(', ');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, errors: ['Method not allowed.'] }, 405);

  try {
    const payload = await req.json() as ApplicationPayload;
    if (payload.bot_field) return jsonResponse(req, { ok: true });

    const validationErrors = validatePayload(payload);
    if (validationErrors.length) return badRequest(req, validationErrors);

    const supabase = getSupabaseAdmin();
    const documents = payload.documents || [];

    for (const doc of documents) {
      const { data, error } = await supabase.storage.from('application-documents').list(doc.path.split('/').slice(0, -1).join('/'), {
        search: doc.path.split('/').pop(),
        limit: 1,
      });
      if (error) throw error;
      if (!data?.some((item) => item.name === doc.path.split('/').pop())) {
        return badRequest(req, [`Uploaded document was not found: ${doc.fileName}`]);
      }
    }

    const submittedAt = new Date().toISOString();
    const ownerFullName = `${text(payload.ownerFirstName)} ${text(payload.ownerLastName)}`.trim();
    const businessEmail = text(payload.businessEmail, 180).toLowerCase();
    const ownerEmail = text(payload.ownerEmail, 180).toLowerCase();
    const monthlyRevenue = money(payload.monthlyRevenue);
    const requestedAmount = money(payload.requestedAmount);
    const averageMonthlySales = money(payload.averageMonthlySales);
    const financingSummary = payload.hasExistingFinancing === 'Yes'
      ? (payload.financingRecords || []).map((record) => ({
        lender_name: text(record.lenderName),
        original_amount: money(record.originalAmount),
        current_balance: money(record.currentBalance),
        payment_amount: money(record.paymentAmount),
        payment_frequency: text(record.paymentFrequency),
        status: text(record.status),
      }))
      : [];
    const currentMcaBalances = financingSummary.reduce((total, record) => total + Number(record.current_balance || 0), 0);
    const currentDailyPayments = financingSummary
      .filter((record) => record.payment_frequency.toLowerCase() === 'daily')
      .reduce((total, record) => total + Number(record.payment_amount || 0), 0);
    const currentWeeklyPayments = financingSummary
      .filter((record) => record.payment_frequency.toLowerCase() === 'weekly')
      .reduce((total, record) => total + Number(record.payment_amount || 0), 0);

    await encryptJson({ preflight: 'application-sensitive-data' });

    const { data, error } = await supabase.from('leads').insert({
      business_name: text(payload.legalName),
      legal_name: text(payload.legalName),
      dba: text(payload.dba),
      business_address: fullBusinessAddress(payload),
      business_city: text(payload.businessCity, 80),
      business_state: text(payload.businessState, 40),
      business_zip: text(payload.businessZip, 20),
      business_phone: text(payload.businessPhone, 40),
      business_email: businessEmail,
      website: text(payload.website, 180),
      ein_last_four: lastFour(payload.ein),
      entity_type: text(payload.entityType),
      merchant_type: text(payload.merchantType),
      start_date: text(payload.startDate),
      products_services_sold: text(payload.productsSold, 500),
      industry: text(payload.industry),
      state: text(payload.businessState, 40),
      current_bank: text(payload.bankName),
      bank_account_type: text(payload.accountType),
      monthly_revenue: monthlyRevenue,
      gross_monthly_revenue: monthlyRevenue,
      net_monthly_deposits: averageMonthlySales,
      average_monthly_sales: averageMonthlySales,
      annual_revenue: monthlyRevenue * 12,
      funding_amount_requested: requestedAmount,
      requested_amount: requestedAmount,
      first_name: text(payload.ownerFirstName),
      last_name: text(payload.ownerLastName),
      owner_full_name: ownerFullName,
      owner_dob: text(payload.dateOfBirth),
      ssn_last_four: lastFour(payload.ssn),
      owner_home_address: [text(payload.homeAddress, 240), text(payload.homeCity, 80), text(payload.homeState, 40), text(payload.homeZip, 20)].filter(Boolean).join(', '),
      owner_city: text(payload.homeCity, 80),
      owner_state: text(payload.homeState, 40),
      owner_zip: text(payload.homeZip, 20),
      email: ownerEmail,
      phone: text(payload.ownerPhone, 40),
      credit_score_range: text(payload.creditScoreRange),
      ownership_pct: String(payload.ownershipPercentage || ''),
      use_of_funds: text(payload.useOfFunds),
      urgency: text(payload.desiredTimeline),
      desired_timeline: text(payload.desiredTimeline),
      existing_advances: payload.hasExistingFinancing === 'Yes',
      current_advances: text(payload.hasExistingFinancing),
      current_mca_balances: currentMcaBalances,
      current_daily_payments: currentDailyPayments,
      current_weekly_payments: currentWeeklyPayments,
      existing_financing_records: financingSummary,
      sms_opt_in: payload.smsOptIn === true,
      status: 'Application Started',
      source: 'Website',
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_version: CONSENT_VERSION,
      submitted_at: submittedAt,
      signature_name: text(payload.signedLegalName),
      signature_date: text(payload.signatureDate),
      user_agent: req.headers.get('user-agent') || text(payload.userAgent, 500),
    }).select('id').single();

    if (error) throw error;
    const leadId = data.id as string;

    const { data: companyData, error: companyError } = await supabase.from('companies').insert({
      legal_name: text(payload.legalName),
      dba: text(payload.dba),
      ein_last_four: lastFour(payload.ein),
      business_address: fullBusinessAddress(payload),
      phone: text(payload.businessPhone, 40),
      email: businessEmail,
      website: text(payload.website, 180),
      industry: text(payload.industry),
      entity_type: text(payload.entityType),
      start_date: text(payload.startDate),
    }).select('id').single();

    if (companyError) throw companyError;
    const companyId = companyData.id as string;

    const { data: applicationData, error: applicationError } = await supabase.from('applications').insert({
      lead_id: leadId,
      company_id: companyId,
      status: 'Submitted',
      source: 'Website',
      requested_amount: requestedAmount,
      use_of_funds: text(payload.useOfFunds),
      monthly_revenue: monthlyRevenue,
      annual_revenue: monthlyRevenue * 12,
      average_daily_balance: 0,
      nsfs_last_90_days: 0,
      current_advances: text(payload.hasExistingFinancing),
      submitted_at: submittedAt,
      duplicate_fingerprint: `${businessEmail}|${text(payload.businessPhone, 40)}|${lastFour(payload.ein)}|${text(payload.legalName).toLowerCase()}`,
    }).select('id').single();

    if (applicationError) throw applicationError;
    const applicationId = applicationData.id as string;

    const { data: ownerData, error: ownerError } = await supabase.from('owners').insert({
      application_id: applicationId,
      full_name: ownerFullName,
      ownership_percentage: Number(payload.ownershipPercentage),
      dob: text(payload.dateOfBirth),
      ssn_last_four: lastFour(payload.ssn),
      phone: text(payload.ownerPhone, 40),
      email: ownerEmail,
      home_address: [text(payload.homeAddress, 240), text(payload.homeCity, 80), text(payload.homeState, 40), text(payload.homeZip, 20)].filter(Boolean).join(', '),
      sms_opt_in: payload.smsOptIn === true,
    }).select('id').single();

    if (ownerError) throw ownerError;
    await supabase.from('applications').update({ owner_id: ownerData.id }).eq('id', applicationId);

    await supabase.from('application_underwriting').insert({
      application_id: applicationId,
      monthly_deposits: averageMonthlySales,
      average_daily_balance: 0,
      nsfs: 0,
      negative_days: 0,
      current_mca_balances: currentMcaBalances,
      current_daily_payments: currentDailyPayments,
      current_weekly_payments: currentWeeklyPayments,
      gross_monthly_revenue: monthlyRevenue,
      net_monthly_deposits: averageMonthlySales,
      number_of_deposits: 0,
      risk_notes: financingSummary.length ? `Existing financing records disclosed: ${financingSummary.length}` : null,
    });

    const encryptedPayload = await encryptJson({
      full_ein: onlyDigits(payload.ein),
      full_ssn: onlyDigits(payload.ssn),
      business: {
        legal_name: text(payload.legalName),
        dba: text(payload.dba),
        entity_type: text(payload.entityType),
        merchant_type: text(payload.merchantType),
        start_date: text(payload.startDate),
        address: fullBusinessAddress(payload),
        phone: text(payload.businessPhone, 40),
        email: businessEmail,
        website: text(payload.website, 180),
        products_services_sold: text(payload.productsSold, 500),
        industry: text(payload.industry),
      },
      bank_reference: {
        bank_name: text(payload.bankName),
        account_type: text(payload.accountType),
      },
      owner: {
        first_name: text(payload.ownerFirstName),
        last_name: text(payload.ownerLastName),
        full_name: ownerFullName,
        ownership_percentage: Number(payload.ownershipPercentage),
        email: ownerEmail,
        phone: text(payload.ownerPhone, 40),
        date_of_birth: text(payload.dateOfBirth),
        home_address: [text(payload.homeAddress, 240), text(payload.homeCity, 80), text(payload.homeState, 40), text(payload.homeZip, 20)].filter(Boolean).join(', '),
        credit_score_range: text(payload.creditScoreRange),
      },
      funding_request: {
        requested_amount: requestedAmount,
        use_of_funds: text(payload.useOfFunds),
        average_monthly_sales: averageMonthlySales,
        monthly_revenue: monthlyRevenue,
        desired_timeline: text(payload.desiredTimeline),
      },
      existing_financing: financingSummary,
      documents: documents.map((doc) => ({
        bucket: doc.bucket,
        path: doc.path,
        file_name: text(doc.fileName, 180),
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        doc_type: doc.docType,
      })),
      consent: {
        consent_version: CONSENT_VERSION,
        certified: payload.certifyConsent === true,
        credit_authorization: payload.creditAuthorization === true,
        sharing_authorization: payload.sharingAuthorization === true,
        esign_consent: payload.esignConsent === true,
        privacy_consent: payload.privacyConsent === true,
        sms_opt_in: payload.smsOptIn === true,
        signed_legal_name: text(payload.signedLegalName),
        signature_date: text(payload.signatureDate),
        submitted_at: submittedAt,
        ip_address: clientIp(req),
        user_agent: req.headers.get('user-agent') || text(payload.userAgent, 500),
      },
    });

    await supabase.from('application_sensitive_data').insert({
      lead_id: leadId,
      application_id: applicationId,
      encryption_version: 'aes-gcm-2026-05-16',
      encrypted_payload: encryptedPayload,
      ein_last_four: lastFour(payload.ein),
      ssn_last_four: lastFour(payload.ssn),
    });

    for (const doc of documents) {
      const safeName = text(doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '-'), 96);
      await supabase.from('documents').insert({
        lead_id: leadId,
        application_id: applicationId,
        file_name: safeName,
        doc_type: doc.docType,
        document_type: doc.docType,
        storage_path: doc.path,
        file_path: doc.path,
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        status: 'Pending',
      });
    }

    await supabase.from('consent_records').insert({
      lead_id: leadId,
      email: ownerEmail,
      ip_address: clientIp(req),
      consent_text: CONSENT_TEXT,
      consented_at: submittedAt,
      source: 'website_application',
      consent_version: CONSENT_VERSION,
      user_agent: req.headers.get('user-agent') || text(payload.userAgent, 500),
      metadata: {
        certify: payload.certifyConsent === true,
        credit_background_authorization: payload.creditAuthorization === true,
        sharing_authorization: payload.sharingAuthorization === true,
        esign_consent: payload.esignConsent === true,
        privacy_terms_application_acknowledgement: payload.privacyConsent === true,
        sms_opt_in: payload.smsOptIn === true,
      },
    });

    const internalAlertEmail = Deno.env.get('INTERNAL_APPLICATION_ALERT_EMAIL') || 'funding@elitefundingsolution.com';
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'info@elitefundingsolution.com';

    await supabase.from('communications').insert([
      { lead_id: leadId, application_id: applicationId, channel: 'Email', direction: 'outbound', subject: 'Application received', body: 'Applicant confirmation queued: Elite Funding Solutions received the funding application and documents for review.', recipient: ownerEmail, sender: emailFrom, status: 'queued', related_template: 'applicant_confirmation' },
      { lead_id: leadId, application_id: applicationId, channel: 'Email', direction: 'outbound', subject: `New funding application: ${text(payload.legalName)}`, body: `Internal alert queued for ${text(payload.legalName)}. Requested amount: ${requestedAmount}.`, recipient: internalAlertEmail, sender: 'system@elitefundingsolution.com', status: 'queued', related_template: 'internal_admin_alert' },
    ]);
    await supabase.from('activity_logs').insert({ lead_id: leadId, application_id: applicationId, action: 'application_submitted', metadata: { source: 'website', documents: documents.length, consent_version: CONSENT_VERSION } });

    return jsonResponse(req, { ok: true, leadId, applicationId, confirmationId: leadId.slice(0, 8).toUpperCase() });
  } catch (error) {
    console.error('submit-application failed', error instanceof Error ? error.message : error);
    return jsonResponse(req, { ok: false, errors: ['Application submission is temporarily unavailable.'] }, 500);
  }
});
