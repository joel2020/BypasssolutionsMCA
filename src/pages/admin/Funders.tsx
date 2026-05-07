import { useState, useEffect } from 'react';
import { Plus, Phone, Mail } from 'lucide-react';
import { supabase, type Funder } from '../../lib/supabase';

export default function Funders() {
  const [funders, setFunders] = useState<Funder[]>([]);
  const [selected, setSelected] = useState<Funder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('funders')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setFunders(data as Funder[]);
          if (data.length > 0) setSelected(data[0] as Funder);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Funders</h1>
          <p className="text-[13px] text-slate-400">{funders.length} funding partners</p>
        </div>
        <button className="btn-primary h-9 text-[13px] px-4">
          <Plus size={14} /> Add Funder
        </button>
      </div>

      {funders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[15px] text-slate-400">No funders yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="flex flex-col gap-2.5">
            {funders.map((funder) => (
              <button
                key={funder.id}
                onClick={() => setSelected(funder)}
                className={`text-left card p-4 transition-all ${selected?.id === funder.id ? 'border-accent-400 bg-accent-50' : 'hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-semibold text-navy-900">{funder.name}</p>
                  <span className={`badge text-[10px] ${funder.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {funder.status}
                  </span>
                </div>
                <p className="text-[12px] text-slate-400">
                  Max: ${(funder.max_funding / 1000).toFixed(0)}k · Min rev: ${(funder.min_revenue / 1000).toFixed(0)}k/mo
                </p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <div className="card p-7">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[20px] font-bold text-navy-900">{selected.name}</h2>
                    <span className={`badge text-[11px] mt-1 ${selected.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {selected.status}
                    </span>
                  </div>
                  <button className="btn-secondary h-9 text-[13px] px-4">Edit</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Contact</p>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600">
                          {selected.contact_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-[14px] text-slate-700">{selected.contact_name}</span>
                      </div>
                      {selected.email && (
                        <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-[14px] text-accent-600 hover:underline">
                          <Mail size={14} /> {selected.email}
                        </a>
                      )}
                      {selected.phone && (
                        <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-[14px] text-slate-600">
                          <Phone size={14} /> {selected.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Requirements</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Min Monthly Revenue', value: `$${selected.min_revenue.toLocaleString()}` },
                        { label: 'Min Time in Business', value: selected.min_time_in_business },
                        { label: 'Max Funding', value: `$${selected.max_funding.toLocaleString()}` },
                        { label: 'States Served', value: selected.states },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between text-[13px]">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="font-medium text-slate-700">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selected.industries_accepted?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Industries Accepted</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.industries_accepted.map((ind) => (
                        <span key={ind} className="badge-default text-[12px]">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                    <p className="text-[14px] text-slate-600">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
