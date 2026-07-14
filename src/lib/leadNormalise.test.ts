import { describe, expect, it } from 'vitest';
import { normaliseLead } from './leadNormalise';

/**
 * Regression tests for the "$0 deals" bug: seed rows populated only
 * `requested_amount` / `annual_revenue`, while the CRM read
 * `funding_amount_requested` / `monthly_revenue`, so real deals rendered as $0.
 */
describe('normaliseLead', () => {
  it('prefers funding_amount_requested when it is set', () => {
    const lead = normaliseLead({ funding_amount_requested: 50_000, requested_amount: 99_999 });
    expect(lead.funding_amount_requested).toBe(50_000);
  });

  it('falls back to requested_amount when funding_amount_requested is 0', () => {
    const lead = normaliseLead({ funding_amount_requested: 0, requested_amount: 250_000 });
    expect(lead.funding_amount_requested).toBe(250_000);
  });

  it('falls back to requested_amount when funding_amount_requested is missing', () => {
    const lead = normaliseLead({ requested_amount: 75_000 });
    expect(lead.funding_amount_requested).toBe(75_000);
  });

  it('prefers monthly_revenue when set', () => {
    const lead = normaliseLead({ monthly_revenue: 20_000, annual_revenue: 1_200_000 });
    expect(lead.monthly_revenue).toBe(20_000);
  });

  it('falls back to gross_monthly_revenue', () => {
    const lead = normaliseLead({ monthly_revenue: 0, gross_monthly_revenue: 18_000 });
    expect(lead.monthly_revenue).toBe(18_000);
  });

  it('derives monthly revenue from annual_revenue when only that is set', () => {
    const lead = normaliseLead({ monthly_revenue: 0, annual_revenue: 4_920_000 });
    expect(lead.monthly_revenue).toBe(410_000);
  });

  it('returns 0 rather than NaN when nothing is set', () => {
    const lead = normaliseLead({});
    expect(lead.funding_amount_requested).toBe(0);
    expect(lead.monthly_revenue).toBe(0);
  });

  it('ignores junk / negative values instead of propagating them', () => {
    const lead = normaliseLead({ funding_amount_requested: 'abc', requested_amount: -5 });
    expect(lead.funding_amount_requested).toBe(0);
  });

  it('preserves the other lead fields', () => {
    const lead = normaliseLead({ business_name: 'Acme LLC', status: 'New Lead', requested_amount: 1000 });
    expect(lead.business_name).toBe('Acme LLC');
    expect(lead.status).toBe('New Lead');
  });
});
