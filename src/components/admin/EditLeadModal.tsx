import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { supabase, type Lead } from '../../lib/supabase';
import { useReps } from '../../hooks/useReps';
import { buildPayload, initialForm } from '../../lib/leadEditFields';
import LeadFieldsGrid from './LeadFieldsGrid';

/**
 * Full edit of a deal from the opportunity page — every field, including
 * reassigning the rep (which also changes who can see the deal under RLS).
 */
export default function EditLeadModal({ lead, onClose, onSaved }: { lead: Lead; onClose: () => void; onSaved: () => void }) {
  const { data: reps } = useReps();
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(lead));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: string, value: string) => setForm((cur) => ({ ...cur, [key]: value }));

  async function save() {
    setError(null);
    setMessage(null);
    if (!(form.business_name ?? '').trim()) {
      setError('Business name is required.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from('leads').update(buildPayload(form)).eq('id', lead.id);
      if (updateError) throw updateError;
      setMessage('Saved.');
      onSaved();
      window.setTimeout(onClose, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4 lg:items-center">
      <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-[20px] font-bold text-navy-900">Edit {lead.business_name || 'deal'}</h2>
            <p className="text-[13px] text-slate-500">Update any field, including the assigned rep.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <LeadFieldsGrid form={form} set={set} reps={reps} />
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          {message && <div className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[13px] text-green-700"><CheckCircle2 size={15} /> {message}</div>}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}
