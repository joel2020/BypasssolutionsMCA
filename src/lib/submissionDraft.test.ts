import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSubmissionDraft, uploadSubmissionFiles, type SubmissionFile } from './submissionDraft';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }));
const form = { businessName: ' Test business ', requestedAmount: '', notes: '', firstName: '', lastName: '', email: '', phone: '' };
const draft = { leadId: 'lead', applicationId: 'application' };
beforeEach(() => vi.clearAllMocks());

describe('direct submission creation', () => {
  it('saves with business name only and reuses the request ID', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { lead_id: 'lead', application_id: 'application' }, error: null } as never);
    expect(await createSubmissionDraft('request', form)).toEqual(draft);
    expect(supabase.rpc).toHaveBeenCalledWith('create_crm_submission', expect.objectContaining({ p_request_id: 'request', p_business_name: 'Test business', p_requested_amount: 0, p_email: '' }));
    await createSubmissionDraft('request', form);
    expect(vi.mocked(supabase.rpc).mock.calls[1][1]?.p_request_id).toBe('request');
  });

  it.each(['-10', 'NaN', 'Infinity'])('rejects invalid amount %s before saving', async (requestedAmount) => {
    await expect(createSubmissionDraft('request', { ...form, requestedAmount })).rejects.toThrow('Requested amount');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only business name', async () => {
    await expect(createSubmissionDraft('request', { ...form, businessName: ' ' })).rejects.toThrow('Business name');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('surfaces database failures instead of reporting success', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'Permission denied' } } as never);
    await expect(createSubmissionDraft('request', form)).rejects.toThrow('Permission denied');
  });

  it('requires confirmation of both saved records', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { lead_id: 'lead' }, error: null } as never);
    await expect(createSubmissionDraft('request', form)).rejects.toThrow('confirm');
  });
});

describe('submission document uploads', () => {
  const files: SubmissionFile[] = ['application.pdf', 'combined-statements.pdf', 'extra.pdf'].map((name, index) => ({ id: String(index), file: { name } as File, documentType: index === 0 ? 'Application' : 'Bank Statement' }));

  it('retains failed and unattempted files, and retries without resending successful files', async () => {
    let pending = [...files];
    const upload = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Network error'));
    const completed = (id: string) => { pending = pending.filter((file) => file.id !== id); };
    await expect(uploadSubmissionFiles(draft, pending, upload, completed)).rejects.toThrow('Network error');
    expect(pending.map((file) => file.id)).toEqual(['1', '2']);
    upload.mockResolvedValue({});
    await uploadSubmissionFiles(draft, pending, upload, completed);
    expect(pending).toEqual([]);
    expect(upload.mock.calls.map(([input]) => input.file.name)).toEqual(['application.pdf', 'combined-statements.pdf', 'combined-statements.pdf', 'extra.pdf']);
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ ...draft, documentType: 'Bank Statement' }));
  });

  it('allows saving without documents', async () => {
    const upload = vi.fn();
    await uploadSubmissionFiles(draft, [], upload, vi.fn());
    expect(upload).not.toHaveBeenCalled();
  });
});
