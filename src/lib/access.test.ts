import { describe, expect, it } from 'vitest';
import { canAccessRecord, canManageFunders, canSubmitToLender, isRestricted, type Actor } from './access';

const admin: Actor = { role: 'admin', name: 'Christopher Roman' };
const underwriter: Actor = { role: 'underwriter', name: 'Uma UW' };
const viewer: Actor = { role: 'viewer', name: 'Vic Viewer' };
const rep: Actor = { role: 'sales_rep', name: 'Sam Rep' };
const otherRep: Actor = { role: 'sales_rep', name: 'Other Rep' };

describe('record access', () => {
  it('admins and underwriters see every deal', () => {
    expect(canAccessRecord(admin, 'Sam Rep')).toBe(true);
    expect(canAccessRecord(admin, 'Unassigned')).toBe(true);
    expect(canAccessRecord(underwriter, 'Sam Rep')).toBe(true);
  });

  it('viewers can read across the book', () => {
    expect(canAccessRecord(viewer, 'Sam Rep')).toBe(true);
  });

  it('a rep sees their own deals', () => {
    expect(canAccessRecord(rep, 'Sam Rep')).toBe(true);
  });

  it("a rep CANNOT see another rep's deal", () => {
    expect(canAccessRecord(rep, 'Other Rep')).toBe(false);
    expect(canAccessRecord(otherRep, 'Sam Rep')).toBe(false);
  });

  it('a rep cannot see unassigned deals', () => {
    expect(canAccessRecord(rep, 'Unassigned')).toBe(false);
    expect(canAccessRecord(rep, '')).toBe(false);
    expect(canAccessRecord(rep, null)).toBe(false);
  });

  it('a signed-out / role-less user sees nothing', () => {
    expect(canAccessRecord({ role: null, name: '' }, 'Sam Rep')).toBe(false);
  });

  it('does not let a rep with a blank name match a blank assignee', () => {
    expect(canAccessRecord({ role: 'sales_rep', name: '' }, '')).toBe(false);
  });

  it('only sales_reps are restricted', () => {
    expect(isRestricted('sales_rep')).toBe(true);
    expect(isRestricted('admin')).toBe(false);
    expect(isRestricted('underwriter')).toBe(false);
    expect(isRestricted('viewer')).toBe(false);
  });
});

describe('admin-only powers (per Chris)', () => {
  it('only admins may manage funding partners', () => {
    expect(canManageFunders('admin')).toBe(true);
    expect(canManageFunders('underwriter')).toBe(false);
    expect(canManageFunders('sales_rep')).toBe(false);
    expect(canManageFunders('viewer')).toBe(false);
  });

  it('only admins may send deals to funders', () => {
    expect(canSubmitToLender('admin')).toBe(true);
    expect(canSubmitToLender('sales_rep')).toBe(false);
    expect(canSubmitToLender('underwriter')).toBe(false);
  });
});
