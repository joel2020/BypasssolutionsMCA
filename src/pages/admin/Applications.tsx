import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { activeLeadStatuses, leadProgressMap, leadStatusColors } from '../../lib/status';

export default function Applications() {
  const [search, setSearch] = useState('');
  const { data: allLeads, loading, error } = useLeads();
  const leads = allLeads.filter((lead) => activeLeadStatuses.includes(lead.status));

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return !q || l.business_name.toLowerCase().includes(q) || `${l.first_name} ${l.last_name}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Applications</h1>
          <p className="text-[13px] text-slate-400">
            {loading ? 'Loading...' : `${filtered.length} application${filtered.length !== 1 ? 's' : ''} in review`}
          </p>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search applications..."
            className="h-9 w-full max-w-sm bg-slate-50 border border-slate-200 rounded-md pl-8 pr-4 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader label="Loading applications from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No active applications" message="Supabase returned no active application records." />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((lead) => {
            const progress = leadProgressMap[lead.status] ?? 10;
            return (
              <div key={lead.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-navy-900 flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[16px] font-semibold text-navy-900">{lead.business_name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold ${leadStatusColors[lead.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {lead.status}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-500">{lead.first_name} {lead.last_name} · {lead.industry}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-[12px] text-slate-400 flex-wrap">
                        {lead.funding_amount_requested > 0 && (
                          <span>Requested: <strong className="text-slate-700">${lead.funding_amount_requested.toLocaleString()}</strong></span>
                        )}
                        {lead.monthly_revenue > 0 && (
                          <span>Revenue: <strong className="text-slate-700">${lead.monthly_revenue.toLocaleString()}/mo</strong></span>
                        )}
                        <span>Rep: <strong className="text-slate-700">{lead.assigned_rep}</strong></span>
                        <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/admin/leads/${lead.id}`} className="btn-secondary h-9 text-[13px] px-4 flex-shrink-0">
                    <Eye size={14} /> View
                  </Link>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-slate-400">Application Progress</span>
                    <span className="text-[12px] font-semibold text-slate-600">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-accent-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {lead.status === 'Documents Needed' && (
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Waiting on documents from client
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
