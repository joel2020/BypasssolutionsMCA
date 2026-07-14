import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarClock, CircleDollarSign, FileSignature, FileText, Mail, Phone, RefreshCw, Send, Upload, UserRound, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from './Dashboard';
import { useLead } from '../../hooks/useLead';
import { useOffers } from '../../hooks/useOffers';
import { useTasks } from '../../hooks/useTasks';
import { useDocuments } from '../../hooks/useDocuments';
import { useNotes } from '../../hooks/useNotes';
import { useApplicationByLead } from '../../hooks/useApplications';
import { usePartnerSubmissions } from '../../hooks/usePartnerSubmissions';
import { sendGmailEmail, syncGmail, useGmailMessages, type GmailMessage } from '../../hooks/useGmail';
import { DocumentList, PartnerSubmissionList, SubmitToLenderModal, UploadDocumentModal } from '../../components/admin/CrmWorkflowComponents';
import ConvertToBypassModal from '../../components/admin/ConvertToBypassModal';
import { createDocumentSignedUrl } from '../../hooks/useDocuments';
import { ErrorState, NotFoundState, SkeletonLoader } from '../../components/admin/States';
import { leadStatusColors, pipelineStages, stageForStatus, statusForStage } from '../../lib/status';
import { maskAccount, maskEIN, maskSSN } from '../../utils/mask';
import { supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useScope } from '../../hooks/useScope';

const tabs = ['Overview', 'Business Info', 'Owner Info', 'Documents', 'Email Activity', 'Lender Submissions', 'Offers', 'Tasks', 'Notes', 'Activity Timeline'];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

type ExtendedLead = Record<string, unknown>;

