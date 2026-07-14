import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, ArrowRightCircle, Phone, FileSignature } from 'lucide-react';
import { supabase, type LeadStatus } from '../../lib/supabase';
import { useLeads } from '../../hooks/useLeads';
import { useDocuments } from '../../hooks/useDocuments';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';
import NewApplicationModal from '../../components/admin/NewApplicationModal';

// A "lead" is anything not yet a full submission.
const leadOnlyStatuses: LeadStatus[] = ['New Lead', 'Contacted', 'Application Started'];
const REQUIRED_BANK_STATEMENTS = 4;

function money(value: number) {
  return value > 0 ? `$${value.toLocaleString()}` : '—';
}

export default function Applications() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');
  const [converting, setConverting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [sendingApp, setSendingApp] = useState<string | null>(null);
  const { data: allLeads, loading, error, refetch } = useLeads();
  const { data: documents } = useDocuments();

  const leads = useMemo(() => allLeads.filter((lead) => leadOnlyStatuses.includes(lead.status)), [allLeads]);

  // Seed the editable note boxes from Supabase without clobbering in-progress edits.
  useEffect(() => {
    setNoteDrafts((prev) => {
      const next = { ...prev };
      leads.forEach((lead) => {
        if (next[lead.id] === undefined) next[lead.id] = lead.notes || '';
      });
      return next;
    });
  }, [leads]);

  async function sendApplication(leadId: string) {
    setNotice(null);
    setSendingApp(leadId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/send-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token ?? ''}` },
        body: JSON.stringify({ leadId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Unable to send the application.');
      setNotice({ id: leadId, text: `Application emailed to ${payload.sentTo}.` });
      await refetch();
    } catch (err) {
      setNotice({ id: leadId, text: err instanceof Error ? err.message : 'Unable to send the application.' });
    } finally {
      setSendingApp(null);
    }
  }

  async function saveNote(leadId: string) {
    const draft = noteDrafts[leadId] ?? '';
    const original = leads.find((l) => l.id === leadId)?.notes || '';
    if (draft === original) return;
    setSavingNote(leadId);
    try {
      const { error: noteError } = await supabase.from('leads').update({ notes: draft }).eq('id', leadId);
      if (noteError) throw noteError;
      setSavedNote(leadId);
      window.setTimeout(() => setSavedNote((cur) => (cur === leadId ? null : cur)), 1500);
      await refetch();
    } catch (err) {
      setNotice({ id: leadId, text: err instanceof Error ? err.message : 'Unable to save note.' });
    } finally {
      setSavingNote(null);
    }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => !q || l.business_name.toLowerCase().includes(q));
  }, [leads, search]);

  const bankStatementCount = (leadId: string) =>
    documents.filter((doc) => doc.lead_id === leadId && doc.doc_type === 'Bank Statement').length;

  async function convertToSubmission(leadId: string) {
    setNotice(null);
    const count = bankStatementCount(leadId);
    if (count < REQUIRED_BANK_STATEMENTS) {
      setNotice({ id: leadId, text: `Full submissions require the last ${REQUIRED_BANK_STATEMENTS} months of bank statements (${count}/${REQUIRED_BANK_STATEMENTS} uploaded). Open the lead's file to upload them, then convert.` });
      return;
    }
    setConverting(leadId);
    try {
      const lead = leads.find((l) => l.id === leadId);
      const { data: authData } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { error: upErr } = await supabase.from('leads').update({ status: 'Under Review', submitted_at: now }).eq('id', leadId);
      if (upErr) throw upErr;
      await supabase.from('applications').insert({
        lead_id: leadId,
        status: 'Submitted',
        source: lead?.source || 'CRM',
        requested_amount: lead?.funding_amount_requested ?? 0,
        monthly_revenue: lead?.monthly_revenue ?? 0,
        assigned_to: authData?.user?.id,
        submitted_at: now,
      });
      await refetch();
    } catch (err) {
      setNotice({ id: leadId, text: err instanceof Error ? err.message : 'Unable to convert this lead.' });
    } finally {
      setConverting(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Leads</h1>
          <p className="text-[13px] text-slate-400">{loading ? 'Loading...' : `${leads.length} leads not yet submitted`}</p>
        </div>
        <button onClick={() => { setShowCreate(true); setSearchParams({ new: '1' }); }} className="btn-primary h-9 px-4 text-[13px]">
          <Plus size={14} /> New Application
        </button>
      </div>

      <div className="card mb-5 p-4">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name..."
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-4 text-[13px] placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader label="Loading leads from Supabase..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No leads" message="Create a new lead or wait for website leads to enter the CRM." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Company', 'Owner', 'Phone', 'Requested', 'Rev/mo', 'Rep', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-none align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-navy-900">{lead.business_name}</p>
                      <p className="text-[11px] text-slate-400">{lead.status}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{lead.first_name} {lead.last_name}</td>
                    <td className="px-4 py-3 text-[13px]">
                      {lead.phone
                        ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-accent-600 hover:underline"><Phone size={12} />{lead.phone}</a>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{money(lead.funding_amount_requested || 0)}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{money(lead.monthly_revenue || 0)}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{lead.assigned_rep || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <textarea
                        value={noteDrafts[lead.id] ?? ''}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                        onBlur={() => void saveNote(lead.id)}
                        placeholder="Add a note..."
                        rows={2}
                        className="w-[220px] resize-y rounded-md border border-slate-200 bg-white p-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                      <p className="mt-1 h-3 text-[10px] font-semibold text-slate-400">
                        {savingNote === lead.id ? 'Saving...' : savedNote === lead.id ? 'Saved' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void sendApplication(lead.id)}
                          disabled={sendingApp === lead.id}
                          title="Generate the Bypass application in signNow, prefilled, and email it for e-signature"
                          className="btn-secondary h-8 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FileSignature size={13} /> {sendingApp === lead.id ? 'Sending...' : 'Send app'}
                        </button>
                        <button
                          onClick={() => convertToSubmission(lead.id)}
                          disabled={converting === lead.id}
                          className="btn-primary h-8 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ArrowRightCircle size={13} /> {converting === lead.id ? 'Converting...' : 'Convert to submission'}
                        </button>
                      </div>
                      {notice?.id === lead.id && (
                        <p className="mt-2 max-w-[280px] text-right text-[11px] font-medium text-amber-600">{notice.text}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <NewApplicationModal onClose={() => { setShowCreate(false); setSearchParams({}); }} onCreated={() => void refetch()} />}
    </div>
  );
}
