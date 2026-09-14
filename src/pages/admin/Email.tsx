import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, Link as LinkIcon, Mail, RefreshCw, Search, Send, Unlink, X } from 'lucide-react';
import { disconnectGmail, getGmailConnection, sendGmailEmail, startGmailConnection, syncGmail, useGmailMessages, type GmailMessage } from '../../hooks/useGmail';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

const templates = [
  { id: 'T1', name: 'Initial Follow-Up', subject: 'Thanks for your interest — Bypass Solution', body: 'Hi {{first_name}},\n\nThank you for your interest in Bypass Solution. I would love to learn more about your business and funding goals. Are you available for a quick call this week?\n\nBest regards,\nBypass Solution' },
  { id: 'T2', name: 'Document Request', subject: 'Documents Needed — {{business_name}} Application', body: 'Hi {{first_name}},\n\nTo continue reviewing your application, please upload your bank statements, driver license, voided check, tax returns, MCA position sheet, processing statements, business docs, and any contract documents.\n\nBest regards,\nBypass Solution' },
  { id: 'T3', name: 'Offer Available', subject: 'Funding Offer Ready for Review — {{business_name}}', body: 'Hi {{first_name}},\n\nGreat news — funding offer options are ready for review. Reply here or call us so we can walk through the terms together.\n\nBest regards,\nBypass Solution' },
  { id: 'T4', name: 'Contract Reminder', subject: 'Action Required — Contract Signature for {{business_name}}', body: 'Hi {{first_name}},\n\nI wanted to follow up on the contract sent for signature. Please review it carefully and let me know if you have any questions.\n\nBest regards,\nBypass Solution' },
  { id: 'T5', name: 'Renewal Outreach', subject: 'Renewal Funding Available — {{business_name}}', body: 'Hi {{first_name}},\n\nYou may be eligible for renewal funding. Would you be open to a quick call to explore your options?\n\nBest regards,\nBypass Solution' },
];

type Filter = 'all' | 'inbound' | 'outbound' | 'matched' | 'unmatched';

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function MessageLead({ message }: { message: GmailMessage }) {
  if (!message.leads) return <span className="text-slate-400">Unmatched</span>;
  const name = `${message.leads.first_name} ${message.leads.last_name}`.trim();
  return <span>{message.leads.business_name || name || message.leads.email}</span>;
}

