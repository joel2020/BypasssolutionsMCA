import { useEffect, useState } from 'react';
import { Plus, Phone, Mail, X } from 'lucide-react';
import { type FundingPartner } from '../../lib/supabase';
import { useCreateFundingPartner, useFundingPartners } from '../../hooks/usePartnerSubmissions';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

function currency(value?: number | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function AddFundingPartnerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { createFundingPartner, loading } = useCreateFundingPartner();
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    minRevenue: '',
    maxFunding: '',
    industriesAccepted: '',
    notes: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await createFundingPartner({
        name: form.name,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        minRevenue: Number(form.minRevenue || 0),
        maxFunding: Number(form.maxFunding || 0),
        industriesAccepted: form.industriesAccepted.split(',').map((item) => item.trim()).filter(Boolean),
        notes: form.notes,
        status: form.status,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add funding partner.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-navy-900">Add Funding Partner</h2>
            <p className="text-[13px] text-slate-500">Create a lender/funder record for submissions.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Partner name</span><input required className="input-field mt-1.5" value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Contact name</span><input className="input-field mt-1.5" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Email</span><input type="email" className="input-field mt-1.5" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Phone</span><input className="input-field mt-1.5" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Minimum monthly revenue</span><input type="number" min="0" className="input-field mt-1.5" value={form.minRevenue} onChange={(e) => update('minRevenue', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Maximum funding</span><input type="number" min="0" className="input-field mt-1.5" value={form.maxFunding} onChange={(e) => update('maxFunding', e.target.value)} /></label>
            <label className="block md:col-span-2"><span className="text-[12px] font-semibold text-slate-600">Industries accepted</span><input className="input-field mt-1.5" placeholder="Restaurants, Retail, Construction" value={form.industriesAccepted} onChange={(e) => update('industriesAccepted', e.target.value)} /></label>
          </div>
          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Notes</span><textarea className="input-field mt-1.5 min-h-24" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label>
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={loading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Saving...' : 'Add Partner'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Funders() {
  const { data: funders, loading, error, refetch } = useFundingPartners();
  const [selected, setSelected] = useState<FundingPartner | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setSelected((current) => {
      if (current && funders.some((funder) => funder.id === current.id)) return current;
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
        <button onClick={() => setShowAdd(true)} className="btn-primary h-9 px-4 text-[13px]">
          <Plus size={14} /> Add Funding Partner
        </button>
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
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-[20px] font-bold text-navy-900">{selected.name}</h2>
                    <span className={`badge mt-1 text-[11px] ${selected.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {selected.status}
                    </span>
                  </div>
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

      {showAdd && <AddFundingPartnerModal onClose={() => setShowAdd(false)} onCreated={() => void refetch()} />}
    </div>
  );
}
