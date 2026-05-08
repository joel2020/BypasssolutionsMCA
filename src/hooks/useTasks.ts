import { useCallback } from 'react';
import { supabase, type Task } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export interface TaskFilters {
  status?: Task['status'] | 'All';
  assignedRep?: string | 'All';
  leadId?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const fetchTasks = useCallback(async () => {
    let query = supabase.from('tasks').select('*').order('due_date', { ascending: true });
    if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status);
    if (filters.assignedRep && filters.assignedRep !== 'All') query = query.eq('assigned_rep', filters.assignedRep);
    if (filters.leadId) query = query.eq('lead_id', filters.leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Task[];
  }, [filters.status, filters.assignedRep, filters.leadId]);

  return useSupabaseQuery<Task[]>(fetchTasks, []);
}
