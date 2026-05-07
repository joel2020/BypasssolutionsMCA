import { useState, useEffect } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { supabase, type Offer, type Funder } from '../../lib/supabase';

const statusColors: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Sent: 'bg-blue-50 text-blue-700',
  Viewed: 'bg-cyan-50 text-cyan-700',
  Accepted: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  'Contract Sent': 'bg-teal-50 text-teal-700',
  Expired: 'bg-slate-100 text-slate-400',
};

export default function Offers() {
  const [offers, setOffers] = useState<(Offer & { leads?: { first_name: string; last_name: string; business_name: string } })[]>([]);
  const [funders, setFunders] = useState<Funder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('offers').select('*, leads(first_name, last_name, business_name)').order('created_at', { ascending: false }),
      supabase.from('funders').select('*').eq('status', 'Active').order('name'),
    ]).then(([{ data: offersData }, { data: fundersData }]) => {
      if (offersData) setOffers(offersData as any);
      if (fundersData) setFunders(fundersData as Funder[]);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('offers').update({ status }).eq('id', id);
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status: status as Offer['status'] } : o));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Offers</h1>
          <p className="text-[13px] text-slate-400">{loading ? 'Loading...' : `${offers.length} funding offers`}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary h-9 text-[13px] px-4">
          <Plus size={14} /> Create Offer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[15px] text-slate-400">No offers created yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {offers.map((offer) => {
            const leadName = offer.leads
              ? `${offer.leads.first_name} ${offer.leads.last_name} — ${offer.leads.business_name}`
              : 'Unknown Lead';

            return (
              <div key={offer.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold text-navy-900">{leadName}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${statusColors[offer.status] || 'bg-slate-100 text-slate-600'}`}>
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-500">
                      Funder: <strong>{offer.funder_name}</strong> · Created {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                    { label: 'Funding Amount', value: `$${offer.funding_amount.toLocaleString()}`, highlight: true },
                    { label: 'Payback Amount', value: `$${offer.payback_amount.toLocaleString()}` },
                    { label: 'Factor Rate', value: offer.factor_rate.toFixed(2) },
                    { label: 'Est. Payment', value: `$${offer.estimated_payment.toLocaleString()}` },
                    { label: 'Term', value: offer.term },
                    { label: 'Frequency', value: offer.frequency },
                    { label: 'Commission', value: `$${offer.commission_amount.toLocaleString()} (${offer.commission_pct}%)` },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className={`text-[14px] font-semibold ${item.highlight ? 'text-accent-600' : 'text-slate-800'}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                  {offer.status === 'Draft' && (
                    <button
                      onClick={() => updateStatus(offer.id, 'Sent')}
                      className="btn-primary h-8 text-[12px] px-3"
                    >
                      Send to Client <ArrowRight size={12} />
                    </button>
                  )}
                  {offer.status === 'Sent' && (
                    <button
                      onClick={() => updateStatus(offer.id, 'Contract Sent')}
                      className="btn-primary h-8 text-[12px] px-3"
                    >
                      Send Contract <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-navy-900">Create Funding Offer</h2>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600 text-[22px] leading-none">&times;</button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Funder</label>
                <select className="select-field">
                  <option value="">Select funder...</option>
                  {funders.map(f => <option key={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Funding Amount</label>
                  <input className="input-field" placeholder="50000" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Factor Rate</label>
                  <input className="input-field" placeholder="1.35" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Term</label>
                  <input className="input-field" placeholder="12 months" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Payment Frequency</label>
                  <select className="select-field">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Commission %</label>
                  <input className="input-field" placeholder="6" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button className="btn-primary flex-1 justify-center">Save as Draft</button>
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
