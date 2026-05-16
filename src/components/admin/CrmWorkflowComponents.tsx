import { useMemo, useState, type DragEvent } from 'react';
import { Download, FileText, Send, Upload, XCircle } from 'lucide-react';
import { createDocumentSignedUrl, REQUIRED_DOCUMENT_TYPES, useUploadDocument } from '../../hooks/useDocuments';
import { useCreatePartnerSubmission, useFundingPartners } from '../../hooks/usePartnerSubmissions';
import type { Document, FundingPartner, PartnerSubmission } from '../../lib/supabase';

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

export function DocumentList({ documents, empty = 'No documents uploaded yet' }: { documents: Document[]; empty?: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openSignedUrl(doc: Document) {
    setLoadingId(doc.id);
    try {
      const url = await createDocumentSignedUrl(doc.storage_path || doc.file_path || '');
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setLoadingId(null);
    }
  }

  if (documents.length === 0) return <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-[14px] text-slate-400">{empty}</div>;

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-200"><FileText size={18} /></span><div className="min-w-0"><p className="truncate text-[14px] font-bold text-white">{doc.file_name}</p><p className="text-[12px] text-slate-400">{doc.document_type || doc.doc_type} / {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Private file'}</p></div></div>
          <div className="flex items-center gap-2"><StatusBadge status={doc.status} /><button onClick={() => void openSignedUrl(doc)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-slate-200 hover:bg-white/10"><Download size={13} />{loadingId === doc.id ? 'Opening...' : 'View'}</button></div>
        </div>
      ))}
    </div>
  );
}

export function SubmitToLenderModal({ leadId, applicationId, documents, onClose, onSubmitted }: { leadId?: string | null; applicationId: string; documents: Document[]; onClose: () => void; onSubmitted: () => void }) {
  const { data: partners, loading } = useFundingPartners();
  const { createSubmission, loading: submitting } = useCreatePartnerSubmission();
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(documents.map((doc) => doc.id));
  const [notes, setNotes] = useState('');
  const selectedPartnerRecords = useMemo(() => partners.filter((partner) => selectedPartners.includes(partner.id)), [partners, selectedPartners]);


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    for (const fundingPartnerId of selectedPartners) {
      await createSubmission({ applicationId, leadId, fundingPartnerId, notes, includedDocumentIds: selectedDocs });
    }
    onSubmitted();
    onClose();
  }

  function togglePartner(partner: FundingPartner) {
    setSelectedPartners((current) => current.includes(partner.id) ? current.filter((id) => id !== partner.id) : [...current, partner.id]);
  }

  return (
    <ModalShell title="Submit to Lender" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Funding partners</p><div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">{loading ? <p className="p-3 text-[13px] text-slate-400">Loading partners...</p> : partners.map((partner) => <button type="button" key={partner.id} onClick={() => togglePartner(partner)} className={`w-full rounded-lg border p-3 text-left transition ${selectedPartners.includes(partner.id) ? 'border-blue-400 bg-blue-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}><span className="block text-[14px] font-bold text-white">{partner.name}</span><span className="text-[12px] text-slate-400">{partner.contact_name || 'No contact'} {partner.email ? `/ ${partner.email}` : ''}</span></button>)}</div></div>
        <div><p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Documents to include</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{documents.length === 0 ? <p className="text-[13px] text-amber-200">No documents uploaded yet.</p> : documents.map((doc) => <label key={doc.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[13px] text-slate-200"><input type="checkbox" checked={selectedDocs.includes(doc.id)} onChange={() => setSelectedDocs((current) => current.includes(doc.id) ? current.filter((id) => id !== doc.id) : [...current, doc.id])} />{doc.document_type || doc.doc_type}</label>)}</div></div>
        <label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Submission notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.06] p-3 text-[14px] text-white outline-none focus:border-blue-400" placeholder="What should the lender know?" /></label>
        <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-[12px] text-amber-100">This builds a populated lender package from the stored application, stores the exact email body, and sends through the configured email provider. Without provider credentials it is queued and marked provider not configured.</div>
        <button disabled={selectedPartners.length === 0 || submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />{submitting ? 'Submitting...' : `Submit to ${selectedPartnerRecords.length || ''} lender${selectedPartnerRecords.length === 1 ? '' : 's'}`}</button>
      </form>
    </ModalShell>
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
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-bold text-white">{submission.funding_partners?.name || 'Funding Partner'}</p><p className="mt-1 text-[12px] text-slate-400">Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-'}</p></div><div className="flex items-center gap-2"><StatusBadge status={submission.status} />{submission.status !== 'Declined' && <button onClick={() => setDeclineTarget(submission)} className="rounded-lg border border-red-400/20 px-3 py-2 text-[12px] font-bold text-red-200 hover:bg-red-500/10">Mark Declined</button>}</div></div>
          {submission.email_status && <p className="mt-2 text-[12px] text-slate-400">Email: {submission.email_status}{submission.email_error ? ` (${submission.email_error})` : ''}</p>}
          {submission.notes && <p className="mt-3 text-[13px] text-slate-300">{submission.notes}</p>}
          {submission.denial_reason && <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[12px] text-red-100"><strong>Denial:</strong> {submission.denial_reason}{submission.denial_notes ? ` - ${submission.denial_notes}` : ''}</div>}
        </div>
      ))}
      {declineTarget && <MarkDeclinedModal submission={declineTarget} leadId={leadId} onClose={() => setDeclineTarget(null)} onDeclined={onChanged} />}
    </div>
  );
}
