import { useState, type DragEvent } from 'react';
import { Eye, FileSignature, FileText, Trash2, Upload, XCircle } from 'lucide-react';
import { createDocumentSignedUrl, deleteDocument, REQUIRED_DOCUMENT_TYPES, useUploadDocument } from '../../hooks/useDocuments';
import { useCreatePartnerSubmission } from '../../hooks/usePartnerSubmissions';
import type { Document, PartnerSubmission } from '../../lib/supabase';

export { default as SubmitToLenderModal } from './SubmitToLenderModal';

const documentTypes = [...REQUIRED_DOCUMENT_TYPES, 'Other'];

const denialReasons = [
  'Low revenue',
  'Negative balances',
  'Too many NSFs',
  'Existing MCA balance too high',
  'Time in business too short',
  'Restricted industry',
  'Poor credit profile',
  'Insufficient documents',
  'Fraud / unverifiable information',
  'Duplicate application',
  'Other',
];

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Declined' || status === 'Rejected'
    ? 'bg-red-500/15 text-red-200 border-red-400/20'
    : status === 'Approved' || status === 'Funded' || status === 'Offer Sent'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20'
      : status === 'Submitted' || status === 'Uploaded' || status === 'In Review'
        ? 'bg-blue-500/15 text-blue-200 border-blue-400/20'
        : 'bg-amber-500/15 text-amber-200 border-amber-400/20';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>{status}</span>;
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1730] p-5 text-white shadow-2xl shadow-black/40">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[18px] font-black tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><XCircle size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function UploadDocumentModal({ leadId, applicationId, onClose, onUploaded }: { leadId?: string | null; applicationId?: string | null; onClose: () => void; onUploaded: () => void }) {
  const [documentType, setDocumentType] = useState(documentTypes[0]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { uploadDocument, uploading, error } = useUploadDocument();

  function pickFile(nextFile?: File) {
    if (nextFile) setFile(nextFile);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !leadId) return;

    await uploadDocument({ leadId, applicationId, documentType, file, notes });
    setSuccess('Document uploaded securely.');
    onUploaded();
    setTimeout(onClose, 650);
  }

  return (
    <ModalShell title="Upload Document" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Document type</span><select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none focus:border-blue-400">{documentTypes.map((type) => <option key={type} className="bg-[#0b1730]" value={type}>{type}</option>)}</select></label>
        <label onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center ${isDragging ? 'border-blue-200 bg-blue-500/20' : 'border-blue-300/30 bg-blue-500/10 hover:bg-blue-500/15'}`}><Upload size={28} className="text-blue-200" /><span className="mt-3 text-[14px] font-bold text-white">{file ? file.name : 'Drag and drop a document, or click to browse'}</span><span className="mt-1 text-[12px] text-slate-400">PDF, DOC, DOCX, JPG, PNG up to 50MB. Private storage; signed URLs only.</span><input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} /></label>
        <label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Notes optional</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.06] p-3 text-[14px] text-white outline-none focus:border-blue-400" placeholder="Add internal notes..." /></label>
        {error && <p className="text-[13px] text-red-200">{error}</p>}
        {success && <p className="text-[13px] text-emerald-200">{success}</p>}
        <button disabled={!file || uploading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Upload size={15} />{uploading ? 'Uploading...' : 'Upload Document'}</button>
      </form>
    </ModalShell>
  );
}

export function DocumentList({
  documents,
  empty = 'No documents uploaded yet',
  onChanged,
  onConvert,
}: {
  documents: Document[];
  empty?: string;
  onChanged?: () => void;
  onConvert?: (doc: Document) => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);

  async function openInViewer(doc: Document) {
    setLoadingId(doc.id);
    try {
      const url = await createDocumentSignedUrl(doc.storage_path || doc.file_path || '');
      setViewer({ url, name: doc.file_name || doc.document_type || doc.doc_type || 'Document' });
    } finally {
      setLoadingId(null);
    }
  }

  async function removeDocument(doc: Document) {
    setActionError(null);
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc);
      setConfirmId(null);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete this document.');
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-[14px] text-slate-400">{empty}</div>;

  return (
    <>
      {actionError && <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[13px] text-red-100">{actionError}</div>}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-200"><FileText size={18} /></span><div className="min-w-0"><p className="truncate text-[14px] font-bold text-white">{doc.file_name}</p><p className="text-[12px] text-slate-400">{doc.document_type || doc.doc_type} • {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Private file'}</p></div></div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={doc.status} />
              <button onClick={() => void openInViewer(doc)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-slate-200 hover:bg-white/10"><Eye size={13} />{loadingId === doc.id ? 'Opening...' : 'View'}</button>
              {onConvert && (
                <button
                  onClick={() => onConvert(doc)}
                  title="Rebuild this as a Bypass application, prefilled, and send it for signature"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600/90 px-3 text-[12px] font-bold text-white hover:bg-violet-600"
                >
                  <FileSignature size={13} /> Convert to Bypass App
                </button>
              )}
              {confirmId === doc.id ? (
                <span className="inline-flex items-center gap-2">
                  <button onClick={() => void removeDocument(doc)} disabled={deletingId === doc.id} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-[12px] font-bold text-white disabled:opacity-60">
                    {deletingId === doc.id ? 'Deleting...' : 'Confirm delete'}
                  </button>
                  <button onClick={() => setConfirmId(null)} className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-[12px] font-bold text-slate-300 hover:bg-white/10">Cancel</button>
                </span>
              ) : (
                <button onClick={() => { setActionError(null); setConfirmId(doc.id); }} title="Delete this document" className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-400/20 px-3 text-[12px] font-bold text-red-200 hover:bg-red-500/10">
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {viewer && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" onClick={() => setViewer(null)}>
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1730]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <p className="truncate text-[14px] font-bold text-white">{viewer.name}</p>
              <div className="flex items-center gap-2">
                <a href={viewer.url} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-slate-300 hover:bg-white/10">Open in new tab</a>
                <button onClick={() => setViewer(null)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><XCircle size={18} /></button>
              </div>
            </div>
            <iframe title={viewer.name} src={viewer.url} className="h-full w-full flex-1 bg-white" />
          </div>
        </div>
      )}
    </>
  );
}

export function MarkDeclinedModal({ submission, leadId, onClose, onDeclined }: { submission: PartnerSubmission; leadId?: string | null; onClose: () => void; onDeclined: () => void }) {
  const [reason, setReason] = useState(denialReasons[0]);
  const [notes, setNotes] = useState('');
  const { markDeclined, loading } = useCreatePartnerSubmission();


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await markDeclined({ submissionId: submission.id, applicationId: submission.application_id, leadId, denialReason: reason, denialNotes: notes });
    onDeclined();
    onClose();
  }

  return (
    <ModalShell title="Mark Submission Declined" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Denial reason</span><select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none focus:border-blue-400">{denialReasons.map((item) => <option key={item} className="bg-[#0b1730]" value={item}>{item}</option>)}</select></label>
        <label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.06] p-3 text-[14px] text-white outline-none focus:border-blue-400" placeholder="Add lender feedback or underwriting notes..." /></label>
        <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={15} />{loading ? 'Saving...' : 'Mark Declined'}</button>
      </form>
    </ModalShell>
  );
}

export function PartnerSubmissionList({ submissions, leadId, onChanged }: { submissions: PartnerSubmission[]; leadId?: string | null; onChanged: () => void }) {
  const [declineTarget, setDeclineTarget] = useState<PartnerSubmission | null>(null);

  if (submissions.length === 0) return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-[14px] text-slate-400">No lender submissions yet</div>;

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <div key={submission.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-bold text-white">{submission.funding_partners?.name || 'Funding Partner'}</p><p className="mt-1 text-[12px] text-slate-400">Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}</p></div><div className="flex items-center gap-2"><StatusBadge status={submission.status} />{submission.status !== 'Declined' && <button onClick={() => setDeclineTarget(submission)} className="rounded-lg border border-red-400/20 px-3 py-2 text-[12px] font-bold text-red-200 hover:bg-red-500/10">Mark Declined</button>}</div></div>
          {submission.email_delivery_id && <p className="mt-2 text-[12px] text-emerald-200">Emailed via Gmail · {submission.included_document_ids?.length || 0} attachment(s)</p>}
          {submission.notes && <p className="mt-3 text-[13px] text-slate-300">{submission.notes}</p>}
          {submission.denial_reason && <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[12px] text-red-100"><strong>Denial:</strong> {submission.denial_reason}{submission.denial_notes ? ` — ${submission.denial_notes}` : ''}</div>}
        </div>
      ))}
      {declineTarget && <MarkDeclinedModal submission={declineTarget} leadId={leadId} onClose={() => setDeclineTarget(null)} onDeclined={onChanged} />}
    </div>
  );
}
