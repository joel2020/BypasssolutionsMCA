import { supabase, type Funder } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useFunders() {
  return useSupabaseQuery<Funder[]>(async () => {
    const { data, error } = await supabase.from('funding_partners').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map((partner) => ({
      id: partner.id,
      created_at: partner.created_at,
      name: partner.name,
      contact_name: partner.contact_name ?? '',
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      min_revenue: Number(partner.min_revenue ?? 0),
      min_time_in_business: '',
      industries_accepted: partner.industries_accepted ?? [],
      states: 'All 50 states',
      max_funding: Number(partner.max_funding ?? 0),
      notes: partner.notes ?? '',
      status: partner.status ?? 'Active',
    })) as Funder[];
  }, [], []);
}
