import { useCallback } from 'react';
import { supabase, type Funder } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useFunders() {
  const fetchFunders = useCallback(async () => {
    const { data, error } = await supabase.from('funders').select('*').order('name');
    if (error) throw error;
    return (data ?? []) as Funder[];
  }, []);

  return useSupabaseQuery<Funder[]>(fetchFunders, []);
}
