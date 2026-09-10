/**
 * Who may see/open a given record, expressed as pure logic so it can be tested.
 *
 * This mirrors the Supabase RLS policies (`can_see_lead` / `can_write_lead`).
 * The database is the authority — this exists so the UI hides what the DB would
 * refuse, and so the rule is covered by tests.
 */
export type CrmRole = 'admin' | 'underwriter' | 'sales_rep' | 'viewer' | null;

export interface Actor {
  role: CrmRole;
  id?: string;
  /** profiles.full_name — leads store the rep by name in `assigned_rep`. */
  name: string;
}

/** Roles that only ever see records assigned to them. */
export function isRestricted(role: CrmRole): boolean {
  return role === 'sales_rep';
}

/** May this actor see a record assigned to `assignedRep`? */
export function canAccessRecord(actor: Actor, assignedRep?: string | null, assignedTo?: string | null): boolean {
  if (!actor.role) return false;
  if (!isRestricted(actor.role)) return true;
  if (actor.id && assignedTo === actor.id) return true;
  const owner = (assignedRep ?? '').trim();
  if (!owner || !actor.name.trim()) return false;
  return owner === actor.name;
}

/** May this actor manage funders / send deals to funders? Admins only. */
export function canManageFunders(role: CrmRole): boolean {
  return role === 'admin';
}

/** May this actor send a deal to a funder? Admins only. */
export function canSubmitToLender(role: CrmRole): boolean {
  return role === 'admin';
}
