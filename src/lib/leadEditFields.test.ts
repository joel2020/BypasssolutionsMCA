import { describe, expect, it } from 'vitest';
import { buildPayload, initialForm } from './leadEditFields';
import type { Lead } from './supabase';

describe('lead edit payload', () => {
  it('sends null for optional blank dates so Postgres accepts normal lead edits', () => {
    const payload = buildPayload({ business_name: 'Example business', start_date: '', owner_dob: ' ' });
    expect(payload.start_date).toBeNull();
    expect(payload.owner_dob).toBeNull();
  });
  it('keeps dates, mirrors amounts and preserves valid zero values', () => {
    expect(buildPayload({ start_date: '2020-01-02', funding_amount_requested: '25,000', monthly_revenue: '0' })).toMatchObject({ start_date: '2020-01-02', requested_amount: 25000, gross_monthly_revenue: 0 });
    expect(initialForm({ monthly_revenue: 0 } as Lead).monthly_revenue).toBe('0');
  });
  it.each(['-50', 'abc', '1.2.3', 'Infinity'])('rejects invalid funding amount %s instead of silently changing it', (amount) => {
    expect(() => buildPayload({ funding_amount_requested: amount })).toThrow();
  });
  it('rejects fractional NSF counts', () => {
    expect(() => buildPayload({ nsfs_last_90_days: '1.5' })).toThrow();
  });
});
it('preserves a negative average daily balance used in underwriting', () => {
  expect(buildPayload({ avg_daily_balance: '-150.50' }).avg_daily_balance).toBe(-150.50);
});
