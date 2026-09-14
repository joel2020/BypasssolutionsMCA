import { supabase, type Commission } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useRepView } from './useRepView';

export function useCommissions() {
  const { target } = useRepView();
  const result = useSupabaseQuery<Commission[]>(async () => {
    const { data, error } = await supabase.from('commissions').select('*').order('funded_date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Commission[];
  }, [], []);
  return { ...result, data: target ? result.data.filter((row) => Boolean(target.full_name && row.rep_name === target.full_name)) : result.data };
}
