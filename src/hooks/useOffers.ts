import { supabase, type Offer } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useRepView } from './useRepView';
import { belongsToRep } from '../lib/repView';

type ScopedOffer = Offer & { leads: { assigned_to?: string | null; assigned_rep?: string | null } | null };

export function useOffers(leadId?: string) {
  const { target } = useRepView();
  const result = useSupabaseQuery<ScopedOffer[]>(async () => {
    let query = supabase.from('offers').select('*, leads(first_name, last_name, business_name, assigned_to, assigned_rep)').order('created_at', { ascending: false });
    if (leadId) query = query.eq('lead_id', leadId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ScopedOffer[];
  }, [], [leadId]);
  return { ...result, data: target ? result.data.filter((row) => row.leads && belongsToRep(target, row.leads.assigned_to, row.leads.assigned_rep)) : result.data };
}
