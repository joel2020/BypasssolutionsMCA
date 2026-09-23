import { useRef, useState } from 'react';
import { FileText, Trash2, Upload, X } from 'lucide-react';
import { useUploadDocument, validateDocumentFile } from '../../hooks/useDocuments';
import { createSubmissionDraft, uploadSubmissionFiles, type SubmissionDraft, type SubmissionFile, type SubmissionForm } from '../../lib/submissionDraft';

export default function NewSubmissionModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<SubmissionForm>({ businessName: '', requestedAmount: '', notes: '', firstName: '', lastName: '', email: '', phone: '' });
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [draft, setDraft] = useState<SubmissionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(crypto.randomUUID());
  const busy = useRef(false);
  const { uploadDocument } = useUploadDocument();
  const update = (key: keyof SubmissionForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function addFiles(selected: FileList | null, documentType: SubmissionFile['documentType']) {
    if (!selected) return;
    try {
      const incoming = Array.from(selected);
      incoming.forEach(validateDocumentFile);
      setFiles((current) => [...current, ...incoming.map((file) => ({ id: crypto.randomUUID(), file, documentType }))]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add files.');
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    let saved = draft;
    try {
      files.forEach(({ file }) => validateDocumentFile(file));
      if (!saved) {
        saved = await createSubmissionDraft(requestId.current, form);
        setDraft(saved);
      }
      await uploadSubmissionFiles(saved, files, uploadDocument, (id) => {
        setFiles((current) => current.filter((item) => item.id !== id));
      });
      await onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save submission.';
      setError(saved ? `Submission saved. ${message} Retry the remaining uploads or close and finish later.` : message);
      if (saved) void Promise.resolve(onCreated()).catch(() => undefined);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 lg:items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="new-submission-title" className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="new-submission-title" className="text-[20px] font-bold text-navy-900">New Submission</h2>
            <p className="mt-1 text-[13px] text-slate-500">Start with a business name. Upload what you have and finish the details later.</p>
          </div>
          <button type="button" aria-label="Close" disabled={saving} onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
        </header>
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            {draft && <p role="status" className="rounded-md bg-green-50 p-3 text-[13px] text-green-800">Submission saved as Documents Needed. Remaining files are listed below.</p>}
            <fieldset disabled={saving || !!draft} className="space-y-3 disabled:opacity-70">
              <label className="block text-[12px] font-semibold text-slate-600">Business name <span className="text-red-600">*</span><input autoFocus required className="input-field mt-1.5" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} /></label>
              <label className="block text-[12px] font-semibold text-slate-600">Requested amount <span className="font-normal">(optional)</span><input type="number" min="0" step="0.01" className="input-field mt-1.5" value={form.requestedAmount} onChange={(e) => update('requestedAmount', e.target.value)} /></label>
              <label className="block text-[12px] font-semibold text-slate-600">Notes <span className="font-normal">(optional)</span><textarea className="input-field mt-1.5 min-h-20" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label>
              <details className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-[13px] font-semibold text-slate-600">Contact details (optional)</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(['firstName', 'lastName', 'email', 'phone'] as const).map((key) => (
                    <label key={key} className="block text-[12px] font-semibold text-slate-600">{{ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone' }[key]}<input type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} className="input-field mt-1.5" value={form[key]} onChange={(e) => update(key, e.target.value)} /></label>
                  ))}
                </div>
              </details>
            </fieldset>
            <fieldset disabled={saving} className="rounded-lg border border-dashed border-slate-300 p-4">
              <legend className="px-1 text-[13px] font-semibold text-slate-700">Documents (optional)</legend>
              <p className="mb-3 text-[12px] text-slate-500">PDF, DOC, DOCX, PNG or JPG · Up to 50 MB per file. Combined bank-statement PDFs are welcome.</p>
              <div className="space-y-3">
                {(['Application', 'Bank Statement'] as const).map((documentType) => (
                  <label key={documentType} className="block text-[12px] font-semibold text-slate-600"><span className="mb-1 flex items-center gap-1"><Upload size={13} />{documentType === 'Application' ? 'Application files' : 'Bank statements'}</span><input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="block w-full text-[12px] font-normal" onChange={(event) => { addFiles(event.target.files, documentType); event.target.value = ''; }} /></label>
                ))}
              </div>
              {files.length > 0 && <ul className="mt-3 space-y-2">{files.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-[12px]"><FileText size={14} className="shrink-0 text-blue-500" /><span className="min-w-0 flex-1 break-words">{item.file.name}<span className="block text-slate-400">{item.documentType}</span></span><button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button></li>)}</ul>}
            </fieldset>
            <p className="text-[12px] text-slate-500">Assigned to you and saved as Documents Needed. Saving does not send anything to a lender.</p>
            {error && <div role="alert" className="rounded-md border border-red-100 bg-red-50 p-3 text-[13px] text-red-700">{error}</div>}
          </div>
          <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-3">
            <button type="button" disabled={saving} onClick={onClose} className="btn-secondary disabled:opacity-50">{draft ? 'Close' : 'Cancel'}</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : draft && files.length ? 'Retry uploads' : 'Save submission'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
