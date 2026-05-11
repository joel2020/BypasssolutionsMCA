import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Eye, Plus } from 'lucide-react';
import { type LeadStatus } from '../../lib/supabase';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { leadProgressMap, leadStatusColors } from '../../lib/status';
import NewApplicationModal from '../../components/admin/NewApplicationModal';

const leadOnlyStatuses: LeadStatus[] = ['New Lead', 'Contacted', 'Application Started'];
const fullSubmissionStatuses: LeadStatus[] = ['Documents Needed', 'Under Review', 'Pre-Approved', 'Offer Sent', 'Funded'];

type ApplicationTab = 'leads' | 'submissions';

function money(value: number) {
  return value > 0 ? `$${value.toLocaleString()}` : '—';
}

export default function Applications() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationTab>('leads');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');
  const { data: allLeads, loading, error, refetch } = useLeads();

  const tabLeads = allLeads.filter((lead) => activeTab === 'leads'
    ? leadOnlyStatuses.includes(lead.status)
    : fullSubmissionStatuses.includes(lead.status)
  );

  const filtered = tabLeads.filter(l => {
    const q = search.toLowerCase();
    return !q || l.business_name.toLowerCase().includes(q) || `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
  });

  const leadOnlyCount = allLeads.filter((lead) => leadOnlyStatuses.includes(lead.status)).length;
  const submissionCount = allLeads.filter((lead) => fullSubmissionStatuses.includes(lead.status)).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Applications</h1>
          <p className="text-[13px] text-slate-400">
            {loading ? 'Loading...' : `${leadOnlyCount} leads · ${submissionCount} full submissions`}
          </p>
        </div>
        <button onClick={() => { setShowCreate(true); setSearchParams({ new: '1' }); }} className="btn-primary h-9 px-4 text-[13px]">
          <Plus size={14} /> New Application
        </button>
      </div>

      <div className="card mb-5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button onClick={() => setActiveTab('leads')} className={`rounded-md px-4 py-2 text-[13px] font-semibold ${activeTab === 'leads' ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-slate-800'}`}>Leads not full submissions ({leadOnlyCount})</button>
            <button onClick={() => setActiveTab('submissions')} className={`rounded-md px-4 py-2 text-[13px] font-semibold ${activeTab === 'submissions' ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-slate-800'}`}>Full submissions ({submissionCount})</button>
          </div>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search applicants..."
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-4 text-[13px] placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader label="Loading applications from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title={activeTab === 'leads' ? 'No lead-only records' : 'No full submissions'} message={activeTab === 'leads' ? 'Create a new applicant or wait for website leads to enter the CRM.' : 'Full submissions will appear here once they have documents or underwriting review.'} />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((lead) => {
            const progress = leadProgressMap[lead.status] ?? 10;
            return (
              <div key={lead.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-[13px] font-bold text-white">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-navy-900">{lead.business_name}</h3>
                        <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${leadStatusColors[lead.status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                          {lead.status}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-500">{lead.first_name} {lead.last_name} · {lead.industry || 'No industry listed'}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[12px] text-slate-400">
                        <span>Requested: <strong className="text-slate-700">{money(lead.funding_amount_requested || 0)}</strong></span>
                        <span>Revenue: <strong className="text-slate-700">{money(lead.monthly_revenue || 0)}/mo</strong></span>
                        <span>Rep: <strong className="text-slate-700">{lead.assigned_rep || 'Unassigned'}</strong></span>
                        <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/admin/leads/${lead.id}`} className="btn-secondary h-9 flex-shrink-0 px-4 text-[13px]">
                    <Eye size={14} /> View
                  </Link>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">Application Progress</span>
                    <span className="text-[12px] font-semibold text-slate-600">{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-accent-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <NewApplicationModal onClose={() => { setShowCreate(false); setSearchParams({}); }} onCreated={() => void refetch()} initialMode={activeTab === 'submissions' ? 'submission' : 'lead'} />}
    </div>
  );
}
