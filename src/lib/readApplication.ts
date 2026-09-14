import { supabase } from './supabase';
import { assertSignatureImageOrientation } from './applicationSignatures';
import { parseApplicationText } from './applicationImport';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, type Worker } from 'tesseract.js';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const ASSETS = `${window.location.origin}/application-reader/`;
const MAX_BYTES = 20 * 1024 * 1024;
export async function loadApplicationSource(documentId: string, leadId: string, signal: AbortSignal) {
  signal.throwIfAborted();
  // Resolve a fresh URL from the authorized document row, never an arbitrary URL.
  const { data: doc, error } = await supabase.from('documents').select('id,lead_id,storage_path,file_path,file_name,mime_type,file_size').eq('id',documentId).eq('lead_id',leadId).single();
  if (error || !doc) throw new Error('This application is unavailable or you do not have access.');
  if (Number(doc.file_size)>MAX_BYTES) throw new Error('Automatic extraction supports files up to 20 MB. Open this original for manual review.');
  const path=doc.storage_path || doc.file_path;
  if (!path) throw new Error('This application has no stored file.');
  const pdf=/\.pdf$/i.test(doc.file_name) || doc.mime_type==='application/pdf';
  const image=/\.(png|jpe?g)$/i.test(doc.file_name) || ['image/png','image/jpeg'].includes(doc.mime_type);
  if (!pdf && !image) throw new Error('Automatic extraction supports PDF, PNG and JPG. Save Word applications as a PDF and upload that copy.');
  const { data: url, error: urlError } = await supabase.storage.from('application-documents').createSignedUrl(path,120);
  if (urlError || !url) throw new Error('Unable to open the application.');
  const response=await fetch(url.signedUrl,{signal});
  if (!response.ok) throw new Error('Unable to download the application.');
  if (Number(response.headers.get('content-length'))>MAX_BYTES) throw new Error('This application exceeds the 20 MB extraction limit.');
  const blob=await response.blob();
  if (blob.size>MAX_BYTES) throw new Error('This application exceeds the 20 MB extraction limit.');
  return {blob,pdf};
}
export async function readApplication(documentId: string, leadId: string, progress: (message: string) => void, signal: AbortSignal, scanAll: boolean) {
  progress('Opening the original application…');
  const {blob,pdf}=await loadApplicationSource(documentId,leadId,signal);
  return extractApplicationBlob(blob,pdf,progress,signal,scanAll);
}

