import { useCurrentUser } from './useCurrentUser';

/**
 * Who can see what.
 *
 * A `sales_rep` only sees the leads/deals assigned to them (company-wide stats on
 * the Dashboard stay visible to everyone). Admins and underwriters see everything.
 *
 * NOTE: this is the UI layer. The authoritative enforcement is Supabase RLS —
 * until those policies are in place a determined rep could still query directly.
 */
export function useScope() {
  const { profile } = useCurrentUser();
  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';
  const restricted = role === 'sales_rep';
  const repName = profile?.full_name || profile?.email || '';

  /** True if this user may see/open a record assigned to `assignedRep`. */
  const canAccess = (assignedRep?: string | null) => !restricted || (assignedRep || '') === repName;

  return { profile, role, isAdmin, restricted, repName, canAccess };
}
