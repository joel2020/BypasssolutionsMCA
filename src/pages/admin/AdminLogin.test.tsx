// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminLogin from './AdminLogin';
const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn(), signInWithOAuth: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, missingSupabaseMessage: '', initialAuthError: '', supabase: { auth } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('lets a rep request a recovery link to the password setup page', async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  render(<MemoryRouter><AdminLogin /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rep@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
  await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('rep@example.com', { redirectTo: `${window.location.origin}/admin/set-password` }));
  expect(await screen.findByText(/check your email/i)).toBeTruthy();
});
it('starts Google sign-in without requiring email or password and returns to the CRM', async () => {
  auth.signInWithOAuth.mockResolvedValue({ error: null });
  render(<MemoryRouter><AdminLogin /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
  await waitFor(() => expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin`, queryParams: { prompt: 'select_account' } } }));
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
});
it('shows Google provider failures and lets the user try again', async () => {
  auth.signInWithOAuth.mockRejectedValue(new Error('Google sign-in unavailable'));
  render(<MemoryRouter><AdminLogin /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Google sign-in unavailable');
  expect((screen.getByRole('button', { name: 'Sign in with Google' }) as HTMLButtonElement).disabled).toBe(false);
});
it('recovers the login button after a network exception', async () => {
  auth.signInWithPassword.mockRejectedValue(new Error('Network unavailable'));
  render(<MemoryRouter><AdminLogin /></MemoryRouter>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'rep@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret12345' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);
  expect(await screen.findByText('Network unavailable')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Sign In' }) as HTMLButtonElement).disabled).toBe(false);
});
