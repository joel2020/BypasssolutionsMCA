import { useState } from 'react';
import { CheckCircle2, ExternalLink, FileSignature, XCircle } from 'lucide-react';
import { supabase, type Lead } from '../../lib/supabase';

/**
 * "Convert to Bypass application".
 *
 * A rep uploads another broker's application (Elite, etc). This carries every
 * detail across into a Bypass-branded application, renders it as a completed PDF,
 * and attaches it to the deal. The applicant is NOT contacted.
 *
 * The application's own authorisation language permits sharing the information
 * and documents between brokers/assignees, which is what this does. The document
 * the applicant actually signed stays attached as the executed instrument — we
 * don't reproduce their signature onto a different agreement.
 */
interface Props {
  lead: Lead;
  /** Signed URL of the uploaded application, so the rep can read it while typing. */
  sourceUrl?: string | null;
  sourceName?: string;
  /** The uploaded third-party application, marked as the executed document. */
  sourceDocumentId?: string;
  onClose: () => void;
  onDone: () => void;
}

type Form = Record<string, string>;

const FIELDS: Array<{ key: string; label: string; col: string; wide?: boolean; type?: string }> = [
  { key: 'legal_name', label: 'Legal business name', col: 'legal_name' },
  { key: 'dba', label: 'DBA', col: 'dba' },
  { key: 'business_address', label: 'Business address', col: 'business_address', wide: true },
  { key: 'city', label: 'City', col: 'city' },
  { key: 'state', label: 'State', col: 'state' },
  { key: 'zip', label: 'ZIP', col: 'zip' },
  { key: 'business_phone', label: 'Business phone', col: 'business_phone' },
  { key: 'business_email', label: 'Business email', col: 'business_email' },
  { key: 'website', label: 'Website', col: 'website' },
  { key: 'start_date', label: 'Business start date', col: 'start_date', type: 'date' },
  { key: 'entity_type', label: 'Entity type', col: 'entity_type' },
  { key: 'industry', label: 'Industry', col: 'industry' },
  { key: 'funding_amount_requested', label: 'Requested amount ($)', col: 'funding_amount_requested', type: 'number' },
  { key: 'use_of_funds', label: 'Use of funds', col: 'use_of_funds' },
  { key: 'annual_revenue', label: 'Gross annual revenue ($)', col: 'annual_revenue', type: 'number' },
  { key: 'owner_full_name', label: 'Owner full name', col: 'owner_full_name' },
  { key: 'owner_title', label: 'Owner title', col: 'owner_title' },
  { key: 'ownership_pct', label: 'Ownership %', col: 'ownership_pct' },
  { key: 'owner_dob', label: 'Owner date of birth', col: 'owner_dob', type: 'date' },
  { key: 'phone', label: 'Owner mobile', col: 'phone' },
  { key: 'owner_home_address', label: 'Owner home address', col: 'owner_home_address', wide: true },
];

export default function ConvertToBypassModal({ lead, sourceUrl, sourceName, sourceDocumentId, onClose, onDone }: Props) {
  const record = lead as unknown as Record<string, unknown>;
  const [form, setForm] = useState<Form>(() =>
    FIELDS.reduce<Form>((acc, f) => {
      const value = record[f.col];
      acc[f.key] = value === null || value === undefined || value === 0 ? '' : String(value);
      return acc;
    }, {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = (key: string) => (value: string) => setForm((cur) => ({ ...cur, [key]: value }));

  /**
   * `send` = also email the merchant the Bypass application to sign.
   *
   * That signature is what makes the application genuinely Bypass's — it is the
   * difference between telling a funder the deal came from Bypass and it
   * actually having done so.
   */
  async function submit(send: boolean) {
    setError(null);
    setSuccess(null);

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
      const numeric = new Set(['funding_amount_requested', 'annual_revenue']);
      const patch: Record<string, unknown> = {};
      for (const f of FIELDS) {
        const raw = form[f.key].trim();
        if (numeric.has(f.col)) patch[f.col] = Number(raw.replace(/[^\d.]/g, '')) || 0;
        else patch[f.col] = raw;
      }
      // keep the mirrored columns in step so nothing renders as $0
      patch.requested_amount = patch.funding_amount_requested;
      patch.business_name = patch.legal_name;
      if (!record.email && form.business_email) patch.email = form.business_email.trim();

      const { error: updateError } = await supabase.from('leads').update(patch).eq('id', lead.id);
      if (updateError) throw updateError;

      const { data: sessionData } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
      };

      // Always attach a completed Bypass application to the deal.
      const genRes = await fetch('/api/generate-application', {
        method: 'POST',
        headers,
        body: JSON.stringify({ leadId: lead.id, sourceDocumentId }),
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

        <form onSubmit={(e) => { e.preventDefault(); void submit(true); }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-bold text-blue-200 hover:bg-white/10">
                <ExternalLink size={13} /> Open the uploaded application to copy from
              </a>
            )}

            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-[12px] leading-relaxed text-blue-100">
              <strong className="text-white">Convert &amp; send to sign</strong> attaches the completed Bypass application
              and emails it to the merchant — one tap for them. Their signature is what makes this genuinely Bypass's
              application, which is what a funder relies on. <strong className="text-white">Attach only</strong> files the
              completed app without contacting them; in that case the document they already signed remains the executed one.
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {FIELDS.map((f) => (
                <label key={f.key} className={`block ${f.wide ? 'md:col-span-3' : ''}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{f.label}</span>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => set(f.key)(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[13px] text-white outline-none focus:border-blue-400"
                  />
                </label>
              ))}
            </div>

            <p className="text-[12px] text-slate-400">
              EIN and SSN print masked (last four only) — the full numbers are never stored, so they are never rendered.
            </p>

            {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-100">{error}</div>}
            {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100"><CheckCircle2 size={15} /> {success}</div>}
          </div>

          <div className="flex flex-shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-5 py-3">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-[13px] font-bold text-slate-300 hover:bg-white/10">Cancel</button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(false)}
              title="Attach a completed Bypass application to the deal without contacting the merchant"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[13px] font-bold text-slate-100 hover:bg-white/10 disabled:opacity-60"
            >
              Attach only
            </button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              <FileSignature size={15} />{saving ? 'Working...' : 'Convert & send to sign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
