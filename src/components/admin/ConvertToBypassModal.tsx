import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, FileSignature, XCircle } from 'lucide-react';
import { supabase, type Lead } from '../../lib/supabase';
import { APPLICATION_FIELDS as FIELDS, applicationPatch } from '../../lib/applicationImport';
import { updateLead } from '../../lib/leadMutations';

interface Props {
  lead: Lead;
  /** Signed URL of the uploaded application, so the rep can read it while typing. */
  sourceUrl?: string | null;
  sourceName?: string;
  /** Original partner application; its signature status is not inferred. */
  sourceDocumentId?: string;
  onClose: () => void;
  onDone: () => void;
}

type Form = Record<string, string>;

export default function ConvertToBypassModal({ lead, sourceUrl, sourceName, sourceDocumentId, onClose, onDone }: Props) {
  const record = lead as unknown as Record<string, unknown>;
  const [form, setForm] = useState<Form>(() =>
    FIELDS.reduce<Form>((acc, f) => {
      const value = record[f.key] ?? (f.key === 'legal_name' ? record.business_name : f.key === 'owner_full_name' ? [record.first_name, record.last_name].filter(Boolean).join(' ') : f.key === 'business_email' ? record.email : f.key === 'funding_amount_requested' ? record.requested_amount : undefined);
      acc[f.key] = value === null || value === undefined ? '' : String(value);
      return acc;
    }, {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState('');
  const [scanAll, setScanAll] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [extracted, setExtracted] = useState<{ fields: Form; warnings: string[]; text: string; pageCount: number } | null>(null);
  const extraction = useRef<AbortController | null>(null);
  useEffect(() => () => extraction.current?.abort(), []);

  async function extract() {
    if (!sourceDocumentId) return;
    const controller = new AbortController();
    extraction.current?.abort(); extraction.current = controller;
    setExtracting(true); setError(null); setReviewed(false);
    try {
      const { readApplication } = await import('../../lib/readApplication');
      const result = await readApplication(sourceDocumentId, lead.id, setProgress, controller.signal, scanAll);
      if (controller.signal.aborted) return;
      setExtracted(result);
      setForm(current => ({ ...current, ...result.fields }));
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to read the application. You can still fill the fields manually.');
    } finally { if (!controller.signal.aborted) setExtracting(false); }
  }

  const set = (key: string) => (value: string) => { setReviewed(false); setForm((cur) => ({ ...cur, [key]: value })); };

  async function submit(send: boolean) {
    setError(null);
    setSuccess(null);
    if (extracting || !reviewed) { setError('Review the fields against the original and confirm before saving.'); return; }

    if (!form.legal_name.trim() || !form.owner_full_name.trim()) {
      setError('Legal business name and owner name are required.');
      return;
    }
    if (send && !form.business_email.trim()) {
      setError('An email address is required to send the application for signature.');
      return;
    }

    setSaving(true);
    try {
      const patch = applicationPatch(form);
      if (!record.email && form.business_email) patch.email = form.business_email.trim();
      await updateLead(lead.id, patch);

      const { data: sessionData } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
      };

      // Always attach a completed Bypass application to the deal.
      const genRes = await fetch('/api/generate-application', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId: lead.id, sourceDocumentId, identifiers: { ein: form.full_ein, ssn: form.full_ssn }, partner: Object.fromEntries(Object.entries(form).filter(([key]) => key.startsWith('partner_'))) }),
      });
      const gen = await genRes.json().catch(() => ({}));
      if (!genRes.ok) throw new Error(gen?.error || 'Unable to generate the Bypass application.');

      if (!send) {
        setSuccess(`Bypass application generated (${gen.fieldsFilled} fields) and attached. No email was sent.`);
      } else {
        const sendRes = await fetch('/api/send-application', {
          method: 'POST',
          headers,
          body: JSON.stringify({ leadId: lead.id }),
        });
        const sent = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) throw new Error(sent?.error || 'Application attached, but sending it for signature failed.');
        setSuccess(`Bypass application attached and sent to ${sent.sentTo} to sign. Once they sign, use "Check for signature" to pull the executed copy onto this deal.`);
      }

      onDone();
      window.setTimeout(onClose, send ? 3200 : 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to convert this application.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1730] text-white shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-[18px] font-black tracking-tight">Convert to Bypass Application</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Carry the details off {sourceName ? `“${sourceName}”` : 'the uploaded application'} into a completed Bypass application, attached to this deal.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><XCircle size={18} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void submit(false); }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-bold text-blue-200 hover:bg-white/10">
                <ExternalLink size={13} /> Open original application
              </a>
            )}

            {sourceDocumentId && <div className="space-y-3 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-[13px]">
              <p>Extract PDF text and form fields, or read scanned PDF, PNG and JPG applications in your browser. Check every value against the original; handwriting, additional owners and unfamiliar layouts may need manual entry.</p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={scanAll} disabled={extracting || saving} onChange={e=>setScanAll(e.target.checked)} /> Scan every page (for mixed text and scanned PDFs)</label>
              <button type="button" disabled={extracting || saving} onClick={()=>void extract()} className="rounded-lg bg-blue-600 px-4 py-2 font-bold disabled:opacity-60">{extracting ? 'Extracting…' : 'Extract & fill fields'}</button>
              {extracting && <p role="status">{progress}</p>}
              {extracted && <>
                <p role="status">{Object.keys(extracted.fields).length} fields filled from {extracted.pageCount} page(s). Highlighted fields are suggestions to review. Unmatched information stays in the original document.</p>
                {extracted.warnings.length > 0 && <ul className="list-disc pl-5 text-amber-200">{extracted.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul>}
                <details><summary className="cursor-pointer font-bold">Review all extracted text</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-3 text-xs">{extracted.text || 'No text was readable. Review the original manually.'}</pre></details>
              </>}
            </div>}
            <div className="rounded-xl border border-white/10 p-3 text-[12px] leading-relaxed text-slate-300">
              The original application and any signature stay unchanged. This creates a filled, unsigned Bypass application; it does not transfer a signature or mark the source as signed. “Convert &amp; send to sign” emails the applicant a new signature request using saved CRM fields. The signer completes full identifiers and partner fields in that separate request.
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key} className={`block ${f.wide ? 'md:col-span-3' : ''}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{f.label}{extracted?.fields[f.key] !== undefined && <span className="ml-2 text-blue-300">Review</span>}</span>
                  <input
                    type={f.type || 'text'}
                    disabled={extracting || saving}
                    step={f.type === 'number' ? '0.01' : undefined}
                    value={form[f.key]}
                    onChange={(e) => set(f.key)(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[13px] text-white outline-none focus:border-blue-400"
                  />
                </label>
              ))}
            </div>

            <p className="text-[12px] text-slate-400">
              Full EIN and SSN, when provided, appear in the private generated PDF. Only the last four digits of the primary owner’s identifiers are saved to CRM fields. Partner details are saved in the PDF only. If left blank, the PDF uses the saved last four. Other details remain in the original; extracted text is not saved separately.
            </p>

            <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-1" checked={reviewed} disabled={extracting || saving} onChange={e=>setReviewed(e.target.checked)} /> I reviewed the values against the original, checked additional owners and missing information, and understand this Bypass copy is unsigned.</label>

            {error && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-100">{error}</div>}
            {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100"><CheckCircle2 size={15} /> {success}</div>}
          </div>

          <div className="flex flex-shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-5 py-3">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-[13px] font-bold text-slate-300 hover:bg-white/10">Cancel</button>
            <button
              type="button"
              disabled={saving || extracting || !reviewed}
              onClick={() => void submit(false)}
              title="Attach a filled Bypass application to the deal without contacting the merchant"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[13px] font-bold text-slate-100 hover:bg-white/10 disabled:opacity-60"
            >
              Attach only
            </button>
            <button type="button" onClick={() => void submit(true)} disabled={saving || extracting || !reviewed} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              <FileSignature size={15} />{saving ? 'Working...' : 'Convert & send to sign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
