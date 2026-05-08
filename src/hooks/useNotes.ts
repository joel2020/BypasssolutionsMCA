import { supabase, type Note } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useNotes(leadId?: string) {
  return useSupabaseQuery<Note[]>(async () => {
    let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Note[];
  }, [], [leadId]);
}
