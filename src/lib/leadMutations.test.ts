import { beforeEach, expect, it, vi } from 'vitest';
import { leadEditPayload, updateLead } from './leadMutations';
import type { Lead, Profile } from './supabase';
const result = vi.hoisted(() => ({ data: null as { id: string } | null, error: null as { message: string } | null }));
vi.mock('./supabase', () => ({ supabase: { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => result }) }) }) }) } }));
beforeEach(() => { result.data = null; result.error = null; });
it('does not report a successful save when RLS updates no rows', async () => {
  await expect(updateLead('lead-1', { notes: 'New note' })).rejects.toThrow(/could not be updated/);
});
it('surfaces the database error text', async () => {
  result.error = { message: 'Permission denied' };
  await expect(updateLead('lead-1', {})).rejects.toThrow('Permission denied');
});
it('accepts a confirmed update', async () => {
  result.data = { id: 'lead-1' };
  await expect(updateLead('lead-1', {})).resolves.toBeUndefined();
});
it('replaces the previous rep UUID when an admin reassigns a lead', () => {
  const lead = { assigned_rep: 'Old rep', assigned_to: 'old' } as Lead;
  const rep = { id: 'new', full_name: 'New rep', status: 'active' } as Profile;
  expect(leadEditPayload({ assigned_rep: 'New rep' }, lead, [rep])).toMatchObject({ assigned_rep: 'New rep', assigned_to: 'new' });
  expect(leadEditPayload({ assigned_rep: 'Unassigned' }, lead, [])).toMatchObject({ assigned_to: null });
});
