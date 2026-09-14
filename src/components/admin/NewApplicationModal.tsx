import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useReps } from '../../hooks/useReps';

interface NewApplicationModalProps {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

export default function NewApplicationModal({ onClose, onCreated }: NewApplicationModalProps) {
  const { data: reps } = useReps();
  const [form, setForm] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    industry: '',
    requestedAmount: '',
    monthlyRevenue: '',
    assignedRep: '',
    source: 'CRM',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const requestedAmount = Number(form.requestedAmount || 0);
      const monthlyRevenue = Number(form.monthlyRevenue || 0);

      if (!form.businessName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
        throw new Error('Business name, owner name, email, and phone are required.');
      }
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error('Requested funding amount must be greater than zero.');
      }
      if (!Number.isFinite(monthlyRevenue) || monthlyRevenue < 0) {
        throw new Error('Monthly revenue cannot be negative.');
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Your CRM session expired. Sign in again and retry.');
      }

      const assignedProfile = reps.find((rep) => (rep.full_name || rep.email) === form.assignedRep);
      if (form.assignedRep && !assignedProfile) throw new Error('Choose an active rep before creating the lead.');

      // Always create a LEAD. Full submissions are made via "Convert to submission"
      // from the Leads table, which requires the last 4 months of bank statements.
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          business_name: form.businessName.trim(),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          industry: form.industry.trim() || 'Not specified',
          funding_amount_requested: requestedAmount,
          requested_amount: requestedAmount,
          monthly_revenue: monthlyRevenue,
          gross_monthly_revenue: monthlyRevenue,
          status: 'New Lead',
          assigned_rep: form.assignedRep.trim() || 'Unassigned',
          assigned_to: assignedProfile?.id ?? authData.user.id,
          created_by: authData.user.id,
          source: form.source.trim() || 'CRM',
          notes: form.notes.trim(),
          consent: true,
          submitted_at: null,
        });

      if (leadError) throw new Error(leadError.message);

      setSuccess('Lead created.');
      await onCreated();
      window.setTimeout(onClose, 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create lead.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 lg:items-center">
      <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-[20px] font-bold text-navy-900">New Lead</h2>
            <p className="text-[13px] text-slate-500">Create a CRM lead. Convert it to a full submission once the last 4 months of bank statements are uploaded.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Business name</span><input required className="input-field mt-1.5" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Industry</span><input className="input-field mt-1.5" value={form.industry} onChange={(e) => update('industry', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">First name</span><input required className="input-field mt-1.5" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Last name</span><input required className="input-field mt-1.5" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Email</span><input required type="email" className="input-field mt-1.5" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Phone</span><input required className="input-field mt-1.5" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Requested amount</span><input required type="number" min="1" className="input-field mt-1.5" value={form.requestedAmount} onChange={(e) => update('requestedAmount', e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Monthly revenue</span><input type="number" min="0" className="input-field mt-1.5" value={form.monthlyRevenue} onChange={(e) => update('monthlyRevenue', e.target.value)} /></label>
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-600">Assigned rep</span>
                <select className="select-field mt-1.5" value={form.assignedRep} onChange={(e) => update('assignedRep', e.target.value)}>
                  <option value="">Unassigned</option>
                  {reps.map((rep) => {
                    const name = rep.full_name || rep.email;
                    return <option key={rep.id} value={name}>{name}</option>;
                  })}
                </select>
              </label>
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Source</span><input className="input-field mt-1.5" value={form.source} onChange={(e) => update('source', e.target.value)} /></label>
            </div>

            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Internal notes</span><textarea className="input-field mt-1.5 min-h-20 resize-y" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label>
            {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
            {success && <div className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-[13px] text-green-700"><CheckCircle2 size={15} /> {success}</div>}
          </div>
          <div className="flex flex-shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating...' : 'Create Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
