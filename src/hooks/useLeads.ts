import { supabase, type Lead, type LeadStatus } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export interface LeadFilters {
  status?: LeadStatus | 'All';
  assignedRep?: string | 'All';
  source?: string | 'All';
}

export function useLeads(filters: LeadFilters = {}) {
  return useSupabaseQuery<Lead[]>(async () => {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.assignedRep && filters.assignedRep !== 'All') query = query.eq('assigned_rep', filters.assignedRep);
    if (filters.source && filters.source !== 'All') query = query.eq('source', filters.source);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Lead[];
  }, [], [filters.status, filters.assignedRep, filters.source]);
}
