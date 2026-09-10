import { beforeEach, expect, it, vi } from 'vitest';
import { createInviteHandler } from './handler';
const invite = vi.fn();
const reset = vi.fn();
const upsert = vi.fn();
const bootstrap = vi.fn();
let role = 'admin';
let status = 'active';
let signedIn = true;
let existing: { id: string; status: string } | null = null;
const createClient = ((_: string, key: string) => ({
  auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'admin-1' } : null }, error: null }), admin: { inviteUserByEmail: invite }, resetPasswordForEmail: reset },
  rpc: bootstrap,
  from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: key === 'service' ? existing : { role, status }, error: null }), upsert };
    return query;
  },
})) as unknown as Parameters<typeof createInviteHandler>[0];
const handler = createInviteHandler(createClient, (name) => ({ SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', APP_URL: 'https://crm.bypasssolution.com' })[name]);
const request = (body: object) => new Request('https://example.com', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) });
const member = { email: 'rep@example.com', full_name: 'Test Rep', role: 'sales_rep' };
beforeEach(() => {
  vi.resetAllMocks(); role = 'admin'; status = 'active'; signedIn = true; existing = null;
  invite.mockResolvedValue({ data: { user: { id: 'new-rep' } }, error: null });
  upsert.mockResolvedValue({ error: null }); reset.mockResolvedValue({ error: null });
  bootstrap.mockResolvedValue({ data: 'existing-rep', error: null });
});
it.each(['sales_rep', 'viewer', 'underwriter'])('denies invitations from %s', async (callerRole) => {
  role = callerRole;
  expect((await handler(request(member))).status).toBe(403);
  expect(invite).not.toHaveBeenCalled();
});
it('denies disabled admins and signed-out callers', async () => {
  status = 'disabled'; expect((await handler(request(member))).status).toBe(403);
  signedIn = false; expect((await handler(request(member))).status).toBe(401);
  expect(invite).not.toHaveBeenCalled();
});
it('sends new reps to the trusted password setup URL', async () => {
  expect((await handler(request({ ...member, redirect_to: 'https://untrusted.example' }))).status).toBe(200);
  expect(invite).toHaveBeenCalledWith(member.email, expect.objectContaining({ redirectTo: 'https://crm.bypasssolution.com/admin/set-password' }));
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-rep', role: 'sales_rep', status: 'active' }));
});
it('does not silently overwrite an existing CRM profile', async () => {
  existing = { id: 'existing-admin', status: 'active' };
  invite.mockResolvedValue({ data: {}, error: { code: 'email_exists', message: 'Already registered' } });
  expect((await handler(request(member))).status).toBe(409);
  expect(upsert).not.toHaveBeenCalled(); expect(bootstrap).not.toHaveBeenCalled();
});
it('recovers an Auth account left without a CRM profile', async () => {
  invite.mockResolvedValue({ data: {}, error: { code: 'email_exists', message: 'Already registered' } });
  expect((await handler(request(member))).status).toBe(200);
  expect(bootstrap).toHaveBeenCalledWith('bootstrap_crm_profile', { target_email: member.email, target_full_name: member.full_name, target_role: member.role });
  expect(reset).toHaveBeenCalledWith(member.email, { redirectTo: 'https://crm.bypasssolution.com/admin/set-password' });
});
it('resends access without changing an existing account role', async () => {
  existing = { id: 'existing-rep', status: 'active' };
  expect((await handler(request({ email: member.email, action: 'resend' }))).status).toBe(200);
  expect(reset).toHaveBeenCalledOnce(); expect(invite).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled();
});
it('reports failed profile persistence rather than successful onboarding', async () => {
  upsert.mockResolvedValue({ error: { message: 'Database unavailable' } });
  const response = await handler(request(member));
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining('Database unavailable') });
});
