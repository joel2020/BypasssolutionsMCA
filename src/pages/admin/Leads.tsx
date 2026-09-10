import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Upload, Download, ChevronDown } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { useReps } from '../../hooks/useReps';
import { useScope } from '../../hooks/useScope';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { leadStatusColors } from '../../lib/status';
import type { LeadStatus } from '../../lib/supabase';
import NewApplicationModal from '../../components/admin/NewApplicationModal';

// Submissions = a lead that already has an application or better.
// Lead-only records live on the Leads tab and never appear here.
const submissionStatuses: LeadStatus[] = ['Documents Needed', 'Under Review', 'Pre-Approved', 'Offer Sent', 'Funded'];
const sources = ['All', 'Website', 'Google Ads', 'Referral', 'Facebook', 'Instagram'];

export default function Leads() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterRep, setFilterRep] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [showAddLead, setShowAddLead] = useState(false);
  const { data: leads, loading, error, refetch } = useLeads({ status: filterStatus === 'All' ? 'All' : filterStatus as never, assignedRep: filterRep, source: filterSource });
  const { data: repProfiles } = useReps();
  const { canAccess } = useScope();

  const reps = ['All', ...repProfiles.map((rep) => rep.full_name || rep.email), 'Unassigned'];

  const filtered = leads.filter((l) => {
    if (!submissionStatuses.includes(l.status)) return false;
    if (!canAccess(l.assigned_rep, l.assigned_to)) return false; // reps only see their own deals
    const q = search.toLowerCase();
    return (
      !q ||
      l.first_name.toLowerCase().includes(q) ||
      l.last_name.toLowerCase().includes(q) ||
      l.business_name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  });

  const exportLeads = () => {
    if (filtered.length === 0) return;

    const headers = ['First Name', 'Last Name', 'Business', 'Email', 'Phone', 'Industry', 'Requested Amount', 'Monthly Revenue', 'Status', 'Rep', 'Source'];
    const rows = filtered.map((lead) => [
      lead.first_name,
      lead.last_name,
      lead.business_name,
      lead.email,
      lead.phone,
      lead.industry,
      lead.funding_amount_requested ?? '',
      lead.monthly_revenue ?? '',
      lead.status,
      lead.assigned_rep,
      lead.source,
    ]);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Submissions</h1>
          <p className="text-[13px] text-slate-400">
            {loading ? 'Loading...' : `${filtered.length} submission${filtered.length !== 1 ? 's' : ''} (application or better)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary h-9 text-[13px] px-4 gap-2 opacity-60 cursor-not-allowed"
            title="Lead import is not configured yet."
            disabled
          >
            <Upload size={14} /> Import
          </button>
          <button
            type="button"
            onClick={exportLeads}
            disabled={filtered.length === 0}
            className="btn-secondary h-9 text-[13px] px-4 gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            title={filtered.length === 0 ? 'No leads to export.' : 'Export visible leads as CSV.'}
          >
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowAddLead(true)} className="btn-primary h-9 text-[13px] px-4 gap-2">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, business, email..."
            className="h-9 w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-4 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {[
          { label: 'Status', value: filterStatus, set: setFilterStatus, options: ['All', ...submissionStatuses] },
          { label: 'Rep', value: filterRep, set: setFilterRep, options: reps },
          { label: 'Source', value: filterSource, set: setFilterSource, options: sources },
        ].map((f) => (
          <div key={f.label} className="relative">
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-md text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent-500 appearance-none cursor-pointer"
            >
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonLoader label="Loading leads from Supabase..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No leads found" message="Supabase returned no leads matching the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Lead', 'Business', 'Industry', 'Requested', 'Revenue', 'Status', 'Rep', 'Source', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-600 flex-shrink-0">
                          {lead.first_name?.[0]}{lead.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-slate-800 whitespace-nowrap">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-slate-700 whitespace-nowrap">{lead.business_name}</p>
                      <p className="text-[11px] text-slate-400">{lead.state}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-slate-600 whitespace-nowrap max-w-[130px] truncate">{lead.industry}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-slate-800">
                        {lead.funding_amount_requested ? `$${lead.funding_amount_requested.toLocaleString()}` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-slate-700">
                        {lead.monthly_revenue ? `$${lead.monthly_revenue.toLocaleString()}/mo` : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-sm text-[11px] font-semibold whitespace-nowrap ${leadStatusColors[lead.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-slate-600 whitespace-nowrap">{lead.assigned_rep}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-slate-600">{lead.source}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/leads/${lead.id}`}
                        className="text-[13px] text-accent-600 hover:text-accent-700 font-medium whitespace-nowrap"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-[15px] text-slate-400">No leads found.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {showAddLead && <NewApplicationModal onClose={() => setShowAddLead(false)} onCreated={() => void refetch()} />}
    </div>
  );
}