function ComposePanel({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sentWarning, setSentWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      const result = await sendGmailEmail({ to, cc, subject, body });
      onSent();
      if (result.warning) setSentWarning(result.warning);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-[18px] font-bold text-navy-900">Compose Gmail Email</h2><button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="space-y-3">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-accent-500" />
          <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc optional" className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-accent-500" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-10 w-full rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-accent-500" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." className="min-h-48 w-full rounded-md border border-slate-200 p-3 text-[13px] outline-none focus:border-accent-500" />
          {error && <ErrorState message={error} />}
          {sentWarning && <p role="status" className="text-sm text-amber-700">{sentWarning}</p>}
          <button disabled={!!sentWarning || sending || !to || !subject || !body} onClick={() => void submit()} className="btn-primary h-10 px-4 text-[13px] disabled:opacity-50"><Send size={14} />{sending ? 'Sending...' : 'Send Email'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Email() {
  const [selected, setSelected] = useState(templates[0]);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(() => new URLSearchParams(window.location.search).get('gmail') === 'error' ? new URLSearchParams(window.location.search).get('message') || 'Gmail connection failed.' : null);
  const { data: connection, loading: connectionLoading, error: connectionError, refetch: refetchConnection } = useSupabaseQuery(getGmailConnection, null, []);
  const { data: messages, loading: messagesLoading, error: messagesError, refetch: refetchMessages } = useGmailMessages();

  const connected = connection?.status === 'connected';
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return messages.filter((message) => {
      const haystack = [message.from_email, ...(message.to_emails ?? []), ...(message.cc_emails ?? []), message.subject, message.snippet, message.body_text].join(' ').toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesFilter = filter === 'all' || message.direction === filter || (filter === 'matched' && message.lead_id) || (filter === 'unmatched' && !message.lead_id);
      return matchesSearch && matchesFilter;
    });
  }, [messages, filter, search]);

  async function runAction(name: string, action: () => Promise<unknown>) {
    setBusy(name);
    setActionError(null);
    try {
      await action();
      await Promise.all([refetchConnection(), refetchMessages()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gmail action failed.');
    } finally {
      setBusy(null);
    }
  }

  function copyTemplate() {
    navigator.clipboard.writeText(selected.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-[20px] font-bold text-navy-900">Email</h1><p className="text-[13px] text-slate-400">Gmail sync, sending, templates, and lead email activity</p></div>
        <button onClick={() => setComposeOpen(true)} disabled={!connected} className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"><Send size={14} />Compose Email</button>
      </div>

      <div className="card mb-6 p-5">
        {connectionLoading ? <SkeletonLoader label="Checking Gmail connection..." /> : connectionError ? <ErrorState message={connectionError} /> : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><Mail size={18} className={connected ? 'text-green-600' : 'text-slate-400'} /><h2 className="text-[16px] font-bold text-navy-900">Gmail Integration</h2>{connected && <CheckCircle2 size={16} className="text-green-600" />}</div>
              <p className="mt-1 text-[13px] text-slate-500">{connected ? `Connected as ${connection.gmail_email}. Last sync: ${formatDate(connection.last_sync_at)}` : 'Connect Gmail to sync inbox/sent messages, send email, and match conversations to leads.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!connected && <button onClick={() => void runAction('connect', startGmailConnection)} className="btn-primary h-9 px-4 text-[13px]"><LinkIcon size={14} />Connect Gmail</button>}
              {connected && <button onClick={() => void runAction('sync', syncGmail)} disabled={busy === 'sync'} className="rounded-md border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14} className="mr-1 inline" />{busy === 'sync' ? 'Syncing...' : 'Sync Gmail'}</button>}
              {connected && <button onClick={() => void runAction('disconnect', disconnectGmail)} disabled={busy === 'disconnect'} className="rounded-md border border-red-100 px-4 text-[13px] font-semibold text-red-600 hover:bg-red-50"><Unlink size={14} className="mr-1 inline" />Disconnect</button>}
            </div>
          </div>
        )}
        {!connected && !connectionLoading && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-800">Gmail is not connected. Email templates are still available, but Gmail sync and CRM sending require a connected Google account.</div>}
        {actionError && <div className="mt-4"><ErrorState message={actionError} /></div>}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div><h2 className="mb-3 text-[15px] font-semibold text-navy-900">Email Templates</h2><div className="flex flex-col gap-2.5">{templates.map((t) => <button key={t.id} onClick={() => setSelected(t)} className={`rounded-xl border p-4 text-left transition ${selected.id === t.id ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="text-[13px] font-bold text-navy-900">{t.name}</p><p className="mt-1 text-[12px] text-slate-500">{t.subject}</p></button>)}</div></div>
        <div><h2 className="mb-3 text-[15px] font-semibold text-navy-900">Template Preview</h2><div className="card p-5"><p className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Subject</p><p className="mt-1 text-[14px] font-semibold text-navy-900">{selected.subject}</p><pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] leading-6 text-slate-600">{selected.body}</pre><button onClick={copyTemplate} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Copy size={14} />{copied ? 'Copied' : 'Copy Template'}</button></div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[15px] font-semibold text-navy-900">Recent Gmail Messages</h2><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sender, recipient, subject, body..." className="h-9 w-80 rounded-md border border-slate-200 pl-8 pr-3 text-[13px] outline-none focus:border-accent-500" /></div></div>
          <div className="flex flex-wrap gap-2">{(['all','inbound','outbound','matched','unmatched'] as Filter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-[12px] font-semibold capitalize ${filter === item ? 'bg-accent-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item === 'matched' ? 'matched to lead' : item}</button>)}</div>
        </div>
        {messagesLoading ? <div className="p-5"><SkeletonLoader label="Loading Gmail messages..." /></div> : messagesError ? <div className="p-5"><ErrorState message={messagesError} /></div> : filtered.length === 0 ? <div className="p-5"><EmptyState title="No Gmail messages found" message={connected ? 'Sync Gmail to load recent inbox and sent email.' : 'Connect Gmail to enable message sync.'} /></div> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50">{['Direction','Lead / Business','From','To','Subject','Snippet','Sent'].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>)}</tr></thead><tbody>{filtered.map((message) => <tr key={message.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${message.direction === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{message.direction}</span></td><td className="px-4 py-3 text-[13px] font-medium text-slate-700"><MessageLead message={message} /></td><td className="px-4 py-3 text-[13px] text-slate-600">{message.from_email || '—'}</td><td className="px-4 py-3 text-[13px] text-slate-600">{message.to_emails?.join(', ') || '—'}</td><td className="px-4 py-3 text-[13px] font-semibold text-navy-900">{message.subject || '(No subject)'}</td><td className="max-w-sm px-4 py-3 text-[13px] text-slate-500">{message.snippet}</td><td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-500">{formatDate(message.sent_at)}</td></tr>)}</tbody></table></div>
        )}
      </div>
      {composeOpen && <ComposePanel onClose={() => setComposeOpen(false)} onSent={() => { void refetchMessages(); }} />}
    </div>
  );
}
