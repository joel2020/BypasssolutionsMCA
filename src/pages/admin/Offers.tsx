import { useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { supabase, type Offer } from '../../lib/supabase';
import { useOffers } from '../../hooks/useOffers';
import { useFunders } from '../../hooks/useFunders';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

const statusColors: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600', Sent: 'bg-blue-50 text-blue-700', Viewed: 'bg-cyan-50 text-cyan-700', Accepted: 'bg-green-50 text-green-700', Rejected: 'bg-red-50 text-red-700', 'Contract Sent': 'bg-teal-50 text-teal-700', Expired: 'bg-slate-100 text-slate-400',
};

type OfferWithLead = Offer & { leads?: { first_name: string; last_name: string; business_name: string } | null };

export default function Offers() {
  const { data: offerRows, loading: offersLoading, error: offersError, refetch } = useOffers();
  const { data: funders, loading: fundersLoading, error: fundersError } = useFunders();
  const { data: leads } = useLeads();
  const offers = offerRows as OfferWithLead[];
  const loading = offersLoading || fundersLoading;
  const error = offersError || fundersError;
  const [showNew, setShowNew] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ lead_id: '', funder_name: '', funding_amount: '', factor_rate: '', term: '', frequency: 'Daily', commission_pct: '' });

  const updateStatus = async (id: string, status: Offer['status']) => {
    const { error: updateError } = await supabase.from('offers').update({ status }).eq('id', id);
    setFeedback(updateError ? updateError.message : 'Offer saved successfully.');
    if (!updateError) await refetch();
  };

  const saveOffer = async () => {
    const fundingAmount = Number(form.funding_amount) || 0;
    const factorRate = Number(form.factor_rate) || 0;
    const commissionPct = Number(form.commission_pct) || 0;
    const paybackAmount = fundingAmount * factorRate;
    const { error: insertError } = await supabase.from('offers').insert({
      lead_id: form.lead_id,
      funder_name: form.funder_name,
      funding_amount: fundingAmount,
      payback_amount: paybackAmount,
      factor_rate: factorRate,
      estimated_payment: 0,
      term: form.term,
      frequency: form.frequency,
      commission_pct: commissionPct,
      commission_amount: fundingAmount * (commissionPct / 100),
      status: 'Draft',
      created_by_name: 'System',
    });
    setFeedback(insertError ? insertError.message : 'Offer saved successfully.');
    if (!insertError) {
      setShowNew(false);
      setForm({ lead_id: '', funder_name: '', funding_amount: '', factor_rate: '', term: '', frequency: 'Daily', commission_pct: '' });
      await refetch();
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6"><div><h1 className="text-[20px] font-bold text-navy-900">Offers</h1><p className="text-[13px] text-slate-400">{loading ? 'Loading...' : `${offers.length} funding offers`}</p></div><button onClick={() => setShowNew(true)} className="btn-primary h-9 text-[13px] px-4"><Plus size={14} /> Create Offer</button></div>
      {feedback && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[13px] text-blue-700">{feedback}</div>}
      {loading ? <SkeletonLoader label="Loading offers from Supabase..." /> : error ? <ErrorState message={error} /> : offers.length === 0 ? <EmptyState title="No offers created yet" message="Supabase returned no funding offers." /> : (
        <div className="flex flex-col gap-5">{offers.map((offer) => {
          const leadName = offer.leads ? `${offer.leads.first_name} ${offer.leads.last_name} — ${offer.leads.business_name}` : 'Unknown Lead';
          return <div key={offer.id} className="card p-6"><div className="flex items-start justify-between gap-4 flex-wrap mb-5"><div><div className="flex items-center gap-2 mb-1"><h3 className="text-[16px] font-semibold text-navy-900">{leadName}</h3><span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${statusColors[offer.status] || 'bg-slate-100 text-slate-600'}`}>{offer.status}</span></div><p className="text-[13px] text-slate-500">Funder: <strong>{offer.funder_name}</strong> · Created {new Date(offer.created_at).toLocaleDateString()}</p></div></div><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">{[{ label: 'Funding Amount', value: `$${offer.funding_amount.toLocaleString()}`, highlight: true }, { label: 'Payback Amount', value: `$${offer.payback_amount.toLocaleString()}` }, { label: 'Factor Rate', value: offer.factor_rate.toFixed(2) }, { label: 'Est. Payment', value: `$${offer.estimated_payment.toLocaleString()}` }, { label: 'Term', value: offer.term }, { label: 'Frequency', value: offer.frequency }, { label: 'Commission', value: `$${offer.commission_amount.toLocaleString()} (${offer.commission_pct}%)` }].map((item) => <div key={item.label}><p className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p><p className={`text-[14px] font-semibold ${item.highlight ? 'text-accent-600' : 'text-slate-800'}`}>{item.value}</p></div>)}</div><div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">{offer.status === 'Draft' && <button onClick={() => updateStatus(offer.id, 'Sent')} className="btn-primary h-8 text-[12px] px-3">Send to Client <ArrowRight size={12} /></button>}{offer.status === 'Sent' && <button onClick={() => updateStatus(offer.id, 'Contract Sent')} className="btn-primary h-8 text-[12px] px-3">Send Contract <ArrowRight size={12} /></button>}</div></div>;
        })}</div>
      )}
      {showNew && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-7"><div className="flex items-center justify-between mb-5"><h2 className="text-[18px] font-bold text-navy-900">Create Funding Offer</h2><button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600 text-[22px] leading-none">&times;</button></div><div className="flex flex-col gap-4"><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Lead</label><select className="select-field" value={form.lead_id} onChange={(e) => setForm((prev) => ({ ...prev, lead_id: e.target.value }))}><option value="">Select lead...</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.business_name}</option>)}</select></div><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Funder</label><select className="select-field" value={form.funder_name} onChange={(e) => setForm((prev) => ({ ...prev, funder_name: e.target.value }))}><option value="">Select funder...</option>{funders.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Funding Amount</label><input className="input-field" placeholder="50000" value={form.funding_amount} onChange={(e) => setForm((prev) => ({ ...prev, funding_amount: e.target.value }))} /></div><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Factor Rate</label><input className="input-field" placeholder="1.35" value={form.factor_rate} onChange={(e) => setForm((prev) => ({ ...prev, factor_rate: e.target.value }))} /></div><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Term</label><input className="input-field" placeholder="12 months" value={form.term} onChange={(e) => setForm((prev) => ({ ...prev, term: e.target.value }))} /></div><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Payment Frequency</label><select className="select-field" value={form.frequency} onChange={(e) => setForm((prev) => ({ ...prev, frequency: e.target.value }))}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div><div><label className="block text-[13px] font-medium text-slate-700 mb-1.5">Commission %</label><input className="input-field" placeholder="6" value={form.commission_pct} onChange={(e) => setForm((prev) => ({ ...prev, commission_pct: e.target.value }))} /></div></div></div><div className="flex gap-2 mt-6"><button onClick={saveOffer} className="btn-primary flex-1 justify-center">Save as Draft</button><button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button></div></div></div>}
    </div>
  );
}
