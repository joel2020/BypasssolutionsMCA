import { supabase, type Commission } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useCommissions() {
  return useSupabaseQuery<Commission[]>(async () => {
    const { data, error } = await supabase.from('commissions').select('*').order('funded_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Commission[];
  }, [], []);
}
