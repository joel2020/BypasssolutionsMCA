import type { SupabaseClient } from '@supabase/supabase-js';
import { canAccessRecord } from '../src/lib/access.js';

/** Validate the caller before using service-role credentials for documents or email. */
export async function getWritableLead(client: SupabaseClient, userId: string, leadId: string) {
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,role,status,full_name,email').eq('id', userId).maybeSingle();
  if (profileError || !profile || profile.status !== 'active' || !['admin', 'underwriter', 'sales_rep'].includes(profile.role)) {
    return { lead: null, status: 403, error: 'An active CRM account with write access is required.' };
  }
  // The caller's JWT is attached to this client, so RLS also applies to this lookup.
  const { data: lead, error: leadError } = await client.from('leads').select('*').eq('id', leadId).maybeSingle();
  if (leadError || !lead || !canAccessRecord({ id: userId, role: profile.role, name: profile.full_name || profile.email || '' }, lead.assigned_rep, lead.assigned_to)) {
    return { lead: null, status: 403, error: 'You do not have access to this lead.' };
  }
  return { lead, status: 200, error: null };
}
