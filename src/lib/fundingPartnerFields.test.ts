import { describe, expect, it } from 'vitest';
import { fundingPartnerForm, parseFundingPartnerForm } from './fundingPartnerFields';

const form = () => ({ ...fundingPartnerForm(), name: ' Example Funding ' });

describe('funding partner fields', () => {
  it('keeps unset criteria nullable and permits manual routing without email', () => {
    const result = parseFundingPartnerForm({ ...form(), preferredSubmissionMethod: 'manual' });
    expect(result.name).toBe('Example Funding');
    expect(result.criteria).toMatchObject({ submission_email: null, additional_cc_emails: null, min_funding_amount: null, min_credit_score: null, max_nsf_count: null, preferred_submission_method: 'manual' });
    expect(result.criteria.product_types).toEqual(['MCA', 'Revenue based financing']);
  });

  it('round-trips zero numeric criteria and existing empty arrays without applying create defaults', () => {
    const saved = fundingPartnerForm({ name: 'Existing', max_existing_positions: 0, min_revenue: 0, product_types: [], required_documents: [] });
    expect(saved.maxPositions).toBe('0');
    expect(saved.minRevenue).toBe('0');
    expect(saved.productTypes).toBe('');
    expect(parseFundingPartnerForm(saved).criteria.max_existing_positions).toBe(0);
  });

  it('normalizes validated routing, CSV fields and optional notes', () => {
    const result = parseFundingPartnerForm({ ...form(), email: ' contact@example.com ', submissionEmail: ' submit@example.com ', additionalCcEmails: 'First@example.com; second@example.com FIRST@EXAMPLE.COM', portalUrl: 'https://portal.example.com', statesServed: 'ny, NJ, NY', restrictedStates: 'ca,tx', industriesAccepted: 'Retail, Construction', criteriaNotes: ' Criteria ', bonusNotes: ' Bonus ' });
    expect(result.email).toBe('contact@example.com');
    expect(result.industriesAccepted).toEqual(['Retail', 'Construction']);
    expect(result.criteria).toMatchObject({ submission_email: 'submit@example.com', additional_cc_emails: 'first@example.com, second@example.com', portal_url: 'https://portal.example.com/', states_served: ['NY', 'NJ'], restricted_states: ['CA', 'TX'], criteria_notes: 'Criteria', bonus_notes: 'Bonus' });
  });

  it.each(['email', 'submissionEmail', 'additionalCcEmails'] as const)('rejects malformed %s without silently dropping recipients', key => {
    expect(() => parseFundingPartnerForm({ ...form(), [key]: 'valid@example.com, invalid' })).toThrow(/valid.*email/);
    expect(() => parseFundingPartnerForm({ ...form(), [key]: 'a@example.com\r\nBcc: b@example.com' })).toThrow();
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'not a url'])('rejects unsafe portal URL %s', portalUrl => {
    expect(() => parseFundingPartnerForm({ ...form(), portalUrl })).toThrow(/portal URL/);
  });

  it.each([
    ['minFunding', '-1'], ['maxFunding', 'Infinity'], ['minRevenue', '-1'], ['minMonths', '1.5'],
    ['maxPositions', '-1'], ['maxNegativeDays', '1.5'], ['maxNsfCount', 'NaN'], ['avgApprovalDays', '0.5'],
    ['minCreditScore', '299'], ['minCreditScore', '851'],
  ] as const)('rejects invalid numeric %s=%s', (key, value) => {
    expect(() => parseFundingPartnerForm({ ...form(), [key]: value })).toThrow();
  });

  it('checks minimum/maximum consistency and allows fractional currency', () => {
    expect(() => parseFundingPartnerForm({ ...form(), minFunding: '100', maxFunding: '99' })).toThrow(/Maximum funding/);
    expect(parseFundingPartnerForm({ ...form(), minFunding: '100.25', maxFunding: '200.50', minCreditScore: '700' })).toMatchObject({ maxFunding: 200.5, criteria: { min_funding_amount: 100.25, min_credit_score: 700 } });
  });

  it('rejects whitespace-only names', () => {
    expect(() => parseFundingPartnerForm({ ...form(), name: ' ' })).toThrow(/name is required/);
  });

  it('rejects oversized CC lists even without a submission address', () => {
    const additionalCcEmails = Array.from({ length: 21 }, (_, i) => `rep${i}@example.com`).join(', ');
    expect(() => parseFundingPartnerForm({ ...form(), additionalCcEmails })).toThrow(/20 additional/);
  });
});
