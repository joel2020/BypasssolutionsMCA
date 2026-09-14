import type { FundingPartner } from './supabase';
import { resolveLenderRecipients } from '../../supabase/functions/_shared/lenderRecipients';

export interface FundingPartnerCriteria {
  submission_email: string | null;
  additional_cc_emails: string | null;
  portal_url: string | null;
  preferred_submission_method: 'email' | 'portal' | 'api' | 'manual';
  min_funding_amount: number | null;
  min_time_in_business_months: number | null;
  min_credit_score: number | null;
  max_existing_positions: number | null;
  max_negative_days: number | null;
  max_nsf_count: number | null;
  avg_approval_days: number | null;
  states_served: string[];
  restricted_states: string[];
  product_types: string[];
  restricted_industries: string[];
  required_documents: string[];
  criteria_notes: string | null;
  bonus_notes: string | null;
}

const numericFields = [
  ['minFunding', 'min_funding_amount', 'Minimum funding', false],
  ['minMonths', 'min_time_in_business_months', 'Minimum months in business', true],
  ['minCreditScore', 'min_credit_score', 'Minimum credit / FICO', true],
  ['maxPositions', 'max_existing_positions', 'Maximum existing positions', true],
  ['maxNegativeDays', 'max_negative_days', 'Maximum negative days', true],
  ['maxNsfCount', 'max_nsf_count', 'Maximum NSF count', true],
  ['avgApprovalDays', 'avg_approval_days', 'Average decision days', true],
] as const;

export function fundingPartnerForm(partner?: Partial<FundingPartner> | null) {
  const numberText = (value?: number | null) => value == null ? '' : String(value);
  return {
    name: partner?.name ?? '', contactName: partner?.contact_name ?? '',
    email: partner?.email ?? '', phone: partner?.phone ?? '',
    minRevenue: numberText(partner?.min_revenue), maxFunding: numberText(partner?.max_funding),
    industriesAccepted: (partner?.industries_accepted ?? []).join(', '),
    notes: partner?.notes ?? '', status: (partner?.status ?? 'Active') as 'Active' | 'Inactive',
    submissionEmail: partner?.submission_email ?? '', additionalCcEmails: partner?.additional_cc_emails ?? '',
    portalUrl: partner?.portal_url ?? '', preferredSubmissionMethod: (partner?.preferred_submission_method ?? 'email') as FundingPartnerCriteria['preferred_submission_method'],
    minFunding: numberText(partner?.min_funding_amount), minMonths: numberText(partner?.min_time_in_business_months),
    minCreditScore: numberText(partner?.min_credit_score), maxPositions: numberText(partner?.max_existing_positions),
    maxNegativeDays: numberText(partner?.max_negative_days), maxNsfCount: numberText(partner?.max_nsf_count),
    avgApprovalDays: numberText(partner?.avg_approval_days), statesServed: (partner?.states_served ?? []).join(', '),
    restrictedStates: (partner?.restricted_states ?? []).join(', '),
    productTypes: partner ? (partner.product_types ?? []).join(', ') : 'MCA, Revenue based financing',
    restrictedIndustries: (partner?.restricted_industries ?? []).join(', '),
    requiredDocuments: partner ? (partner.required_documents ?? []).join(', ') : 'completed_application, bank_statements, drivers_license',
    criteriaNotes: partner?.criteria_notes ?? '', bonusNotes: partner?.bonus_notes ?? '',
  };
}

export type FundingPartnerForm = ReturnType<typeof fundingPartnerForm>;

function csv(value: string) {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}

function email(value: string, label: string) {
  const trimmed = value.trim();
  if (trimmed && (trimmed.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(trimmed) || /[\r\n]/.test(value))) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return trimmed;
}

function number(value: string, label: string, integer = false) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isSafeInteger(parsed))) {
    throw new Error(`${label} must be a nonnegative ${integer ? 'whole ' : ''}number.`);
  }
  return parsed;
}

export function parseFundingPartnerForm(form: FundingPartnerForm) {
  const name = form.name.trim();
  if (!name) throw new Error('Partner name is required.');
  const contactEmail = email(form.email, 'contact email');
  const submissionEmail = email(form.submissionEmail, 'submission email');
  if (/[\r\n]/.test(form.additionalCcEmails)) throw new Error('Separate CC emails with commas, semicolons or spaces.');
  const ccEmails = [...new Set(form.additionalCcEmails.trim().split(/[,;\s]+/).filter(Boolean).map(value => email(value, 'CC email').toLowerCase()))];
  if (ccEmails.length > 20) throw new Error('Use no more than 20 additional CC addresses.');
  if (contactEmail || submissionEmail) resolveLenderRecipients({ email: contactEmail, submission_email: submissionEmail, additional_cc_emails: ccEmails.join(', ') });
  let portalUrl: string | null = form.portalUrl.trim() || null;
  if (portalUrl) {
    let parsed: URL;
    try { parsed = new URL(portalUrl); } catch { throw new Error('Enter a valid http or https portal URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Enter a valid http or https portal URL without credentials.');
    portalUrl = parsed.href;
  }
  if (!['email', 'portal', 'api', 'manual'].includes(form.preferredSubmissionMethod)) throw new Error('Choose a valid submission method.');
  if (!['Active', 'Inactive'].includes(form.status)) throw new Error('Choose a valid partner status.');
  const numeric = Object.fromEntries(numericFields.map(([key, column, label, integer]) => [column, number(form[key], label, integer)])) as Pick<FundingPartnerCriteria, typeof numericFields[number][1]>;
  if (numeric.min_credit_score != null && (numeric.min_credit_score < 300 || numeric.min_credit_score > 850)) throw new Error('Minimum credit / FICO must be between 300 and 850.');
  const maxFunding = number(form.maxFunding, 'Maximum funding');
  if (maxFunding != null && numeric.min_funding_amount != null && maxFunding < numeric.min_funding_amount) throw new Error('Maximum funding must be at least minimum funding.');
  const criteria: FundingPartnerCriteria = {
    ...numeric, submission_email: submissionEmail || null, additional_cc_emails: ccEmails.join(', ') || null,
    portal_url: portalUrl, preferred_submission_method: form.preferredSubmissionMethod,
    states_served: csv(form.statesServed.toUpperCase()), restricted_states: csv(form.restrictedStates.toUpperCase()),
    product_types: csv(form.productTypes), restricted_industries: csv(form.restrictedIndustries), required_documents: csv(form.requiredDocuments),
    criteria_notes: form.criteriaNotes.trim() || null, bonus_notes: form.bonusNotes.trim() || null,
  };
  return {
    name, contactName: form.contactName.trim(), email: contactEmail, phone: form.phone.trim(),
    minRevenue: number(form.minRevenue, 'Minimum monthly revenue') ?? 0, maxFunding: maxFunding ?? 0,
    industriesAccepted: csv(form.industriesAccepted), notes: form.notes.trim(), status: form.status, criteria,
  };
}
