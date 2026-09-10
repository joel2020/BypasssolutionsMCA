import { beforeEach, describe, expect, it, vi } from 'vitest';
import generate from '../api/generate-application';
import send from '../api/send-application';
import sync from '../api/sync-signed-application';
const fixture = vi.hoisted(() => ({ role: 'sales_rep', status: 'active', owner: 'someone-else', hasProfile: true, tokenValid: true, events: [] as string[] }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, key: string) => {
  const privileged = key === 'service-key';
  if (privileged) fixture.events.push('privileged-client');
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: fixture.tokenValid ? { id: 'rep-1' } : null }, error: null })) },
    from: (table: string) => {
      if (privileged) fixture.events.push(`privileged-${table}`);
      const result = table === 'profiles'
        ? { data: fixture.hasProfile ? { id: 'rep-1', role: fixture.role, status: fixture.status, full_name: 'Rep', email: 'rep@example.com' } : null, error: null }
        : { data: { id: 'lead-1', assigned_to: fixture.owner, assigned_rep: 'Another Rep', signnow_document_id: '' }, error: null };
      const query = { select: () => query, eq: () => query, single: async () => result, maybeSingle: async () => result };
      return query;
    },
    storage: { from: () => { throw new Error('Unauthorized storage reached'); } },
  };
} }));
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected external request')));
  Object.assign(fixture, { role: 'sales_rep', status: 'active', owner: 'someone-else', hasProfile: true, tokenValid: true, events: [] });
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  vi.stubEnv('SIGNNOW_API_KEY', 'test-key');
});
for (const [name, handler] of Object.entries({ generate, send, sync })) describe(name, () => {
  it.each(['other-rep', 'viewer', 'disabled', 'no-profile', 'invalid-session'])('blocks %s before privileged work', async (scenario) => {
    if (scenario === 'viewer') fixture.role = 'viewer';
    if (scenario === 'disabled') fixture.status = 'disabled';
    if (scenario === 'no-profile') fixture.hasProfile = false;
    if (scenario === 'invalid-session') fixture.tokenValid = false;
    const status = vi.fn().mockReturnValue({ json: vi.fn() });
    await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { leadId: 'lead-1' } }, { setHeader: vi.fn(), status });
    expect(status).toHaveBeenCalledWith(scenario === 'invalid-session' ? 401 : 403);
    expect(fixture.events).toEqual([]);
  });
});
it.each(['sales_rep', 'admin', 'underwriter'])('allows an authorized %s to check their application', async (role) => {
  fixture.role = role;
  fixture.owner = 'rep-1';
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  await sync({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { leadId: 'lead-1' } }, { setHeader: vi.fn(), status });
  expect(status).toHaveBeenCalledWith(200);
  expect(json).toHaveBeenCalledWith(expect.objectContaining({ signed: false }));
});
