// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Calls from './Calls';
import SMS from './SMS';
const insert = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock('../../hooks/useSupabaseQuery', () => ({ useSupabaseQuery: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }) }));
vi.mock('../../hooks/useLeads', () => ({ useLeads: () => ({ data: [{ id: 'lead-1', business_name: 'Real business' }], loading: false, error: null }) }));
vi.mock('../../hooks/useScope', () => ({ useScope: () => ({ role: 'sales_rep', repName: 'Real Rep' }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('persists a call log against a real lead', async () => {
  insert.mockResolvedValue({ error: null });
  render(<Calls />);
  fireEvent.click(screen.getByRole('button', { name: 'Log Call' }));
  fireEvent.change(screen.getByLabelText('Lead'), { target: { value: 'lead-1' } });
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Requested statements' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save call' }));
  await waitFor(() => expect(insert).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 'lead-1', rep_name: 'Real Rep', notes: 'Requested statements' })));
  expect(await screen.findByText('Call saved.')).toBeTruthy();
});
it('shows database failure without claiming a saved call', async () => {
  insert.mockResolvedValue({ error: { message: 'Call insert denied' } });
  render(<Calls />); fireEvent.click(screen.getByRole('button', { name: 'Log Call' }));
  fireEvent.change(screen.getByLabelText('Lead'), { target: { value: 'lead-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save call' }));
  expect(await screen.findByText('Call insert denied')).toBeTruthy();
  expect(screen.queryByText('Call saved.')).toBeNull();
});
it('does not pretend to send SMS without a messaging provider', () => {
  render(<SMS />);
  expect(screen.getByText('SMS is not connected')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /send/i })).toBeNull();
  expect(screen.queryByText('Johnson Trucking')).toBeNull();
});
