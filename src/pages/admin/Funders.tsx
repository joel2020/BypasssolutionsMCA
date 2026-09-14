import { useEffect, useState } from 'react';
import { Plus, Phone, Mail, X, Pencil } from 'lucide-react';
import { supabase, type FundingPartner } from '../../lib/supabase';
import { useCreateFundingPartner, useFundingPartners } from '../../hooks/usePartnerSubmissions';
import { useScope } from '../../hooks/useScope';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { fundingPartnerForm, parseFundingPartnerForm, type FundingPartnerForm } from '../../lib/fundingPartnerFields';

function currency(value?: number | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

// Handles both creating a new partner and editing an existing one.
function FundingPartnerModal({ partner, onClose, onSaved }: { partner?: FundingPartner | null; onClose: () => void; onSaved: () => void }) {
  const { createFundingPartner, loading } = useCreateFundingPartner();
  const isEdit = Boolean(partner);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => fundingPartnerForm(partner));
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const payload = parseFundingPartnerForm(form);
      if (isEdit && partner) {
        setSaving(true);
        const { data, error: updateError } = await supabase
          .from('funding_partners')
          .update({
            name: payload.name,
            contact_name: payload.contactName || null,
            email: payload.email || null,
            phone: payload.phone || null,
            min_revenue: payload.minRevenue,
            max_funding: payload.maxFunding,
            industries_accepted: payload.industriesAccepted,
            notes: payload.notes || null,
            status: payload.status,
            ...payload.criteria,
          })
          .eq('id', partner.id)
          .select('id')
          .single();
        if (updateError) throw updateError;
        if (!data?.id) throw new Error('Funding partner was not updated. Refresh and try again.');
      } else {
        await createFundingPartner(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save funding partner.');
    } finally {
      setSaving(false);
    }
  }

  const busy = loading || saving;

  function field(key: keyof FundingPartnerForm, label: string, options: { type?: string; placeholder?: string; whole?: boolean; wide?: boolean; min?: number; max?: number } = {}) {
    return <label key={key} className={`block ${options.wide ? 'md:col-span-2' : ''}`}>
      <span className="text-[12px] font-semibold text-slate-600">{label}</span>
      <input required={key === 'name'} type={options.type ?? 'text'} min={options.type === 'number' ? options.min ?? 0 : undefined} max={options.max} step={options.type === 'number' ? options.whole ? 1 : 'any' : undefined} className="input-field mt-1.5" placeholder={options.placeholder} value={form[key]} onChange={(event) => update(key, event.target.value as FundingPartnerForm[typeof key])} />
    </label>;
  }

  function notesField(key: 'notes' | 'criteriaNotes' | 'bonusNotes', label: string) {
    return <label className="block"><span className="text-[12px] font-semibold text-slate-600">{label}</span><textarea className="input-field mt-1.5 min-h-24" value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="funding-partner-title" className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="funding-partner-title" className="text-[20px] font-bold text-navy-900">{isEdit ? 'Edit Funding Partner' : 'Add Funding Partner'}</h2>
            <p className="text-[13px] text-slate-500">{isEdit ? 'Update this lender/funder record.' : 'Create a lender/funder record for submissions.'}</p>
          </div>
          <button disabled={busy} aria-label="Close funding partner editor" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {field('name', 'Partner name')}
              {field('contactName', 'Contact name')}
              {field('email', 'Contact email', { type: 'email' })}
              {field('phone', 'Phone', { type: 'tel' })}
              <label className="block"><span className="text-[12px] font-semibold text-slate-600">Status</span>
                <select className="select-field mt-1.5" value={form.status} onChange={(event) => update('status', event.target.value as 'Active' | 'Inactive')}>
                  <option value="Active">Active</option><option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <section className="space-y-4 border-t border-slate-200 pt-5" aria-labelledby="submission-routing-title">
              <h3 id="submission-routing-title" className="font-semibold text-navy-900">Submission routing</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {field('submissionEmail', 'Submission email', { type: 'email' })}
                <label className="block"><span className="text-[12px] font-semibold text-slate-600">Preferred submission method</span>
                  <select className="select-field mt-1.5" value={form.preferredSubmissionMethod} onChange={(event) => update('preferredSubmissionMethod', event.target.value as FundingPartnerForm['preferredSubmissionMethod'])}>
                    <option value="email">Email</option><option value="portal">Portal</option><option value="api">API</option><option value="manual">Manual</option>
                  </select>
                </label>
                {field('additionalCcEmails', 'Additional CC emails', { wide: true, placeholder: 'rep2@funder.com, rep3@funder.com' })}
                <p className="text-[12px] text-slate-500 md:col-span-2">Separate addresses with commas. Submissions use the submission email, falling back to the contact email. The contact email and these additional addresses are copied, excluding duplicates and the primary recipient.</p>
                {field('portalUrl', 'Portal URL', { type: 'url', wide: true, placeholder: 'https://portal.example.com' })}
              </div>
            </section>
            <section className="space-y-4 border-t border-slate-200 pt-5" aria-labelledby="funding-criteria-title">
              <h3 id="funding-criteria-title" className="font-semibold text-navy-900">Funding criteria</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {field('minFunding', 'Minimum funding', { type: 'number' })}
                {field('maxFunding', 'Maximum funding', { type: 'number' })}
                {field('minRevenue', 'Minimum monthly revenue', { type: 'number' })}
                {field('minMonths', 'Minimum months in business', { type: 'number', whole: true })}
                {field('minCreditScore', 'Minimum credit / FICO', { type: 'number', whole: true, min: 300, max: 850 })}
                {field('maxPositions', 'Maximum existing positions', { type: 'number', whole: true })}
                {field('maxNegativeDays', 'Maximum negative days', { type: 'number', whole: true })}
                {field('maxNsfCount', 'Maximum NSF count', { type: 'number', whole: true })}
                {field('avgApprovalDays', 'Average decision days', { type: 'number', whole: true })}
                {field('statesServed', 'States served', { placeholder: 'NY, NJ, FL' })}
                {field('restrictedStates', 'Restricted states', { placeholder: 'TX, CA, PR' })}
                {field('productTypes', 'Product types')}
                {field('industriesAccepted', 'Industries accepted / preferred', { placeholder: 'Restaurants, Retail, Construction' })}
                {field('restrictedIndustries', 'Restricted industries', { placeholder: 'Cannabis, gambling' })}
                {field('requiredDocuments', 'Required documents', { wide: true, placeholder: 'completed_application, bank_statements, drivers_license, voided_check' })}
              </div>
              <p className="text-[12px] text-slate-500">Separate states, industries, products and required documents with commas. Leave optional criteria blank when unspecified.</p>
            </section>
            {notesField('criteriaNotes', 'Criteria notes')}
            {notesField('notes', 'Notes / rules')}
            {notesField('bonusNotes', 'Bonus notes')}
          </fieldset>
          {error && <div role="alert" className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" disabled={busy} onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Partner'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Funders() {
  const { data: funders, loading, error, refetch } = useFundingPartners();
  const { isAdmin } = useScope();
  const [selected, setSelected] = useState<FundingPartner | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FundingPartner | null>(null);

  useEffect(() => {
    setSelected((current) => {
      // Re-read the selected partner from the refreshed list so edits show immediately.
      if (current) {
        const fresh = funders.find((funder) => funder.id === current.id);
        if (fresh) return fresh;
      }
      return funders.length > 0 ? funders[0] : null;
    });
  }, [funders]);

  if (loading) return <div className="p-6 lg:p-8"><SkeletonLoader label="Loading funding partners from Supabase..." /></div>;
  if (error) return <div className="p-6 lg:p-8"><ErrorState message={error} /></div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Funding Partners</h1>
          <p className="text-[13px] text-slate-400">{funders.length} funding partner{funders.length === 1 ? '' : 's'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-4 text-[13px]">
            <Plus size={14} /> Add Funding Partner
          </button>
        )}
      </div>

      {funders.length === 0 ? (
        <EmptyState title="No funding partners yet" message="Add your first lender or funding partner to start sending submission packages." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-2.5">
            {funders.map((funder) => (
              <button
                key={funder.id}
                onClick={() => setSelected(funder)}
                className={`card p-4 text-left transition-all ${selected?.id === funder.id ? 'border-accent-400 bg-accent-50' : 'hover:border-slate-300'}`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-navy-900">{funder.name}</p>
                  <span className={`badge text-[10px] ${funder.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {funder.status}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400">
                  Max: {currency(funder.max_funding)} · Min rev: {currency(funder.min_revenue)}/mo
                </p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <div className="card p-7">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-bold text-navy-900">{selected.name}</h2>
                    <span className={`badge mt-1 text-[11px] ${selected.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {selected.status}
                    </span>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setEditing(selected)} className="btn-secondary h-9 px-4 text-[13px]">
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                </div>

                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Contact</p>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                          {selected.contact_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-[14px] text-slate-700">{selected.contact_name || 'No contact listed'}</span>
                      </div>
                      {selected.email && <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-[14px] text-accent-600 hover:underline"><Mail size={14} /> {selected.email}</a>}
                      {selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-[14px] text-slate-600"><Phone size={14} /> {selected.phone}</a>}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Requirements</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Min Monthly Revenue', value: currency(selected.min_revenue) },
                        { label: 'Max Funding', value: currency(selected.max_funding) },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between gap-3 text-[13px]">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="font-medium text-slate-700">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selected.industries_accepted && selected.industries_accepted.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Industries Accepted</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.industries_accepted.map((ind) => <span key={ind} className="badge-default text-[12px]">{ind}</span>)}
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-slate-400">Notes</p>
                    <p className="text-[14px] text-slate-600">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && <FundingPartnerModal onClose={() => setShowAdd(false)} onSaved={() => void refetch()} />}
      {editing && <FundingPartnerModal partner={editing} onClose={() => setEditing(null)} onSaved={() => void refetch()} />}
    </div>
  );
}
