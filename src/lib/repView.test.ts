import { describe, expect, it } from 'vitest';
import { belongsToRep, validRepView } from './repView';
import type { Profile } from './supabase';

const admin = { id: 'admin', role: 'admin', status: 'active' } as Profile;
const rep = { id: 'roman', full_name: 'Roman', email: 'roman@example.test', role: 'sales_rep', status: 'active' } as Profile;

describe('rep view boundaries', () => {
  it('accepts ID-only and legacy name assignments, but excludes other and unassigned records', () => {
    expect(belongsToRep(rep, 'roman', null)).toBe(true);
    expect(belongsToRep(rep, null, 'Roman')).toBe(true);
    expect(belongsToRep(rep, 'other', 'Other')).toBe(false);
    expect(belongsToRep(rep, null, 'Unassigned')).toBe(false);
    expect(belongsToRep({ ...rep, full_name: '' }, null, null)).toBe(false);
  });
  it('allows only an active admin to select an active sales rep', () => {
    expect(validRepView(admin, rep)).toBe(rep);
    for (const role of ['sales_rep', 'viewer', 'underwriter']) expect(validRepView({ ...admin, role } as Profile, rep)).toBeNull();
    expect(validRepView({ ...admin, status: 'disabled' }, rep)).toBeNull();
    expect(validRepView(admin, { ...rep, status: 'disabled' })).toBeNull();
    expect(validRepView(admin, admin)).toBeNull();
    expect(validRepView(null, rep)).toBeNull();
  });
});
