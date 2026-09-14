import { beforeEach, expect, it, vi } from 'vitest';
import { getCurrentUserRole } from './auth';
const mocks = vi.hoisted(() => ({ profile: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('./supabase', () => ({ isSupabaseConfigured: true, supabase: {
  auth: { getUser: mocks.getUser }, rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
} }));
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'new' } }, error: null }); });
it('enrolls a new company member before reloading the authoritative CRM profile', async () => {
  mocks.profile.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: 'new', role: 'sales_rep', status: 'active' }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  expect(await getCurrentUserRole()).toMatchObject({ allowed: true, role: 'sales_rep' });
  expect(mocks.rpc).toHaveBeenCalledWith('enroll_company_crm_user');
});
it('does not auto-enroll or reactivate an existing disabled member', async () => {
  mocks.profile.mockResolvedValue({ data: { id: 'new', role: 'sales_rep', status: 'disabled' }, error: null });
  expect(await getCurrentUserRole()).toMatchObject({ allowed: false });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('denies a non-company user when enrollment is refused', async () => {
  mocks.profile.mockResolvedValue({ data: null, error: null }); mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect(await getCurrentUserRole()).toMatchObject({ allowed: false, profile: null });
});
it('fails closed if the enrollment service fails', async () => {
  mocks.profile.mockResolvedValue({ data: null, error: null }); mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
  expect(await getCurrentUserRole()).toMatchObject({ allowed: false, profile: null });
});
