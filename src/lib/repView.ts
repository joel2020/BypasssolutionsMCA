import type { Profile } from './supabase';

export type RepIdentity = Pick<Profile, 'id' | 'full_name' | 'email'>;

// Match the database's ID-or-name ownership rule, including legacy assignments.
export function belongsToRep(rep: RepIdentity, assignedTo?: string | null, assignedRep?: string | null) {
  return assignedTo === rep.id || Boolean(rep.full_name && assignedRep === rep.full_name);
}

export function validRepView(actor: Profile | null, target: Profile | null) {
  return actor?.status === 'active' && actor.role === 'admin'
    && target?.status === 'active' && target.role === 'sales_rep' ? target : null;
}
