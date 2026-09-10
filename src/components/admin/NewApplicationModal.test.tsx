// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NewApplicationModal from './NewApplicationModal';
const insert = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: 'creator' } }, error: null }) }, from: () => ({ insert }) } }));
vi.mock('../../hooks/useReps', () => ({ useReps: () => ({ data: [{ id: 'rep-1', full_name: 'New Rep', role: 'sales_rep', status: 'active' }] }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function fill() {
  for (const [label, value] of Object.entries({ 'Business name': 'Test business', 'First name': 'Test', 'Last name': 'Owner', Email: 'test@example.com', Phone: '2125550100', 'Requested amount': '25000' })) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
}
it('assigns a newly created lead to the selected rep UUID', async () => {
  insert.mockResolvedValue({ error: null }); const created = vi.fn();
  render(<NewApplicationModal onClose={vi.fn()} onCreated={created} />); fill();
  fireEvent.change(screen.getByLabelText('Assigned rep'), { target: { value: 'New Rep' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Lead' }));
  await waitFor(() => expect(created).toHaveBeenCalledOnce());
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: 'rep-1', assigned_rep: 'New Rep', created_by: 'creator', status: 'New Lead' }));
});
it('does not report success after a database rejection', async () => {
  insert.mockResolvedValue({ error: { message: 'Lead insert denied' } }); const created = vi.fn();
  render(<NewApplicationModal onClose={vi.fn()} onCreated={created} />); fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create Lead' }));
  expect(await screen.findByText('Lead insert denied')).toBeTruthy();
  expect(created).not.toHaveBeenCalled();
});
