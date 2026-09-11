import { encodeRfc822, validateRecipients } from '../_shared/gmailSecurity.ts';

export const MAX_PACKAGE_BYTES = 18 * 1024 * 1024;
export type PackageInput = { request_id: string; lead_id: string; application_id: string; funding_partner_id: string; recipient: string; cc_emails?: string[]; document_ids: string[]; subject: string; body: string };
export type PackageDocument = { id: string; lead_id: string | null; application_id?: string | null; file_name: string; file_size?: number | null; mime_type?: string | null; storage_path?: string | null; file_path?: string | null; status: string };
type Receipt = { id: string; state: string; gmail_message_id?: string | null };
export interface LenderDependencies {
  userId: string;
  authorize(input: PackageInput): Promise<{ email: string; from: string; cc?: string[] }>;
  documents(ids: string[], leadId: string): Promise<PackageDocument[]>;
  download(path: string): Promise<Blob>;
  receipt(id: string): Promise<Receipt | null>;
  reserve(input: PackageInput): Promise<void>;
  send(raw: string): Promise<{ id: string; threadId?: string }>;
  complete(input: PackageInput, sent: { id: string; threadId?: string }): Promise<void>;
  markUnknown(id: string): Promise<void>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parsePackage(value: unknown): PackageInput {
  const input = value as PackageInput;
  if (!input || ![input.request_id,input.lead_id,input.application_id,input.funding_partner_id].every(v => typeof v === 'string' && uuid.test(v))) throw new Error('Select a client application and lender.');
  if (!Array.isArray(input.document_ids) || !input.document_ids.length || input.document_ids.length > 20 || !input.document_ids.every(v => typeof v === 'string' && uuid.test(v)) || new Set(input.document_ids).size !== input.document_ids.length) throw new Error('Choose between 1 and 20 different client documents.');
  if (typeof input.subject !== 'string' || !input.subject.trim() || input.subject.length > 300 || /[\r\n]/.test(input.subject) || typeof input.body !== 'string' || !input.body.trim() || input.body.length > 50_000) throw new Error('Enter a subject (up to 300 characters) and message (up to 50,000 characters).');
  if (typeof input.recipient !== 'string' || validateRecipients([input.recipient]).length !== 1) throw new Error('The lender needs a valid email address.');
  if (input.cc_emails !== undefined && !Array.isArray(input.cc_emails)) throw new Error('Review the lender CC addresses.');
  const cc_emails = [...new Set(validateRecipients(input.cc_emails ?? []).map(email=>email.toLowerCase()))];
  if (cc_emails.length > 21) throw new Error('Too many lender CC addresses.');
  return { cc_emails, request_id: input.request_id, lead_id: input.lead_id, application_id: input.application_id, funding_partner_id: input.funding_partner_id, recipient: input.recipient, document_ids: input.document_ids, subject: input.subject, body: input.body };
}
export async function sendLenderPackage(value: unknown, deps: LenderDependencies) {
  const input = parsePackage(value);
  const context = await deps.authorize(input);
  if (context.email.trim().toLowerCase() !== input.recipient.trim().toLowerCase()) throw new Error('The lender email changed. Close this window and review the current recipient.');
  const expectedCc = [...new Set(validateRecipients(context.cc ?? []).map(email=>email.toLowerCase()))].filter(email=>email!==context.email.toLowerCase());
  if (JSON.stringify([...(input.cc_emails ?? [])].sort()) !== JSON.stringify([...expectedCc].sort())) throw new Error('The lender CC addresses changed. Close this window and review the current recipients.');
  input.recipient=context.email;input.cc_emails=expectedCc;
  const prior = await deps.receipt(input.request_id);
  if (prior) {
    if (prior.state === 'sent') return { sent: true, message_id: prior.gmail_message_id, already_sent: true };
    throw new Error('This send is already in progress or its delivery is uncertain. Check Gmail Sent before starting another email.');
  }
  const documents = await deps.documents(input.document_ids,input.lead_id);
  if (documents.length !== input.document_ids.length || documents.some(doc => doc.lead_id !== input.lead_id || !input.document_ids.includes(doc.id) || ['Missing','Pending','Rejected'].includes(doc.status))) throw new Error('One or more documents are unavailable or belong to another client.');
  const total = documents.reduce((sum,doc) => sum + Math.max(0,doc.file_size ?? 0),0);
  if (total > MAX_PACKAGE_BYTES) throw new Error('Attachments exceed 18 MB. Choose fewer or smaller files.');
  const attachments: { name: string; mimeType: string; data: Uint8Array }[] = [];
  let downloaded = 0;
  for (const doc of documents) {
    const path = doc.storage_path || doc.file_path || '';
    if (path.split('/').includes('..') || (!path.startsWith(`leads/${input.lead_id}/`) && !path.startsWith(`applications/${input.application_id}/`))) throw new Error(`Upload ${doc.file_name} into this client's document folder before emailing it.`);
    const file = await deps.download(path);
    downloaded += file.size;
    if (downloaded > MAX_PACKAGE_BYTES) throw new Error('Attachments exceed 18 MB. Choose fewer or smaller files.');
    if (!file.size) throw new Error(`${doc.file_name} is empty. Upload the file again.`);
    attachments.push({ name: doc.file_name, mimeType: doc.mime_type || file.type || 'application/octet-stream', data: new Uint8Array(await file.arrayBuffer()) });
  }
  const raw = encodeRfc822({ to: [context.email], cc: expectedCc, from: context.from, subject: input.subject, body: input.body, attachments });
  // Unique request ID is reserved before Gmail: retries never resend this request.
  await deps.reserve(input);
  let sent;
  try { sent = await deps.send(raw); if (!sent.id) throw new Error('Gmail did not return a message ID.'); }
  catch {
    await deps.markUnknown(input.request_id).catch(() => undefined);
    throw new Error('Gmail delivery could not be confirmed. Check Gmail Sent before starting another email.');
  }
  try { await deps.complete(input,sent); }
  catch { return { sent: true, message_id: sent.id, warning: 'Email was sent with attachments, but CRM logging failed. Do not resend; check Gmail Sent.' }; }
  return { sent: true, message_id: sent.id };
}
