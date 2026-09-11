import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {assertSignatureImageOrientation,type SignatureSelection,type SignatureTransfer} from '../src/lib/applicationSignatures.js';

export class SignatureSourceChanged extends Error {}
/** Rasterize only the chosen area, so hidden text from the source page is not embedded. */
export async function rasterizeSignature(sourceBytes: Uint8Array, selection: SignatureSelection) {
  const {createCanvas,loadImage}=await import('@napi-rs/canvas');
  const isPdf=new TextDecoder().decode(sourceBytes.slice(0,5))==='%PDF-';
  if(isPdf) {
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const root=dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
    const task=getDocument({data:sourceBytes.slice(),standardFontDataUrl:join(root,'standard_fonts')+'/',cMapUrl:join(root,'cmaps')+'/',cMapPacked:true,wasmUrl:join(root,'wasm')+'/',useSystemFonts:true});
    try {
      const document=await task.promise;
      if(document.numPages>20 || selection.page>document.numPages) throw new Error('The selected page is unavailable or the PDF exceeds 20 pages.');
      const page=await document.getPage(selection.page);
      const base=page.getViewport({scale:1});
      const scale=Math.min(3,1400/(base.width*selection.width),600/(base.height*selection.height));
      const viewport=page.getViewport({scale});
      const width=Math.max(1,Math.ceil(viewport.width*selection.width));
      const height=Math.max(1,Math.ceil(viewport.height*selection.height));
      const canvas=createCanvas(width,height);
      await page.render({canvas:canvas as unknown as HTMLCanvasElement,viewport,transform:[1,0,0,1,-selection.x*viewport.width,-selection.y*viewport.height]}).promise;
      return canvas.toBuffer('image/png');
    } finally {await task.destroy();}
  }
  if(selection.page!==1) throw new Error('Images have only one source page.');
  assertSignatureImageOrientation(sourceBytes);
  const document=await PDFDocument.create();
  const png=sourceBytes[0]===137 && sourceBytes[1]===80 && sourceBytes[2]===78 && sourceBytes[3]===71;
  const jpg=sourceBytes[0]===255 && sourceBytes[1]===216;
  if(!png && !jpg) throw new Error('Signature import supports PDF, PNG and JPG originals.');
  if(png) {
    if(sourceBytes.length<24) throw new Error('Invalid PNG source.');
    const header=new DataView(sourceBytes.buffer,sourceBytes.byteOffset,sourceBytes.byteLength);
    const w=header.getUint32(16),h=header.getUint32(20);
    if(!w || !h || w>16000 || h>16000 || w*h>40000000) throw new Error('Use a smaller source image.');
  }
  const dimensions=png?await document.embedPng(sourceBytes):await document.embedJpg(sourceBytes);
  if(dimensions.width>16000 || dimensions.height>16000 || dimensions.width*dimensions.height>40000000) throw new Error('Use a smaller source image.');
  const image=await loadImage(Buffer.from(sourceBytes));
  const cropWidth=image.width*selection.width,cropHeight=image.height*selection.height;
  const scale=Math.min(1,1400/cropWidth,600/cropHeight);
  const canvas=createCanvas(Math.max(1,Math.ceil(cropWidth*scale)),Math.max(1,Math.ceil(cropHeight*scale)));
  const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,image.width*selection.x,image.height*selection.y,cropWidth,cropHeight,0,0,canvas.width,canvas.height);
  return canvas.toBuffer('image/png');
}

export async function addTransferredSignatures(pdf: PDFDocument, sourceBytes: Uint8Array, transfer: SignatureTransfer, context: {sourceDocumentId:string;sourceName:string;actorId:string;ownerName:string;partnerName:string;createdAt:string}) {
  if(sourceBytes.length>20*1024*1024) throw new Error('Signature import supports source files up to 20 MB.');
  const hash=createHash('sha256').update(sourceBytes).digest('hex');
  if(hash!==transfer.sourceSha256) throw new SignatureSourceChanged('The original file changed. Reload it and review the signature selections again.');
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  for(const selection of transfer.selections) {
    const name=selection.role==='owner'?context.ownerName:context.partnerName;
    if(!name.trim()) throw new Error(`Enter the ${selection.role} name before transferring their signature.`);
    const image=await pdf.embedPng(await rasterizeSignature(sourceBytes,selection));
    const scale=Math.min(140/image.width,23/image.height);
    const width=image.width*scale,height=image.height*scale;
    pdf.getPage(0).drawImage(image,{x:155+(140-width)/2,y:(selection.role==='owner'?94:69)+(23-height)/2,width,height});
    if(selection.signedDate) pdf.getPage(0).drawText(selection.signedDate,{x:355,y:selection.role==='owner'?98:73,size:9,font});
  }
  pdf.getPage(0).drawText('Contains copied signature(s). Source and authorization record follows.',{x:22,y:20,size:7,font,color:rgb(.3,.3,.3)});
  const audit={kind:'authorized_signature_copy',...context,sourceSha256:hash,authorizationNote:transfer.authorizationNote,selections:transfer.selections};
  pdf.setSubject(JSON.stringify(audit));
  const auditPage=pdf.addPage([612,792]);
  auditPage.drawText('Signature transfer record',{x:40,y:744,size:19,font});
  const lines=[
    'This PDF contains a copied signature, not a new digital-signature event.',
    'The CRM user confirmed the applicant authorized reuse on this Bypass application.',
    'The original document remains attached separately and has not been changed.',
    '',`Source: ${context.sourceName}`,`Source document ID: ${context.sourceDocumentId}`,
    `Source SHA-256: ${hash}`,`Confirmed by CRM user: ${context.actorId}`,`Copy created (UTC): ${context.createdAt}`,
    '',...transfer.selections.map(s=>`${s.role==='owner'?'Owner':'Partner'}: ${s.role==='owner'?context.ownerName:context.partnerName}; source page ${s.page}; original date: ${s.signedDate || 'not provided'}`),
    '',`Authorization record: ${transfer.authorizationNote}`,
    '', 'The exact source details and selection coordinates are also in the PDF metadata.',
  ];
  let y=710;
  for (const line of lines) {
    // Standard PDF fonts cover limited scripts; the metadata above retains exact Unicode.
    const ascii=line.normalize('NFKD').replace(/[^\x20-\x7e]/g,'?');
    let remaining=ascii;
    do {
      let length=remaining.length;
      while (length>1 && font.widthOfTextAtSize(remaining.slice(0,length),9)>532) length--;
      auditPage.drawText(remaining.slice(0,length),{x:40,y,size:9,font});y-=15;remaining=remaining.slice(length);
    } while (remaining.length);
  }
  return transfer.selections.length;
}
