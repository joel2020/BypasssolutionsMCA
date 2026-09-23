import { supabase } from './supabase';

export interface SubmissionForm {
  businessName: string;
  requestedAmount: string;
  notes: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface SubmissionDraft {
  leadId: string;
  applicationId: string;
}

export async function createSubmissionDraft(requestId: string, form: SubmissionForm): Promise<SubmissionDraft> {
  if (!form.businessName.trim()) throw new Error('Business name is required.');
  const amount = Number(form.requestedAmount || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Requested amount must be zero or greater.');
  const { data, error } = await supabase.rpc('create_crm_submission', {
    p_request_id: requestId,
    p_business_name: form.businessName.trim(),
    p_requested_amount: amount,
    p_notes: form.notes.trim(),
    p_first_name: form.firstName.trim(),
    p_last_name: form.lastName.trim(),
    p_email: form.email.trim().toLowerCase(),
    p_phone: form.phone.trim(),
  });
  if (error) throw new Error(error.message);
  if (!data?.lead_id || !data?.application_id) throw new Error('Unable to confirm the saved submission. Please retry.');
  return { leadId: data.lead_id, applicationId: data.application_id };
}

export interface SubmissionFile {
  id: string;
  file: File;
  documentType: 'Application' | 'Bank Statement';
}

// Notify after each completed file so a retry only sends pending files.
export async function uploadSubmissionFiles(
  draft: SubmissionDraft,
  files: SubmissionFile[],
  upload: (input: SubmissionDraft & { file: File; documentType: string }) => Promise<unknown>,
  onUploaded: (id: string) => void,
) {
  for (const item of files) {
    await upload({ ...draft, file: item.file, documentType: item.documentType });
    onUploaded(item.id);
  }
}