/** Reads bytes locally. The original, including any signature, is never modified. */
export async function extractApplicationBlob(blob: Blob, pdf: boolean, progress: (message: string) => void, signal: AbortSignal, scanAll: boolean) {
  if (blob.size > MAX_BYTES) throw new Error('This application exceeds the 20 MB extraction limit.');
  signal.throwIfAborted();
  let worker: Worker | undefined;
  let pageLabel='';
  const stop=()=>{ void worker?.terminate(); };
  signal.addEventListener('abort',stop,{once:true});
  const recognize=async (canvas: HTMLCanvasElement | Blob) => {
    signal.throwIfAborted();
    if (!worker) worker=await createWorker('eng',1,{workerPath:`${ASSETS}worker.min.js`,corePath:ASSETS,langPath:ASSETS,cacheMethod:'none',logger:message=>progress(`${pageLabel}: ${message.status} ${Math.round(message.progress*100)}%`)});
    signal.throwIfAborted();
    const result=await worker.recognize(canvas);
    signal.throwIfAborted();
    return result.data.text;
  };
  const pages: string[]=[];
  try {
    if (!pdf) {
      pageLabel='Reading image';
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      const context=canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not read this image.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      pages.push(await recognize(canvas));canvas.width=canvas.height=0;
    } else {
      const task=getDocument({data:await blob.arrayBuffer(),cMapUrl:`${ASSETS}cmaps/`,cMapPacked:true,standardFontDataUrl:`${ASSETS}standard_fonts/`,wasmUrl:`${ASSETS}wasm/`});
      const abortPdf=()=>{void task.destroy();};signal.addEventListener('abort',abortPdf,{once:true});
      try {
        const document=await task.promise;
        if (document.numPages>20) throw new Error('Automatic extraction supports up to 20 pages. Split this file or review it manually.');
        for (let n=1;n<=document.numPages;n++) {
          signal.throwIfAborted();pageLabel=`Page ${n} of ${document.numPages}`;progress(`Reading ${pageLabel.toLowerCase()}…`);
          const page=await document.getPage(n);
          const content=await page.getTextContent();
          const rows: Array<{y:number;items:Array<{x:number;w:number;text:string}>}>=[];
          for (const item of content.items) {
            if (!('str' in item) || !item.str.trim()) continue;
            const y=item.transform[5];let row=rows.find(row=>Math.abs(row.y-y)<3);
            if (!row) {row={y,items:[]};rows.push(row);}
            row.items.push({x:item.transform[4],w:item.width,text:item.str});
          }
          const text=rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.x-b.x).map((item,i,items)=>(i && item.x-items[i-1].x-items[i-1].w>10?'\t':' ')+item.text).join('').trim()).join('\n');
          const annotations=await page.getAnnotations();
          const formText=annotations.filter(a=>a.subtype==='Widget' && a.fieldType!=='Sig' && typeof a.fieldValue==='string' && a.fieldValue).map(a=>`${String(a.fieldName).replace(/_/g,' ')}: ${a.fieldValue}`).join('\n');
          if (scanAll || text.replace(/\s/g,'').length<80) {
            const viewport=page.getViewport({scale:1});
            const scaled=page.getViewport({scale:Math.min(2.5,2400/Math.max(viewport.width,viewport.height))});
            const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(scaled.width);canvas.height=Math.ceil(scaled.height);
            await page.render({canvas,viewport:scaled}).promise;
            // Do not duplicate OCR/text candidates from the same page.
            pages.push([formText,await recognize(canvas)].filter(Boolean).join('\n'));canvas.width=canvas.height=0;
          } else pages.push([formText,text].filter(Boolean).join('\n'));
          page.cleanup();
        }
      } finally {signal.removeEventListener('abort',abortPdf);await task.destroy();}
    }
    const text=pages.map((text,i)=>`--- Page ${i+1} ---\n${text}`).join('\n\n');
    return {...parseApplicationText(text),text,pageCount:pages.length};
  } finally {signal.removeEventListener('abort',stop);await worker?.terminate();}
}

/** Display the normal PDF page orientation, matching the server renderer. */
export async function renderSignaturePage(blob: Blob, pdf: boolean, pageNumber: number, signal: AbortSignal) {
  const canvas=document.createElement('canvas');
  signal.throwIfAborted();
  let count=1;
  if (pdf) {
    const task=getDocument({data:await blob.arrayBuffer(),cMapUrl:`${ASSETS}cmaps/`,cMapPacked:true,standardFontDataUrl:`${ASSETS}standard_fonts/`,wasmUrl:`${ASSETS}wasm/`});
    const abort=()=>{void task.destroy();};signal.addEventListener('abort',abort,{once:true});
    try {
      const document=await task.promise;count=document.numPages;
      if (count>20) throw new Error('Signature import supports source PDFs up to 20 pages.');
      const page=await document.getPage(pageNumber);
      const base=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:1600/Math.max(base.width,base.height)});
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvas,viewport}).promise;
    } finally {signal.removeEventListener('abort',abort);await task.destroy();}
  } else {
    assertSignatureImageOrientation(new Uint8Array(await blob.arrayBuffer()));
    const bitmap=await createImageBitmap(blob);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  }
  signal.throwIfAborted();
  const result={url:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,pageCount:count};
  canvas.width=canvas.height=0;
  return result;
}
