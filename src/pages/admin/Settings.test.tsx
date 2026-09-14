// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const gmail = vi.hoisted(() => ({ data: null as null | {status: string; gmail_email: string}, loading: false, error: null as string | null }));
vi.mock('../../hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ profile: null }) }));
vi.mock('../../hooks/useGmail', () => ({ getGmailConnection: vi.fn() }));
vi.mock('../../hooks/useSupabaseQuery', async () => {
  const { getGmailConnection } = await import('../../hooks/useGmail');
  return { useSupabaseQuery: (query: unknown) => query === getGmailConnection ? gmail : { data: [], loading: false, error: null, refetch: vi.fn() } };
});
import Settings from './Settings';
afterEach(() => { cleanup(); gmail.data = null; gmail.loading = false; gmail.error = null; });
function openIntegrations() { render(<Settings />); fireEvent.click(screen.getByRole('button', {name:'Integrations'})); }
it('does not claim Gmail is connected for an unconnected user', () => {
 openIntegrations(); expect(screen.queryByText('Connected', {exact:true})).toBeNull();
 expect(screen.getByRole('button', {name:'Connect Gmail'})).toBeTruthy();
});
it('shows the current connected mailbox', () => {
 gmail.data = {status:'connected',gmail_email:'rep@example.test'}; openIntegrations();
 expect(screen.getByText('rep@example.test')).toBeTruthy(); expect(screen.getByText('Connected',{exact:true})).toBeTruthy();
});
it('does not show a connected badge for disconnected or failed checks', () => {
 gmail.data = {status:'disconnected',gmail_email:'rep@example.test'}; gmail.error = 'Unable to check Gmail connection.'; openIntegrations();
 expect(screen.queryByText('Connected',{exact:true})).toBeNull(); expect(screen.getByText('Unable to check Gmail connection.')).toBeTruthy();
});
