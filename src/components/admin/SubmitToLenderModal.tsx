import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getGmailConnection, sendLenderEmail } from '../../hooks/useGmail';
import { useFundingPartners } from '../../hooks/usePartnerSubmissions';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import type { Document } from '../../lib/supabase';

export default function SubmitToLenderModal({ leadId, applicationId, businessName = 'Client', documents, onClose, onSubmitted }: {
  leadId?: string | null; applicationId: string; businessName?: string; documents: Document[]; onClose: () => void; onSubmitted: () => void;
}) {
  const { data: partners, loading, error: partnersError } = useFundingPartners();
  const { data: connection, loading: connectionLoading, error: connectionError } = useSupabaseQuery(getGmailConnection, null, []);
  const [partnerId,setPartnerId] = useState('');
  const [selectedDocs,setSelectedDocs] = useState<string[]>([]);
  const [subject,setSubject] = useState(`Funding submission — ${businessName}`);
  const [body,setBody] = useState(`Hello,\n\nPlease review the attached client documents for ${businessName} and let me know what funding options are available.\n\nThank you.`);
  const [requestId] = useState(() => crypto.randomUUID());
  const [sending,setSending] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [success,setSuccess] = useState<string | null>(null);
  const inFlight = useRef(false);
  const partner = partners.find(item => item.id === partnerId);
  const bytes = documents.filter(doc => selectedDocs.includes(doc.id)).reduce((sum,doc) => sum + (doc.file_size || 0),0);
  const connected = connection?.status === 'connected';
  const unavailable = !connected || !leadId || !partner?.email || !selectedDocs.length || bytes > 18*1024*1024 || selectedDocs.length > 20 || !subject.trim() || !body.trim();
  const inputClass = 'mt-1 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm text-white';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || success || unavailable) return;
    inFlight.current = true; setSending(true); setError(null);
    try {
      const result = await sendLenderEmail({ request_id: requestId,lead_id: leadId!,application_id: applicationId,funding_partner_id: partnerId,recipient: partner!.email!,document_ids: selectedDocs,subject,body });
      if (!result.sent) throw new Error('Gmail did not confirm this send. Check Gmail Sent before retrying.');
      setSuccess(result.warning || `Sent to ${partner!.name} (${partner!.email}) with ${selectedDocs.length} attachment${selectedDocs.length === 1 ? '' : 's'}.`);
      onSubmitted();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send lender email.'); }
    finally { inFlight.current = false; setSending(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="lender-email-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-6 text-white">
      <div className="flex items-center justify-between"><h2 id="lender-email-title" className="text-xl font-bold">Email Client Files to Lender</h2><button aria-label="Close lender email" disabled={sending} onClick={onClose}>Close</button></div>
      {connectionLoading ? <p className="my-3">Checking Gmail connection…</p> : connected ? <p className="my-3 text-sm text-slate-300">From: {connection.gmail_email}</p> : <p className="my-3 text-amber-200">Connect your Gmail account on the <Link className="underline" to="/admin/email">Email page</Link> before sending client files.</p>}
      {(connectionError || partnersError) && <p role="alert" className="my-3 text-red-300">{connectionError || partnersError}</p>}
      {success ? <div><p role="status" className="my-5 text-emerald-200">{success}</p><button className="btn-primary" onClick={onClose}>Done</button></div> : <form onSubmit={submit}>
        <fieldset disabled={sending} className="space-y-4">
          <label className="block text-sm">Lender<select required aria-label="Lender" className={inputClass} value={partnerId} onChange={e => setPartnerId(e.target.value)}><option value="">{loading ? 'Loading lenders…' : 'Choose a lender'}</option>{partners.filter(item => item.status === 'Active').map(item => <option disabled={!item.email} key={item.id} value={item.id}>{item.name}{item.email ? ` — ${item.email}` : ' — email missing'}</option>)}</select></label>
          {partner?.email && <p className="text-sm text-slate-300">To: {partner.email}</p>}
          {!loading && !partners.some(item => item.status === 'Active' && item.email) && <p className="text-amber-200">Add an active lender and email address in Funders first.</p>}
          <label className="block text-sm">Subject<input required maxLength={300} className={inputClass} value={subject} onChange={e => setSubject(e.target.value)} /></label>
          <label className="block text-sm">Message<textarea required maxLength={50000} className={`${inputClass} min-h-32`} value={body} onChange={e => setBody(e.target.value)} /></label>
          <div><h3 className="font-semibold">Client files to attach</h3><p className="mb-2 text-xs text-slate-400">Choose up to 20 files, totaling no more than 18 MB. Each lender receives a separate email.</p>
            {!documents.length && <p className="text-amber-200">Upload client documents first.</p>}
            {documents.map(doc => { const disabled = ['Missing','Pending','Rejected'].includes(doc.status) || !(doc.storage_path || doc.file_path); return <label key={doc.id} className="my-2 flex gap-3 rounded-lg border border-white/10 p-3 text-sm"><input type="checkbox" disabled={disabled} checked={selectedDocs.includes(doc.id)} onChange={() => setSelectedDocs(current => current.includes(doc.id) ? current.filter(id => id !== doc.id) : [...current,doc.id])} /><span>{doc.file_name}<span className="block text-xs text-slate-400">{doc.document_type || doc.doc_type} · {doc.status}{doc.file_size ? ` · ${(doc.file_size/1024/1024).toFixed(2)} MB` : ''}{disabled ? ' · unavailable for sending' : ''}</span></span></label>; })}
            <p className={bytes > 18*1024*1024 ? 'text-red-300' : 'text-slate-300'}>{selectedDocs.length} selected · {(bytes/1024/1024).toFixed(2)} MB</p>
          </div>
          {error && <p role="alert" className="text-red-300">{error}</p>}
          <button disabled={unavailable || sending || loading || connectionLoading} className="btn-primary disabled:opacity-50">{sending ? 'Sending files…' : 'Send Email with Attachments'}</button>
        </fieldset>
      </form>}
    </section>
  </div>;
}
