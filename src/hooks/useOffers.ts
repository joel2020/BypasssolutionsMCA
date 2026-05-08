import { useCallback } from 'react';
import { supabase, type Offer } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useOffers(leadId?: string) {
  const fetchOffers = useCallback(async () => {
    let query = supabase.from('offers').select('*, leads(first_name, last_name, business_name)').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Offer[];
  }, [leadId]);

  return useSupabaseQuery<Offer[]>(fetchOffers, []);
}
