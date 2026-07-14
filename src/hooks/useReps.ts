import { supabase, type Profile } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

// Active CRM users who can be assigned to a lead/deal.
export function useReps() {
  return useSupabaseQuery<Profile[]>(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email,role,status')
      .in('role', ['admin', 'sales_rep', 'underwriter'])
      .order('full_name');
    if (error) throw error;
    return (data ?? []) as Profile[];
  }, [], []);
}
