import { supabase, type Funder } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useFunders() {
  return useSupabaseQuery<Funder[]>(async () => {
    const { data, error } = await supabase.from('funders').select('*').order('name');
    if (error) throw error;
    return (data ?? []) as Funder[];
  }, [], []);
}
