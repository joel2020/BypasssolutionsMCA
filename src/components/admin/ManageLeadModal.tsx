import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, Trash2, Upload, X } from 'lucide-react';
import { supabase, type Lead } from '../../lib/supabase';
import { useReps } from '../../hooks/useReps';
import { useDocuments, useUploadDocument, deleteDocument } from '../../hooks/useDocuments';
import { buildPayload, initialForm } from '../../lib/leadEditFields';
import LeadFieldsGrid from './LeadFieldsGrid';

const BANK_STATEMENT = 'Bank Statement';

/** Edit a lead, attach statements, and save it as a submission draft. */
export default function ManageLeadModal({ lead, onClose, onChanged }: { lead: Lead; onClose: () => void; onChanged: () => void }) {
  const { data: reps } = useReps();
  const { data: allDocuments, refetch: refetchDocuments } = useDocuments({ leadId: lead.id });
  const { uploadDocument, uploading } = useUploadDocument();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>(() => initialForm(lead));
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: string, value: string) => setForm((cur) => ({ ...cur, [key]: value }));

  const bankStatements = useMemo(() => allDocuments.filter((d) => d.doc_type === BANK_STATEMENT), [allDocuments]);

  async function saveDetails() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (!(form.business_name ?? '').trim()) throw new Error('Business name is required.');
      const { error: updateError } = await supabase.from('leads').update(buildPayload(form)).eq('id', lead.id).select('id').single();
      if (updateError) throw updateError;
      setMessage('Lead details saved.');
      onChanged();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the lead.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument({ leadId: lead.id, documentType: BANK_STATEMENT, file, notes: '' });
      }
      await refetchDocuments();
      setMessage('Bank statement(s) uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload the file.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removeStatement(id: string) {
    setError(null);
    const doc = bankStatements.find((d) => d.id === id);
    if (!doc) return;
    try {
      await deleteDocument(doc);
      await refetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete the document.');
    }
  }

  async function convert() {
    setError(null);
    setMessage(null);
    setConverting(true);
    try {
      if (!await saveDetails()) return;
      const { error: conversionError } = await supabase.rpc('convert_lead_to_submission', { p_lead_id: lead.id });
      if (conversionError) throw new Error(conversionError.message);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to convert this lead.');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 lg:items-center">
      <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-[20px] font-bold text-navy-900">{lead.business_name || 'Lead'}</h2>
            <p className="text-[13px] text-slate-500">Edit any detail, add bank statements, and save it as a submission. Missing details can be added later.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving || converting || uploading} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <LeadFieldsGrid form={form} set={set} reps={reps} />

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-navy-900">Bank statements <span className="ml-1 text-slate-400">({bankStatements.length} files)</span></p>
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading || converting || saving} className="btn-secondary h-8 px-3 text-[12px] disabled:opacity-60">
                <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={fileInput} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            </div>
            {bankStatements.length === 0 ? (
              <p className="text-[12px] text-slate-400">Upload statements now or add them later. One PDF can contain multiple months.</p>
            ) : (
              <div className="space-y-1.5">
                {bankStatements.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-[12px]">
                    <span className="flex min-w-0 items-center gap-2 text-slate-700"><FileText size={13} className="text-slate-400" /><span className="truncate">{d.file_name}</span></span>
                    <button type="button" onClick={() => void removeStatement(d.id)} disabled={saving || converting || uploading} className="flex-none text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          {message && <div className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[13px] text-green-700"><CheckCircle2 size={15} /> {message}</div>}
        </div>

        <div className="flex flex-shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={saving || converting || uploading} className="btn-secondary">Close</button>
          <button type="button" onClick={() => void saveDetails()} disabled={saving || converting || uploading} className="btn-secondary disabled:opacity-60">{saving ? 'Saving...' : 'Save details'}</button>
          <button type="button" onClick={() => void convert()} disabled={converting || saving || uploading} title="Save as Documents Needed; finish the details later" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {converting ? 'Converting...' : 'Convert to submission'}
          </button>
        </div>
      </div>
    </div>
  );
}
