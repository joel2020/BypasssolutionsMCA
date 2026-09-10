import { useCurrentUser } from './useCurrentUser';
import { canAccessRecord, canManageFunders, canSubmitToLender, isRestricted, type CrmRole } from '../lib/access';

/**
 * Who can see what, in the UI.
 *
 * The rules live in src/lib/access.ts (pure + unit tested) and mirror the
 * Supabase RLS policies. The database is the authority; this just keeps the UI
 * from showing controls the DB would reject.
 */
export function useScope() {
  const { profile } = useCurrentUser();
  const role = (profile?.status === 'active' ? profile.role : null) as CrmRole;
  const repName = profile?.full_name || profile?.email || '';
  const actor = { role, name: repName, id: profile?.id };

  return {
    profile,
    role,
    repName,
    isAdmin: role === 'admin',
    restricted: isRestricted(role),
    canAccess: (assignedRep?: string | null, assignedTo?: string | null) => canAccessRecord(actor, assignedRep, assignedTo),
    canManageFunders: canManageFunders(role),
    canSubmitToLender: canSubmitToLender(role),
  };
}
