import { supabase, type Lead, type LeadStatus } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export interface LeadFilters {
  status?: LeadStatus | 'All';
  assignedRep?: string | 'All';
  source?: string | 'All';
}

/**
 * The leads table carries redundant columns (funding_amount_requested vs
 * requested_amount, monthly_revenue vs gross_monthly_revenue/annual_revenue).
 * Some rows only populate one of each, which showed deals as "$0" in the CRM.
 * Normalise on read so a value is displayed whichever column holds it.
 */
function normaliseLead(row: Record<string, unknown>): Lead {
  const num = (key: string) => Number(row[key] ?? 0) || 0;
  const requested = num('funding_amount_requested') || num('requested_amount');
  const monthly =
    num('monthly_revenue') ||
    num('gross_monthly_revenue') ||
    (num('annual_revenue') ? Math.round(num('annual_revenue') / 12) : 0);

  return { ...(row as unknown as Lead), funding_amount_requested: requested, monthly_revenue: monthly };
}

export function useLeads(filters: LeadFilters = {}) {
  return useSupabaseQuery<Lead[]>(async () => {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.assignedRep && filters.assignedRep !== 'All') query = query.eq('assigned_rep', filters.assignedRep);
    if (filters.source && filters.source !== 'All') query = query.eq('source', filters.source);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => normaliseLead(row as Record<string, unknown>));
  }, [], [filters.status, filters.assignedRep, filters.source]);
}
