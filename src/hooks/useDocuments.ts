import { supabase, type Document } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useDocuments(leadId?: string) {
  return useSupabaseQuery<Document[]>(async () => {
    let query = supabase.from('documents').select('*, leads(first_name, last_name, business_name)').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Document[];
  }, [], [leadId]);
}
