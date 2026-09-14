import { supabase, type Lead, type Profile } from './supabase';
import { buildPayload } from './leadEditFields';

export function leadEditPayload(form: Record<string, string>, lead: Lead, reps: Profile[]) {
  const payload = buildPayload(form);
  if (payload.assigned_rep !== lead.assigned_rep) {
    const rep = reps.find((profile) => (profile.full_name || profile.email) === payload.assigned_rep);
    if (!rep && payload.assigned_rep !== 'Unassigned') throw new Error('Choose an active rep before saving.');
    // Clear the previous UUID owner when reassigning so they do not retain RLS access.
    payload.assigned_to = rep?.id ?? null;
  }
  return payload;
}

export async function updateLead(leadId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('leads').update(payload).eq('id', leadId).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('This lead could not be updated. It may have been removed or your access changed.');
}
