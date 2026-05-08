import { supabase, type ApplicationRecord } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useApplicationByLead(leadId?: string) {
  return useSupabaseQuery<ApplicationRecord | null>(async () => {
    if (!leadId) return null;

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as ApplicationRecord | null;
  }, null, [leadId]);
}
