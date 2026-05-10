import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Plus, X } from 'lucide-react';
import { supabase, type LeadStatus } from '../../lib/supabase';
import { useLeads } from '../../hooks/useLeads';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import { leadProgressMap, leadStatusColors } from '../../lib/status';

const leadOnlyStatuses: LeadStatus[] = ['New Lead', 'Contacted', 'Application Started'];
const fullSubmissionStatuses: LeadStatus[] = ['Documents Needed', 'Under Review', 'Pre-Approved', 'Offer Sent', 'Funded'];

type ApplicationTab = 'leads' | 'submissions';

function money(value: number) {
  return value > 0 ? `$${value.toLocaleString()}` : '—';
}

function NewApplicationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    industry: '',
    requestedAmount: '',
    monthlyRevenue: '',
    assignedRep: 'Christopher Roman',
    source: 'CRM',
    type: 'lead' as ApplicationTab,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isSubmission = form.type === 'submissions';
      const requestedAmount = Number(form.requestedAmount || 0);
      const monthlyRevenue = Number(form.monthlyRevenue || 0);
      const now = new Date().toISOString();

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          business_name: form.businessName.trim(),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          industry: form.industry.trim() || 'Not specified',
          funding_amount_requested: requestedAmount,
          requested_amount: requestedAmount,
          monthly_revenue: monthlyRevenue,
          gross_monthly_revenue: monthlyRevenue,
          status: isSubmission ? 'Under Review' : 'New Lead',
          assigned_rep: form.assignedRep.trim() || 'Unassigned',
          source: form.source.trim() || 'CRM',
          notes: form.notes.trim(),
          consent: true,
          submitted_at: isSubmission ? now : null,
        })
        .select('*')
        .single();

      if (leadError) throw leadError;

      if (isSubmission) {
        const { error: appError } = await supabase.from('applications').insert({
          lead_id: lead.id,
          status: 'Submitted',
          source: form.source.trim() || 'CRM',
          requested_amount: requestedAmount,
          monthly_revenue: monthlyRevenue,
          submitted_at: now,
        });

        if (appError) throw appError;
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create application.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-navy-900">Create New Applicant</h2>
            <p className="text-[13px] text-slate-500">Add a lead-only record or mark it as a full submission.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => update('type', 'leads')} className={`rounded-xl border p-4 text-left ${form.type === 'leads' ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <p className="text-[14px] font-bold text-navy-900">Lead only</p>
              <p className="mt-1 text-[12px] text-slate-500">Not enough documents or details for lender submission yet.</p>
            </button>
            <button type="button" onClick={() => update('type', 'submissions')} className={`rounded-xl border p-4 text-left ${form.type === 'submissions' ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <p className="text-[14px] font-bold text-navy-900">Full submission</p>
              <p className="mt-1 text-[12px] text-slate-500">Creates the lead and an application record for underwriting.</p>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Business name</span><input required className="input-field mt-1.5" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Industry</span><input className="input-field mt-1.5" value={form.industry} onChange={(e) => update('industry', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">First name</span><input required className="input-field mt-1.5" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Last name</span><input required className="input-field mt-1.5" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Email</span><input required type="email" className="input-field mt-1.5" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Phone</span><input className="input-field mt-1.5" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Requested amount</span><input type="number" min="0" className="input-field mt-1.5" value={form.requestedAmount} onChange={(e) => update('requestedAmount', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Monthly revenue</span><input type="number" min="0" className="input-field mt-1.5" value={form.monthlyRevenue} onChange={(e) => update('monthlyRevenue', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Assigned rep</span><input className="input-field mt-1.5" value={form.assignedRep} onChange={(e) => update('assignedRep', e.target.value)} /></label>
            <label className="block"><span className="text-[12px] font-semibold text-slate-600">Source</span><input className="input-field mt-1.5" value={form.source} onChange={(e) => update('source', e.target.value)} /></label>
          </div>

          <label className="block"><span className="text-[12px] font-semibold text-slate-600">Internal notes</span><textarea className="input-field mt-1.5 min-h-24" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label>
          {error && <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating...' : 'Create Applicant'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Applications() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationTab>('leads');
  const [showCreate, setShowCreate] = useState(false);
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
        <button onClick={() => setShowCreate(true)} className="btn-primary h-9 px-4 text-[13px]">
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
                        <span>Requested: <strong className="text-slate-700">{money(lead.funding_amount_requested || lead.requested_amount || 0)}</strong></span>
                        <span>Revenue: <strong className="text-slate-700">{money(lead.monthly_revenue || lead.gross_monthly_revenue || 0)}/mo</strong></span>
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

      {showCreate && <NewApplicationModal onClose={() => setShowCreate(false)} onCreated={() => void refetch()} />}
    </div>
  );
}
