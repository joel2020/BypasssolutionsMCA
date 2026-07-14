import type { Lead } from './supabase';

/**
 * The `leads` table carries redundant amount columns:
 *   funding_amount_requested  vs  requested_amount
 *   monthly_revenue           vs  gross_monthly_revenue  vs  annual_revenue
 *
 * Different write paths populate different ones (the seed data only set
 * `requested_amount`/`annual_revenue`), which rendered real deals as "$0" in the
 * CRM. Normalise on read so a value shows up whichever column holds it.
 */
export function normaliseLead(row: Record<string, unknown>): Lead {
  const num = (key: string) => {
    const value = Number(row[key] ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const requested = num('funding_amount_requested') || num('requested_amount');
  const annual = num('annual_revenue');
  const monthly =
    num('monthly_revenue') ||
    num('gross_monthly_revenue') ||
    (annual ? Math.round(annual / 12) : 0);

  return {
    ...(row as unknown as Lead),
    funding_amount_requested: requested,
    monthly_revenue: monthly,
  };
}
