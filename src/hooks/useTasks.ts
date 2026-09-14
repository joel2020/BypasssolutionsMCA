import { supabase, type Task } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useRepView } from './useRepView';
import { belongsToRep } from '../lib/repView';

type ScopedTask = Task & { leads: { assigned_to?: string | null; assigned_rep?: string | null } | null };

export interface TaskFilters {
  status?: Task['status'] | 'All';
  assignedRep?: string | 'All';
  leadId?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const { target } = useRepView();
  const result = useSupabaseQuery<ScopedTask[]>(async () => {
    let query = supabase.from('tasks').select('*, leads(assigned_to, assigned_rep)').order('due_date', { ascending: true });
    if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.assignedRep && filters.assignedRep !== 'All') query = query.eq('assigned_rep', filters.assignedRep);
    if (filters.leadId) query = query.eq('lead_id', filters.leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ScopedTask[];
  }, [], [filters.status, filters.assignedRep, filters.leadId]);
  return { ...result, data: target ? result.data.filter((row) => row.lead_id
    ? row.leads && belongsToRep(target, row.leads.assigned_to, row.leads.assigned_rep)
    : belongsToRep(target, row.assigned_to, row.assigned_rep)) : result.data };
}
