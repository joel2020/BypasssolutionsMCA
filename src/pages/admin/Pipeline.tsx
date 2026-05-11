import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type LeadStatus } from '../../lib/supabase';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { canonicalLeadStatuses, leadStatusColors } from '../../lib/status';

export default function Pipeline() {
  const { data: leads, loading, error, refetch } = useLeads();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function moveLead(leadId: string, nextStatus: LeadStatus) {
    setMovingId(leadId);
    setFeedback(null);
    const { error: updateError } = await supabase
      .from('leads')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    setMovingId(null);

    if (updateError) {
      setFeedback(updateError.message);
      return;
    }

    setFeedback(`Pipeline status updated to ${nextStatus}.`);
    await refetch();
  }

  if (loading) return <div className="p-6 lg:p-8"><SkeletonLoader label="Loading pipeline from Supabase..." /></div>;
  if (error) return <div className="p-6 lg:p-8"><ErrorState message={error} /></div>;
  if (leads.length === 0) return <div className="p-6 lg:p-8"><EmptyState title="No pipeline records" message="Create an application or lead to populate the MCA pipeline." /></div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Pipeline</h1>
          <p className="text-[13px] text-slate-400">{leads.length} total leads · controlled status movement</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-[13px] ${feedback.includes('updated') ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
          {feedback}
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {canonicalLeadStatuses.map((status) => {
            const colLeads = leads.filter((l) => l.status === status);
            const totalAmount = colLeads.reduce((sum, l) => sum + (l.funding_amount_requested || 0), 0);

            return (
              <div key={status} className="w-[286px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold ${leadStatusColors[status]}`}>
                      {status}
                    </span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-400">
                      {colLeads.length}
                    </span>
                  </div>
                  {colLeads.length > 0 && totalAmount > 0 && (
                    <span className="text-[11px] text-slate-400">${(totalAmount / 1000).toFixed(0)}k</span>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {colLeads.map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md">
                      <Link to={`/admin/leads/${lead.id}`} className="block">
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {lead.first_name?.[0]}{lead.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-800">
                              {lead.first_name} {lead.last_name}
                            </p>
                          </div>
                        </div>

                        <p className="mb-2 truncate text-[12px] text-slate-500">{lead.business_name || '—'}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-navy-900">
                            {lead.funding_amount_requested ? `$${lead.funding_amount_requested.toLocaleString()}` : '—'}
                          </span>
                          <span className="text-[11px] text-slate-400">{lead.assigned_rep}</span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="truncate text-[11px] text-slate-400">{lead.industry?.split('&')[0]?.trim() || '—'}</span>
                          <span className="text-[11px] text-slate-400">{lead.source}</span>
                        </div>
                      </Link>

                      <label className="mt-3 block border-t border-slate-100 pt-3">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Move status</span>
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-700 outline-none focus:border-accent-500"
                          value={lead.status}
                          disabled={movingId === lead.id}
                          onChange={(event) => void moveLead(lead.id, event.target.value as LeadStatus)}
                        >
                          {canonicalLeadStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
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