function text(lead: ExtendedLead, key: string, fallback = '—') {
  const value = lead[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(lead: ExtendedLead, key: string) {
  const value = lead[key];
  return typeof value === 'number' ? value : 0;
}

export default function LeadDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showUpload, setShowUpload] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailActionError, setEmailActionError] = useState<string | null>(null);
  const { data: lead, loading, error, notFound, refetch: refetchLead } = useLead(id);
  const { profile } = useCurrentUser();
  const { canAccess } = useScope();
  const isAdmin = profile?.role === 'admin';
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingApp, setSendingApp] = useState(false);
  const [convertSource, setConvertSource] = useState<{ url: string | null; name: string } | null>(null);
  const [appResult, setAppResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendEsignApplication() {
    setSendingApp(true);
    setAppResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/send-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ leadId: id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Unable to send the application.');
      setAppResult({ ok: true, text: `Application emailed to ${payload.sentTo} (${payload.prefilled} fields prefilled).` });
      await refetchLead();
    } catch (err) {
      setAppResult({ ok: false, text: err instanceof Error ? err.message : 'Unable to send the application.' });
    } finally {
      setSendingApp(false);
    }
  }

  // The dropdown shows the 7 pipeline stage names; we persist the underlying status value.
  async function changeStatus(selection: string) {
    const next = statusForStage(selection) ?? selection;
    setSavingStatus(true);
    try {
      await supabase.from('leads').update({ status: next }).eq('id', id);
      await refetchLead();
    } finally {
      setSavingStatus(false);
    }
  }
  const { data: application, refetch: refetchApplication } = useApplicationByLead(id);
  const { data: offers } = useOffers(id);
  const { data: tasks } = useTasks({ leadId: id });
  const { data: documents, refetch: refetchDocuments } = useDocuments({ leadId: id, applicationId: application?.id });
  const { data: submissions, refetch: refetchSubmissions } = usePartnerSubmissions(application?.id);
  const { data: notes } = useNotes(id);
  const { data: gmailMessages, refetch: refetchGmailMessages } = useGmailMessages({ leadId: id });

  if (loading) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><SkeletonLoader label="Loading application..." /></div>;
  if (error) return <div className="min-h-screen bg-[#071225] p-6 lg:p-8"><ErrorState message={error} /></div>;
  if (notFound || !lead) return <NotFoundState />;

  // A rep may not open a deal that is not assigned to them.
  if (!canAccess(lead.assigned_rep)) {
    return (
      <div className="min-h-screen bg-[#071225] p-6 text-white lg:p-8">
        <Link to="/admin/applications" className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Back</Link>
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-amber-400/20 bg-amber-500/10 p-8 text-center">
          <h1 className="text-[20px] font-bold text-amber-100">This deal isn't assigned to you</h1>
          <p className="mt-2 text-[14px] text-amber-200/80">
            It belongs to {lead.assigned_rep || 'another rep'}. Ask an admin if you need access.
          </p>
        </div>
      </div>
    );
  }

  const extended = lead as unknown as ExtendedLead;
  const ownerName = `${lead.first_name} ${lead.last_name}`.trim() || text(extended, 'owner_full_name');
  const statusClass = leadStatusColors[lead.status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const currentApplicationId = application?.id ?? null;

  return (
    <div className="min-h-screen bg-[#071225] text-white">
      <div className="border-b border-white/10 bg-[#071225]/80 px-6 py-4 backdrop-blur lg:px-8">
        <Link to="/admin/applications" className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Leads</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-[28px] font-black tracking-tight">{lead.business_name}</h1>{isAdmin ? <select value={stageForStatus(lead.status) ?? lead.status} disabled={savingStatus} onChange={(e) => changeStatus(e.target.value)} className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] font-bold outline-none ${statusClass}`}>{pipelineStages.map((stage) => <option key={stage.label} value={stage.label} className="text-slate-900">{stage.label}</option>)}<option value="Declined" className="text-slate-900">Declined</option><option value="Lost" className="text-slate-900">Lost</option></select> : <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${statusClass}`}>{stageForStatus(lead.status) ?? lead.status}</span>}</div>
            <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-slate-400"><span className="inline-flex items-center gap-1.5"><UserRound size={14} />{ownerName}</span><span className="inline-flex items-center gap-1.5"><Mail size={14} />{lead.email}</span><span className="inline-flex items-center gap-1.5"><Phone size={14} />{lead.phone}</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void sendEsignApplication()} disabled={sendingApp} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"><FileSignature size={15} />{sendingApp ? 'Sending...' : 'Send e-sign App'}</button>
            <button onClick={() => setShowEmail(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13px] font-black text-white"><Mail size={15} />Send Email</button>
            <button onClick={() => setShowUpload(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.08] px-4 text-[13px] font-black text-white ring-1 ring-white/10 hover:bg-white/[0.12]"><Upload size={15} />Upload Document</button>
            {isAdmin && <button disabled={!currentApplicationId} onClick={() => setShowSubmit(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />Submit to Lender</button>}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-right"><p className="text-[12px] text-slate-400">Requested</p><p className="text-[22px] font-black text-white">{currency.format(lead.funding_amount_requested)}</p></div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        {appResult && (
          <div className={`mb-4 rounded-xl border p-4 text-[13px] ${appResult.ok ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-red-400/20 bg-red-500/10 text-red-100'}`}>
            {appResult.text}
          </div>
        )}
        <div className="mb-5 overflow-x-auto"><div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`h-10 rounded-lg px-4 text-[13px] font-bold transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}>{tab}</button>)}</div></div>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <GlassCard className="p-6">
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-blue-300">Business info</p>
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field icon={<Building2 size={16} />} label="Business" value={lead.business_name} />
                    <Field label="Industry" value={lead.industry} />
                    <Field label="Entity type" value={text(extended, 'entity_type')} />
                    <Field icon={<CircleDollarSign size={16} />} label="Requested funding" value={currency.format(lead.funding_amount_requested)} />
                    <Field label="Monthly revenue" value={currency.format(lead.monthly_revenue)} />
                    <Field icon={<CalendarClock size={16} />} label="Submitted" value={new Date(lead.created_at).toLocaleDateString()} />
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-blue-300">Owner info</p>
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field icon={<UserRound size={16} />} label="Owner name" value={ownerName} />
                    <Field label="Title" value={text(extended, 'owner_title')} />
                    <Field label="Ownership" value={lead.ownership_pct} />
                    <Field icon={<Mail size={16} />} label="Email" value={lead.email} />
                    <Field icon={<Phone size={16} />} label="Phone" value={lead.phone} />
                    <Field label="Assigned rep" value={lead.assigned_rep || 'Unassigned'} />
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-blue-300">Notes</p>
                  <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[14px] text-slate-200">{lead.notes || 'No notes added.'}</div>
                </div>
              </div>
            )}
            {activeTab === 'Business Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Legal name" value={lead.business_name} /><Field label="DBA" value={lead.dba} /><Field label="Industry" value={lead.industry} /><Field label="Entity type" value={text(extended, 'entity_type')} /><Field label="Business start date" value={text(extended, 'start_date')} /><Field label="Masked EIN" value={maskEIN(text(extended, 'ein_last_four', ''))} /></div>}
            {activeTab === 'Owner Info' && <div className="grid gap-5 md:grid-cols-3"><Field label="Owner name" value={ownerName} /><Field label="Title" value={text(extended, 'owner_title')} /><Field label="Ownership" value={lead.ownership_pct} /><Field label="Email" value={lead.email} /><Field label="Phone" value={lead.phone} /><Field label="Masked SSN" value={maskSSN(text(extended, 'ssn_last_four', ''))} /></div>}
            {activeTab === 'Underwriting' && <div className="grid gap-5 md:grid-cols-4"><Field label="Average daily balance" value={currency.format(lead.avg_daily_balance)} /><Field label="Monthly deposits" value={currency.format(lead.monthly_deposits)} /><Field label="NSFs last 90 days" value={String(numberValue(extended, 'nsfs_last_90_days'))} /><Field label="Current MCA balances" value={currency.format(numberValue(extended, 'current_mca_balances'))} /><Field label="Account" value={maskAccount(text(extended, 'account_last_four', ''))} /></div>}
            {activeTab === 'Documents' && (
              <DocumentList
                documents={documents}
                onChanged={() => void refetchDocuments()}
                onConvert={async (doc) => {
                  let url: string | null = null;
                  try {
                    url = await createDocumentSignedUrl(doc.storage_path || doc.file_path || '');
                  } catch {
                    // the rep can still fill it in by hand
                  }
                  setConvertSource({ url, name: doc.file_name || 'uploaded application' });
                }}
              />
            )}
            {activeTab === 'Email Activity' && <EmailActivity messages={gmailMessages} lastContactAt={lead.last_contact_at} onSend={() => setShowEmail(true)} onSync={async () => { setEmailActionError(null); try { await syncGmail(); await refetchGmailMessages(); } catch (err) { setEmailActionError(err instanceof Error ? err.message : 'Unable to sync Gmail.'); } }} error={emailActionError} />}
            {activeTab === 'Lender Submissions' && <PartnerSubmissionList submissions={submissions} leadId={id} onChanged={refetchSubmissions} />}
            {activeTab === 'Offers' && <List items={offers.map((offer) => `${offer.funder_name}: ${currency.format(offer.funding_amount)} • ${offer.status}`)} empty="No offers created." />}
            {activeTab === 'Communications' && <p className="text-[14px] text-slate-400">Communications are loaded from Supabase communication tables in the dedicated Email, SMS, and Calls pages.</p>}
            {activeTab === 'Tasks' && <List items={tasks.map((task) => `${task.title} • ${task.status}`)} empty="No tasks assigned." />}
            {activeTab === 'Notes' && <List items={notes.map((note) => `${note.created_by_name}: ${note.text}`)} empty="No notes added." />}
            {activeTab === 'Activity Timeline' && <List items={[`Created ${new Date(lead.created_at).toLocaleString()}`, `Last updated ${new Date(lead.updated_at).toLocaleString()}`, `${documents.length} document(s) uploaded`, `${submissions.length} lender submission(s)`]} empty="No activity logged." />}
          </GlassCard>
          <GlassCard className="p-5"><h3 className="text-[16px] font-bold text-white">Quick Facts</h3><div className="mt-4 space-y-4"><Field label="Requested" value={currency.format(lead.funding_amount_requested)} /><Field label="Monthly revenue" value={currency.format(lead.monthly_revenue)} /><Field label="Documents" value={String(documents.length)} /><Field label="Lender submissions" value={String(submissions.length)} /></div></GlassCard>
        </div>
      </div>
      {showEmail && <LeadEmailModal leadEmail={lead.email} leadId={id} onClose={() => setShowEmail(false)} onSent={() => { void refetchGmailMessages(); }} />}
      {convertSource && lead && (
        <ConvertToBypassModal
          lead={lead}
          sourceUrl={convertSource.url}
          sourceName={convertSource.name}
          onClose={() => setConvertSource(null)}
          onDone={() => { void refetchLead(); void refetchDocuments(); }}
        />
      )}
      {showUpload && <UploadDocumentModal leadId={id} applicationId={currentApplicationId} onClose={() => setShowUpload(false)} onUploaded={() => { void refetchDocuments(); void refetchApplication(); }} />}
      {showSubmit && currentApplicationId && <SubmitToLenderModal leadId={id} applicationId={currentApplicationId} documents={documents} onClose={() => setShowSubmit(false)} onSubmitted={refetchSubmissions} />}
    </div>
  );
}


function EmailActivity({ messages, lastContactAt, onSend, onSync, error }: { messages: GmailMessage[]; lastContactAt: string | null; onSend: () => void; onSync: () => Promise<void>; error: string | null }) {
  const [syncing, setSyncing] = useState(false);
  async function runSync() {
    setSyncing(true);
    try { await onSync(); } finally { setSyncing(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div><p className="text-[14px] font-bold text-white">Email Activity</p><p className="mt-1 text-[12px] text-slate-400">Last contact: {lastContactAt ? new Date(lastContactAt).toLocaleString() : 'No contact logged yet'}</p></div>
        <div className="flex gap-2"><button onClick={() => void runSync()} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-slate-200 hover:bg-white/10"><RefreshCw size={13} />{syncing ? 'Syncing...' : 'Sync Gmail'}</button><button onClick={onSend} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-[12px] font-bold text-white"><Send size={13} />Send Email</button></div>
      </div>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[13px] text-red-100">{error}</div>}
      {messages.length === 0 ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-[14px] text-slate-400">No Gmail messages matched to this lead yet.</div> : messages.map((message) => <div key={message.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-bold text-white">{message.subject || '(No subject)'}</p><p className="mt-1 text-[12px] text-slate-400">{message.direction} • {message.from_email || '—'} → {message.to_emails?.join(', ') || '—'}</p></div><span className="text-[12px] text-slate-400">{message.sent_at ? new Date(message.sent_at).toLocaleString() : '—'}</span></div><p className="mt-3 text-[13px] text-slate-300">{message.snippet || message.body_text?.slice(0, 240)}</p></div>)}
    </div>
  );
}

function LeadEmailModal({ leadEmail, leadId, onClose, onSent }: { leadEmail: string; leadId?: string | null; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await sendGmailEmail({ to: leadEmail, subject, body, lead_id: leadId });
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email.');
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1730] p-5 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-[18px] font-black tracking-tight">Send Gmail Email</h3><button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><XCircle size={18} /></button></div>
        <div className="space-y-4"><label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">To</span><input value={leadEmail} disabled className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-slate-300" /></label><label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none focus:border-blue-400" /></label><label className="block"><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Body</span><textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-2 min-h-44 w-full rounded-xl border border-white/10 bg-white/[0.06] p-3 text-[14px] text-white outline-none focus:border-blue-400" /></label>{error && <p className="text-[13px] text-red-200">{error}</p>}<button disabled={sending || !subject || !body} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />{sending ? 'Sending...' : 'Send Email'}</button></div>
      </form>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return <div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{icon}{label}</p><p className="mt-1 text-[15px] font-semibold text-white">{value || '—'}</p></div>;
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[14px] text-slate-400">{empty}</p>;
  return <div className="space-y-3">{items.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-[14px] text-slate-200"><FileText size={14} className="mr-2 inline text-blue-300" />{item}</div>)}</div>;
}
