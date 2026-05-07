import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type Lead, type LeadStatus } from '../../lib/supabase';
import { statusColors } from '../../data/mockData';

const columns: LeadStatus[] = [
  'New Lead', 'Contacted', 'Application Started', 'Docs Requested',
  'Docs Received', 'Underwriting', 'Offers Available', 'Contract Sent', 'Funded',
];

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setLeads(data as Lead[]);
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
          <h1 className="text-[20px] font-bold text-navy-900">Pipeline</h1>
          <p className="text-[13px] text-slate-400">{leads.length} total leads</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((status) => {
            const colLeads = leads.filter((l) => l.status === status);
            const totalAmount = colLeads.reduce((sum, l) => sum + (l.funding_amount_requested || 0), 0);

            return (
              <div key={status} className="w-[260px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${statusColors[status]}`}>
                      {status}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-400 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center">
                      {colLeads.length}
                    </span>
                  </div>
                  {colLeads.length > 0 && totalAmount > 0 && (
                    <span className="text-[11px] text-slate-400">${(totalAmount / 1000).toFixed(0)}k</span>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {colLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      to={`/admin/leads/${lead.id}`}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:-translate-y-px transition-all duration-150 cursor-pointer block"
                    >
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                          {lead.first_name?.[0]}{lead.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">
                            {lead.first_name} {lead.last_name}
                          </p>
                        </div>
                      </div>

                      <p className="text-[12px] text-slate-500 mb-2 truncate">{lead.business_name || '—'}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-navy-900">
                          {lead.funding_amount_requested ? `$${lead.funding_amount_requested.toLocaleString()}` : '—'}
                        </span>
                        <span className="text-[11px] text-slate-400">{lead.assigned_rep}</span>
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-slate-400 truncate">{lead.industry?.split('&')[0]?.trim() || '—'}</span>
                        <span className="text-[11px] text-slate-400">{lead.source}</span>
                      </div>
                    </Link>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                      <p className="text-[12px] text-slate-400">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
