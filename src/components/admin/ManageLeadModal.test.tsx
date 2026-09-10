// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ManageLeadModal from './ManageLeadModal';
import type { Lead } from '../../lib/supabase';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../lib/supabase', () => ({ supabase: { rpc, auth: { getUser: async () => ({ data: { user: { id: 'rep' } } }) }, from: () => ({ update: () => ({ eq: async () => ({ error: null }) }), insert: async () => ({ error: { message: 'Application insert denied' } }) }) } }));
vi.mock('../../hooks/useReps', () => ({ useReps: () => ({ data: [] }) }));
vi.mock('../../hooks/useDocuments', () => ({
  useDocuments: () => ({ data: [1,2,3,4].map((id) => ({ id: String(id), doc_type: 'Bank Statement', status: 'Uploaded', storage_path: `test/${id}`, file_name: `${id}.pdf` })), loading: false, error: null, refetch: vi.fn() }),
  useUploadDocument: () => ({ uploading: false, uploadDocument: vi.fn() }), deleteDocument: vi.fn(),
}));
vi.mock('./LeadFieldsGrid', () => ({ default: () => <div>Lead fields</div> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const lead = { id: 'lead-1', business_name: 'Test business', assigned_rep: 'Rep' } as Lead;
it('keeps the lead open and shows the actual conversion error', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'Application insert denied' } });
  const onClose = vi.fn(); const onChanged = vi.fn();
  render(<ManageLeadModal lead={lead} onClose={onClose} onChanged={onChanged} />);
  fireEvent.click(screen.getByRole('button', { name: 'Convert to submission' }));
  expect(await screen.findByText('Application insert denied')).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled();
});
it('closes only after the atomic conversion returns an application ID', async () => {
  rpc.mockResolvedValue({ data: 'application-1', error: null });
  const onClose = vi.fn(); const onChanged = vi.fn();
  render(<ManageLeadModal lead={lead} onClose={onClose} onChanged={onChanged} />);
  fireEvent.click(screen.getByRole('button', { name: 'Convert to submission' }));
  await screen.findByRole('button', { name: 'Convert to submission' });
  expect(rpc).toHaveBeenCalledWith('convert_lead_to_submission', expect.objectContaining({ p_lead_id: 'lead-1', p_details: expect.objectContaining({ start_date: null, owner_dob: null }) }));
  expect(onChanged).toHaveBeenCalledOnce(); expect(onClose).toHaveBeenCalledOnce();
});
