// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import SetPassword from './SetPassword';
const updateUser = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { updateUser } } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const session = { user: { id: 'rep-1' } } as Session;
it('lets an invited rep set a password before entering the CRM', async () => {
  updateUser.mockResolvedValue({ error: null });
  const completed = vi.fn();
  render(<MemoryRouter><SetPassword session={session} onComplete={completed} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'MyNewPassword123!' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'MyNewPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect(await screen.findByText(/password saved/i)).toBeTruthy();
  expect(updateUser).toHaveBeenCalledWith({ password: 'MyNewPassword123!' });
  fireEvent.click(screen.getByRole('button', { name: /continue to crm/i }));
  expect(completed).toHaveBeenCalledOnce();
});
it('blocks expired links from submitting passwords', () => {
  render(<MemoryRouter><SetPassword session={null} onComplete={vi.fn()} /></MemoryRouter>);
  expect(screen.getByText(/expired|invalid/i)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save password' })).toBeNull();
});
it('keeps the user on setup when saving fails', async () => {
  updateUser.mockResolvedValue({ error: new Error('Password is too weak') });
  const completed = vi.fn();
  render(<MemoryRouter><SetPassword session={session} onComplete={completed} /></MemoryRouter>);
  for (const label of ['New password', 'Confirm password']) fireEvent.change(screen.getByLabelText(label), { target: { value: 'WeakPassword' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Password is too weak');
  expect(completed).not.toHaveBeenCalled();
});
it('rejects mismatched passwords without a network request', async () => {
  render(<MemoryRouter><SetPassword session={session} onComplete={vi.fn()} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Password1234' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Different123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Passwords do not match.');
  expect(updateUser).not.toHaveBeenCalled();
});
