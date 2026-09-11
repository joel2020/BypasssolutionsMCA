import {expect,it} from 'vitest';
import {PDFDocument,StandardFonts,degrees,rgb} from 'pdf-lib';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {addTransferredSignatures,rasterizeSignature,SignatureSourceChanged} from './applicationSignaturePdf';
import type {SignatureSelection} from '../src/lib/applicationSignatures';
async function source(rotation=0,interactive=false) {
 const pdf=await PDFDocument.create();const page=pdf.addPage([400,600]);page.setRotation(degrees(rotation));
 if(interactive){const field=pdf.getForm().createTextField('signature-appearance');field.setText('QA SIGNATURE');field.addToPage(page,{x:80,y:100,width:120,height:30,borderWidth:0});pdf.getForm().updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));}
 else page.drawRectangle({x:80,y:100,width:120,height:30,color:rgb(0,0,0)});
 page.drawText('PRIVATE OUTSIDE AREA',{x:20,y:500,size:10});return pdf.save();
}
async function darkPixels(bytes:Uint8Array) {
 const image=await loadImage(Buffer.from(bytes));const canvas=createCanvas(image.width,image.height);const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data;
 let dark=0;for(let n=0;n<pixels.length;n+=4)if(pixels[n]<100&&pixels[n+1]<100&&pixels[n+2]<100)dark++;
 return {dark,total:image.width*image.height};
}
const base={role:'owner' as const,page:1};
const context={sourceDocumentId:'source',sourceName:'QA original.pdf',actorId:'test-rep',ownerName:'Test Owner',partnerName:'',createdAt:'2026-09-10T23:00:00Z'};
const selection={...base,x:.2,y:470/600,width:.3,height:.05};
it.each([
 [0,selection],
 [90,{...base,x:100/600,y:.2,width:.05,height:.3}],
 [180,{...base,x:.5,y:100/600,width:.3,height:.05}],
 [270,{...base,x:470/600,y:.5,width:.05,height:.3}],
])('copies only the selected pixels on a %s-degree PDF',async(rotation,s)=>{
 const crop=await rasterizeSignature(await source(rotation as number),s as SignatureSelection);const pixels=await darkPixels(crop);
 expect(pixels.dark/pixels.total).toBeGreaterThan(.9);
},20000);
it('renders interactive appearance fields instead of silently copying a blank area',async()=>{
 const pixels=await darkPixels(await rasterizeSignature(await source(0,true),selection));expect(pixels.dark).toBeGreaterThan(100);
},20000);
it('adds visible provenance and preserves the original bytes',async()=>{
 const bytes=await source();const hash=createHash('sha256').update(bytes).digest('hex');const pdf=await PDFDocument.create();pdf.addPage([612,792]);
 const copied=await addTransferredSignatures(pdf,bytes,{authorized:true,authorizationNote:'Synthetic QA authorization record',sourceSha256:hash,selections:[selection]},context);
 expect(copied).toBe(1);expect(pdf.getPageCount()).toBe(2);expect(JSON.parse(pdf.getSubject()!)).toMatchObject({kind:'authorized_signature_copy',actorId:'test-rep',sourceSha256:hash});
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
 // The generated PDF has the cropped PNG, not an embedded source-page resource.
 expect(pdf.getPages()[0].node.Resources()?.toString()).not.toContain('/EmbeddedPdfPage');
},20000);
it('rejects a changed source before copying any signature',async()=>{
 const pdf=await PDFDocument.create();pdf.addPage();
 await expect(addTransferredSignatures(pdf,await source(),{authorized:true,authorizationNote:'Synthetic QA authorization',sourceSha256:'0'.repeat(64),selections:[selection]},context)).rejects.toBeInstanceOf(SignatureSourceChanged);
 expect(pdf.getPageCount()).toBe(1);
});

it.each(['image/png','image/jpeg'] as const)('copies image signatures from %s',async format=>{
 const canvas=createCanvas(400,600);const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,400,600);c.fillStyle='black';c.fillRect(80,470,120,30);
 const bytes=format==='image/png'?canvas.toBuffer('image/png'):canvas.toBuffer('image/jpeg');
 const pixels=await darkPixels(await rasterizeSignature(bytes,selection));expect(pixels.dark/pixels.total).toBeGreaterThan(.9);
});
