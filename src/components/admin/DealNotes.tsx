import {useEffect,useState,type FormEvent} from 'react';
import {supabase} from '../../lib/supabase';
import {useNotes} from '../../hooks/useNotes';

export default function DealNotes({leadId}: {leadId:string}) {
  const {data:notes,error,loading,refetch}=useNotes(leadId);
  const [draft,setDraft]=useState(''); const [saving,setSaving]=useState(false); const [saveError,setSaveError]=useState('');
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void refetch();};
    window.addEventListener('focus',refresh);const timer=window.setInterval(refresh,15000);
    return ()=>{window.removeEventListener('focus',refresh);window.clearInterval(timer);};
  },[refetch]);
  async function save(event:FormEvent) {
    event.preventDefault();if(saving || !draft.trim())return;
    setSaving(true);setSaveError('');
    try {
      const {data,error:writeError}=await supabase.rpc('add_deal_note',{p_lead_id:leadId,p_text:draft});
      if(writeError || !data)throw new Error(writeError?.message || 'The note could not be saved.');
      setDraft('');await refetch();
    } catch(err){setSaveError(err instanceof Error?err.message:'Unable to save this note.');}
    finally{setSaving(false);}
  }
  return <section aria-label="Deal notes" className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h3 className="text-[16px] font-bold text-white">Deal notes</h3><button type="button" onClick={()=>void refetch()} disabled={loading} className="text-xs text-blue-200 underline disabled:opacity-50">Refresh notes</button></div>
    <p className="text-xs text-slate-400">Shared with the rep and admin who have access to this deal.</p>
    <form onSubmit={save} className="space-y-2"><label className="block text-sm text-slate-300">Add a deal note<textarea aria-label="Add a deal note" maxLength={5000} rows={4} value={draft} disabled={saving} onChange={e=>setDraft(e.target.value)} className="mt-2 block w-full resize-y rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white" /></label><button disabled={saving || !draft.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Saving note…':'Post note'}</button></form>
    {(saveError || error) && <p role="alert" className="text-sm text-red-200">{saveError || error}</p>}
    {!loading && !notes.length && <p className="text-sm text-slate-400">No deal notes yet.</p>}
    <div className="max-h-[60vh] space-y-3 overflow-y-auto">{notes.map(note=><article key={note.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><p className="text-xs font-bold text-blue-200">{note.created_by_name}<time className="mt-1 block font-normal text-slate-400" dateTime={note.created_at}>{new Date(note.created_at).toLocaleString()}</time></p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{note.text}</p></article>)}</div>
  </section>;
}
