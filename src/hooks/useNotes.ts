import { supabase, type Note } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useNotes(leadId?: string) {
  return useSupabaseQuery<Note[]>(async () => {
    if (!leadId) return [];
    const query = supabase.from('notes').select('*').eq('lead_id',leadId).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Note[];
  }, [], [leadId]);
}
