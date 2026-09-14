// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const authState = vi.hoisted(() => ({ callback: null as null | ((event: string, session: object | null) => void), setup: true, session: { user: { id: 'rep-1' } } as object | null }));
vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true, get isPasswordSetupLink() { return authState.setup; }, missingSupabaseMessage: '',
  supabase: { auth: { getSession: async () => ({ data: { session: authState.session } }), onAuthStateChange: (callback: typeof authState.callback) => { authState.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; } } },
}));
vi.mock('./lib/auth', () => ({ getCurrentUserRole: vi.fn(async () => ({ allowed: true })) }));
vi.mock('./pages/admin/SetPassword', () => ({ default: () => <h1>Password setup</h1> }));
vi.mock('./pages/admin/AdminLogin', () => ({ default: () => <h1>CRM sign in</h1> }));
vi.mock('./layouts/AdminLayout', () => ({ default: () => <><h1>CRM dashboard</h1><input aria-label="Unsaved note" /></> }));
import App from './App';
import { getCurrentUserRole, type RoleCheckResult } from './lib/auth';
afterEach(cleanup);
it('keeps an invited authenticated rep on password setup instead of redirecting to the dashboard', async () => {
  window.history.replaceState({}, '', '/admin'); authState.setup = true;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Password setup' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'CRM dashboard' })).toBeNull();
});
it('serves the password route directly for emailed links', async () => {
  window.history.replaceState({}, '', '/admin/set-password'); authState.setup = false;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Password setup' })).toBeTruthy();
});
it('keeps unauthenticated users out of the CRM', async () => {
  window.history.replaceState({}, '', '/admin/dashboard'); authState.setup = false; authState.session = null;
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'CRM sign in' })).toBeTruthy();
});

it('preserves open CRM state while a refreshed session rechecks the same account', async () => {
  window.history.replaceState({}, '', '/admin/dashboard'); authState.setup = false; authState.session = { user: { id: 'rep-1' } };
  render(<App />);
  const input = await screen.findByRole('textbox', { name: 'Unsaved note' });
  fireEvent.change(input, { target: { value: 'Keep this draft' } });
  await act(async () => { authState.callback?.('SIGNED_IN', { user: { id: 'rep-1' }, access_token: 'refreshed' }); });
  expect(screen.getByRole('textbox', { name: 'Unsaved note' })).toBe(input);
  expect((input as HTMLInputElement).value).toBe('Keep this draft');
});

it('immediately hides CRM content for an account switch until the new role is checked', async () => {
  window.history.replaceState({}, '', '/admin/dashboard'); authState.setup = false; authState.session = { user: { id: 'rep-1' } };
  render(<App />); await screen.findByRole('heading', { name: 'CRM dashboard' });
  let finish!: (result: RoleCheckResult) => void;
  vi.mocked(getCurrentUserRole).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { authState.callback?.('SIGNED_IN', { user: { id: 'rep-2' } }); });
  expect(screen.queryByRole('heading', { name: 'CRM dashboard' })).toBeNull();
  await act(async () => { finish({ allowed: false, role: null, profile: null, reason: 'Inactive account' }); });
  expect(screen.queryByRole('heading', { name: 'CRM dashboard' })).toBeNull();
  expect(screen.getByText('Inactive account')).toBeTruthy();
});
it('removes CRM content when a refreshed account no longer has access', async () => {
  window.history.replaceState({}, '', '/admin/dashboard'); authState.setup = false; authState.session = { user: { id: 'rep-1' } };
  render(<App />); await screen.findByRole('heading', { name: 'CRM dashboard' });
  vi.mocked(getCurrentUserRole).mockResolvedValueOnce({ allowed: false, role: null, profile: null, reason: 'Access revoked' });
  await act(async () => { authState.callback?.('TOKEN_REFRESHED', { user: { id: 'rep-1' } }); });
  expect(screen.queryByRole('heading', { name: 'CRM dashboard' })).toBeNull();
  expect(screen.getByText('Access revoked')).toBeTruthy();
});
