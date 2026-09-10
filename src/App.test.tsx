// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const authState = vi.hoisted(() => ({ setup: true, session: { user: { id: 'rep-1' } } as object | null }));
vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true, get isPasswordSetupLink() { return authState.setup; }, missingSupabaseMessage: '',
  supabase: { auth: { getSession: async () => ({ data: { session: authState.session } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) } },
}));
vi.mock('./lib/auth', () => ({ getCurrentUserRole: vi.fn(async () => ({ allowed: true })) }));
vi.mock('./pages/admin/SetPassword', () => ({ default: () => <h1>Password setup</h1> }));
vi.mock('./pages/admin/AdminLogin', () => ({ default: () => <h1>CRM sign in</h1> }));
vi.mock('./layouts/AdminLayout', () => ({ default: () => <h1>CRM dashboard</h1> }));
import App from './App';
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
