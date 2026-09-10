import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, Trash2, Upload, X } from 'lucide-react';
import { supabase, type Lead } from '../../lib/supabase';
import { useReps } from '../../hooks/useReps';
import { useDocuments, useUploadDocument, deleteDocument } from '../../hooks/useDocuments';
import { initialForm } from '../../lib/leadEditFields';
import { leadEditPayload, updateLead } from '../../lib/leadMutations';
import LeadFieldsGrid from './LeadFieldsGrid';

const REQUIRED_BANK_STATEMENTS = 4;
const BANK_STATEMENT = 'Bank Statement';

/**
 * Work a lead from the Leads tab: edit ALL of its details, upload the bank
 * statements, and convert it to a full submission (which requires the last 4
 * months of bank statements).
 */
export default function ManageLeadModal({ lead, onClose, onChanged }: { lead: Lead; onClose: () => void; onChanged: () => void }) {
  const { data: reps } = useReps();
  const { data: allDocuments, loading: documentsLoading, error: documentsError, refetch: refetchDocuments } = useDocuments({ leadId: lead.id });
  const { uploadDocument, uploading } = useUploadDocument();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>(() => initialForm(lead));
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: string, value: string) => setForm((cur) => ({ ...cur, [key]: value }));

  const bankStatements = useMemo(() => allDocuments.filter((d) => d.doc_type === BANK_STATEMENT && ['Uploaded', 'Under Review', 'Reviewed', 'Approved'].includes(d.status) && Boolean(d.storage_path)), [allDocuments]);
  const hasEnough = bankStatements.length >= REQUIRED_BANK_STATEMENTS;

  async function saveDetails() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      if (!(form.business_name ?? '').trim()) throw new Error('Business name is required.');
      await updateLead(lead.id, leadEditPayload(form, lead, reps));
      setMessage('Lead details saved.');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the lead.');
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
    if (!hasEnough) {
      setError(`Full submissions require the last ${REQUIRED_BANK_STATEMENTS} months of bank statements (${bankStatements.length}/${REQUIRED_BANK_STATEMENTS} uploaded).`);
      return;
    }
    setConverting(true);
    try {
      if (!(form.business_name ?? '').trim()) throw new Error('Business name is required.');
      const { data: applicationId, error: conversionError } = await supabase.rpc('convert_lead_to_submission', {
        p_lead_id: lead.id,
        p_details: leadEditPayload(form, lead, reps),
      });
      if (conversionError) throw new Error(conversionError.message);
      if (!applicationId) throw new Error('The application was not created. Please retry.');
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
            <p className="text-[13px] text-slate-500">Edit any detail, add bank statements, and convert it to a full submission.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <LeadFieldsGrid form={form} set={set} reps={reps} />

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-navy-900">Bank statements <span className={`ml-1 ${hasEnough ? 'text-green-600' : 'text-amber-600'}`}>({bankStatements.length}/{REQUIRED_BANK_STATEMENTS})</span></p>
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading || converting || saving} className="btn-secondary h-8 px-3 text-[12px] disabled:opacity-60">
                <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={fileInput} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => void onFiles(e.target.files)} />
            </div>
            {bankStatements.length === 0 ? (
              <p className="text-[12px] text-slate-400">Upload the last {REQUIRED_BANK_STATEMENTS} months of business bank statements to convert this lead.</p>
            ) : (
              <div className="space-y-1.5">
                {bankStatements.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-[12px]">
                    <span className="flex min-w-0 items-center gap-2 text-slate-700"><FileText size={13} className="text-slate-400" /><span className="truncate">{d.file_name}</span></span>
                    <button type="button" disabled={converting || uploading || saving} onClick={() => void removeStatement(d.id)} className="flex-none text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {documentsError && <p role="alert" className="text-sm text-red-700">{documentsError}</p>}
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          {message && <div className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[13px] text-green-700"><CheckCircle2 size={15} /> {message}</div>}
        </div>

        <div className="flex flex-shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          <button type="button" onClick={() => void saveDetails()} disabled={saving || converting || uploading} className="btn-secondary disabled:opacity-60">{saving ? 'Saving...' : 'Save details'}</button>
          <button type="button" onClick={() => void convert()} disabled={converting || saving || uploading || documentsLoading || Boolean(documentsError) || !hasEnough} title={hasEnough ? 'Convert to a full submission' : `Upload ${REQUIRED_BANK_STATEMENTS} bank statements first`} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {converting ? 'Converting...' : 'Convert to submission'}
          </button>
        </div>
      </div>
    </div>
  );
}
