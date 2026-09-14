import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {loadApplicationSource,renderSignaturePage} from '../../lib/readApplication';
import type {SignatureRole,SignatureSelection} from '../../lib/applicationSignatures';

export interface SelectedSignatures {sourceSha256:string;selections:SignatureSelection[]}
interface Props {leadId:string;documentId:string;disabled:boolean;onChange:(value:SelectedSignatures|null)=>void}
export default function ApplicationSignaturePicker({leadId,documentId,disabled,onChange}:Props) {
  const [source,setSource]=useState<{blob:Blob;pdf:boolean;sha:string}|null>(null);
  const [page,setPage]=useState(1);const [role,setRole]=useState<SignatureRole>('owner');
  const [preview,setPreview]=useState<{url:string;width:number;height:number;pageCount:number}|null>(null);
  const [busy,setBusy]=useState(true);const [error,setError]=useState('');
  const [draft,setDraft]=useState({x:.1,y:.7,width:.3,height:.08});
  const [date,setDate]=useState('');
  const [chosen,setChosen]=useState<Array<{selection:SignatureSelection;thumbnail:string}>>([]);
  const start=useRef<{x:number;y:number}|null>(null);
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try {
        const loaded=await loadApplicationSource(documentId,leadId,controller.signal);
        const hash=await crypto.subtle.digest('SHA-256',await loaded.blob.arrayBuffer());
        if (!controller.signal.aborted) setSource({...loaded,sha:Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('')});
      } catch(err) {if(!controller.signal.aborted){setError(err instanceof Error?err.message:'Unable to open source.');setBusy(false);}}
    })();
    return ()=>controller.abort();
  },[documentId,leadId]);
  useEffect(()=>{
    if(!source)return;
    const controller=new AbortController();setBusy(true);setPreview(null);setError('');
    void renderSignaturePage(source.blob,source.pdf,page,controller.signal).then(result=>{if(!controller.signal.aborted){setPreview(result);setBusy(false);}}).catch(err=>{if(!controller.signal.aborted){setError(err instanceof Error?err.message:'Unable to show page.');setBusy(false);}});
    return ()=>controller.abort();
  },[source,page]);
  function point(event:PointerEvent<HTMLDivElement>) {
    const box=event.currentTarget.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))};
  }
  function select() {
    setError('');
    if(!source || !preview || !image.current)return;
    if(draft.width<.01 || draft.height<.005 || draft.width>.9 || draft.height>.35 || draft.x+draft.width>1.000001 || draft.y+draft.height>1.000001){setError('Select only the signature area inside the page.');return;}
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(preview.width*draft.width));canvas.height=Math.max(1,Math.round(preview.height*draft.height));
    canvas.getContext('2d')!.drawImage(image.current,draft.x*preview.width,draft.y*preview.height,draft.width*preview.width,draft.height*preview.height,0,0,canvas.width,canvas.height);
    const selection:SignatureSelection={...draft,page,role,...(date?{signedDate:date}:{})};
    const next=[...chosen.filter(c=>c.selection.role!==role),{selection,thumbnail:canvas.toDataURL('image/png')}];
    setChosen(next);onChange({sourceSha256:source.sha,selections:next.map(c=>c.selection)});
  }
  function remove(removeRole:SignatureRole) {
    const next=chosen.filter(c=>c.selection.role!==removeRole);setChosen(next);
    onChange(next.length && source?{sourceSha256:source.sha,selections:next.map(c=>c.selection)}:null);
  }
  return <div className="space-y-3 rounded-xl border border-amber-300/25 bg-amber-400/5 p-3 text-sm">
    <p>Select the page, then drag a box around the signature. Use the percentage controls for precise or keyboard selection. Select each signer separately.</p>
    <div className="flex flex-wrap gap-3">
      <label>Source page <input aria-label="Signature source page" type="number" min="1" max={preview?.pageCount || 20} value={page} disabled={busy || disabled} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=1&&value<=(preview?.pageCount||20))setPage(value);}} className="ml-2 w-16 rounded bg-slate-800 p-2" /></label>
      <label>Signer <select aria-label="Signature signer" value={role} disabled={disabled} onChange={e=>{setRole(e.target.value as SignatureRole);setDate('');}} className="ml-2 rounded bg-slate-800 p-2"><option value="owner">Owner</option><option value="partner">Partner / second owner</option></select></label>
      <label>Original signature date (optional) <input aria-label="Original signature date" type="date" value={date} disabled={disabled} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)} className="rounded bg-slate-800 p-2" /></label>
    </div>
    {busy && <p role="status">Opening signature source…</p>}
    {preview && <div className="relative mx-auto max-w-xl touch-none select-none cursor-crosshair" onPointerDown={e=>{if(disabled)return;e.currentTarget.setPointerCapture(e.pointerId);start.current=point(e);setDraft({...start.current,width:0,height:0});}} onPointerMove={e=>{if(!start.current || disabled)return;const p=point(e),s=start.current;setDraft({x:Math.min(p.x,s.x),y:Math.min(p.y,s.y),width:Math.abs(p.x-s.x),height:Math.abs(p.y-s.y)});}} onPointerUp={()=>{start.current=null;}} onPointerCancel={()=>{start.current=null;}}>
      <img ref={image} src={preview.url} alt={`Original application page ${page}`} draggable={false} className="block w-full" />
      <div className="pointer-events-none absolute border-2 border-blue-500 bg-blue-400/20" style={{left:`${draft.x*100}%`,top:`${draft.y*100}%`,width:`${draft.width*100}%`,height:`${draft.height*100}%`}} />
    </div>}
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{(['x','y','width','height'] as const).map(key=><label key={key}>{({x:'Left',y:'Top',width:'Width',height:'Height'})[key]} (%)<input aria-label={`Signature ${key} percent`} type="number" step="0.1" min="0" max="100" value={Math.round(draft[key]*1000)/10} disabled={disabled || busy} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=100)setDraft({...draft,[key]:n/100});}} className="block w-full rounded bg-slate-800 p-2" /></label>)}</div>
    <button type="button" onClick={select} disabled={disabled || busy || !preview} className="rounded-lg bg-blue-600 px-4 py-2 font-bold disabled:opacity-50">Use selected {role} signature</button>
    {error && <p role="alert" className="text-red-200">{error}</p>}
    {chosen.map(({selection,thumbnail})=><div key={selection.role} className="rounded border border-white/15 p-3">
      <p className="mb-2 font-bold">{selection.role==='owner'?'Owner':'Partner'} signature preview — source page {selection.page}</p>
      <div className="flex h-24 items-center justify-center rounded bg-white p-2"><img alt={`Selected ${selection.role} signature`} src={thumbnail} className="max-h-full max-w-full object-contain" /></div>
      <p className="mt-2 text-xs text-slate-300">This crop will be fitted to the {selection.role} signature line without stretching.</p>
      <button type="button" disabled={disabled} className="mt-2 text-red-200 underline" onClick={()=>remove(selection.role)}>Remove {selection.role} signature</button>
    </div>)}
  </div>;
}
