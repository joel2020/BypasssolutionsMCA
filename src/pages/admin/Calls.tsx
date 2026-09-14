import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLeads } from '../../hooks/useLeads';
import { useScope } from '../../hooks/useScope';
import { useRepView } from '../../hooks/useRepView';
import { belongsToRep } from '../../lib/repView';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { EmptyState, ErrorState, SkeletonLoader } from '../../components/admin/States';

interface CallRecord {
  id: string;
  created_at: string;
  lead_id: string;
  rep_name: string;
  duration: string;
  disposition: string;
  notes: string;
  leads: { business_name: string; assigned_to?: string | null; assigned_rep?: string | null } | null;
}

export default function Calls() {
  const { role, repName } = useScope();
  const { target } = useRepView();
  const canWrite = role === 'admin' || role === 'underwriter' || role === 'sales_rep';
  const { data: leads, error: leadsError } = useLeads();
  const { data: allCalls, loading, error, refetch } = useSupabaseQuery<CallRecord[]>(async () => {
    const { data, error: queryError } = await supabase.from('call_logs').select('*, leads(business_name, assigned_to, assigned_rep)').order('created_at', { ascending: false });
    if (queryError) throw new Error(queryError.message);
    return (data ?? []) as unknown as CallRecord[];
  }, [], []);
  const calls = target ? allCalls.filter((call) => call.leads && belongsToRep(target, call.leads.assigned_to, call.leads.assigned_rep)) : allCalls;
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ leadId: '', duration: '0:00', disposition: 'Connected', notes: '' });

  async function save(event: React.FormEvent) {
    event.preventDefault(); setFeedback(''); setSaveError('');
    if (!canWrite || !form.leadId) { setSaveError('Select a lead you can update.'); return; }
    if (!/^\d+:[0-5]\d$/.test(form.duration)) { setSaveError('Enter duration as minutes:seconds, such as 4:30.'); return; }
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('call_logs').insert({ lead_id: form.leadId, rep_name: repName, duration: form.duration, disposition: form.disposition, notes: form.notes.trim() });
      if (insertError) throw new Error(insertError.message);
      setFeedback('Call saved.'); setShowLog(false);
      setForm({ leadId: '', duration: '0:00', disposition: 'Connected', notes: '' });
      await refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save the call.');
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-xl font-bold text-navy-900">Calls</h1><p className="text-sm text-slate-500">Call history saved to your CRM leads.</p></div><button className="btn-primary" disabled={!canWrite} onClick={() => { setShowLog(true); setSaveError(''); setFeedback(''); }}>Log Call</button></div>
      {feedback && <p role="status" className="mb-4 text-sm text-green-700">{feedback}</p>}
      {saveError && !showLog && <p role="alert" className="mb-4 text-sm text-red-700">{saveError}</p>}
      {loading ? <SkeletonLoader label="Loading call history..." /> : error ? <ErrorState message={error} /> : calls.length === 0 ? <EmptyState title="No calls logged" message="Log a call against a lead to keep a shared history of your conversations." /> : (
        <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Business', 'Rep', 'Date', 'Duration', 'Outcome', 'Notes'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{calls.map((call) => <tr key={call.id} className="border-t border-slate-100"><td className="p-3">{call.leads?.business_name || 'Lead'}</td><td className="p-3">{call.rep_name}</td><td className="p-3">{new Date(call.created_at).toLocaleString()}</td><td className="p-3">{call.duration}</td><td className="p-3">{call.disposition}</td><td className="p-3">{call.notes}</td></tr>)}</tbody></table></div>
      )}
      {showLog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6"><h2 className="text-lg font-bold">Log a call</h2>
        {leadsError && <p role="alert" className="text-sm text-red-700">{leadsError}</p>}
        <label className="block">Lead<select required className="select-field mt-1" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })}><option value="">Select lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.business_name}</option>)}</select></label>
        <label className="block">Duration<input className="input-field mt-1" required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
        <label className="block">Outcome<select className="select-field mt-1" value={form.disposition} onChange={(e) => setForm({ ...form, disposition: e.target.value })}>{['Connected','No Answer','Voicemail','Busy','Wrong Number'].map((outcome) => <option key={outcome}>{outcome}</option>)}</select></label>
        <label className="block">Notes<textarea className="input-field mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} className="btn-secondary" onClick={() => setShowLog(false)}>Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save call'}</button></div>
      </form></div>}
    </div>
  );
}
