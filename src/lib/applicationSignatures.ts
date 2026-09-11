export type SignatureRole = 'owner' | 'partner';
/** Coordinates relative to the displayed page, measured from its top-left. */
export interface SignatureSelection { role: SignatureRole; page: number; x: number; y: number; width: number; height: number; signedDate?: string }
export interface SignatureTransfer { sourceSha256: string; authorized: true; authorizationNote: string; selections: SignatureSelection[] }
export function validateSignatureTransfer(value: unknown): SignatureTransfer | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object') throw new Error('Invalid signature transfer.');
  const input = value as Record<string, unknown>;
  if (input.authorized !== true) throw new Error('Confirm the applicant authorized signature reuse on this Bypass application.');
  if (typeof input.authorizationNote !== 'string' || input.authorizationNote.trim().length < 10 || input.authorizationNote.length > 500) throw new Error('Record how and when the applicant authorized reuse (10–500 characters).');
  if (typeof input.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.sourceSha256)) throw new Error('Reload the original application before selecting a signature.');
  if (!Array.isArray(input.selections) || input.selections.length < 1 || input.selections.length > 2) throw new Error('Select an owner signature, a partner signature, or both.');
  const roles = new Set<string>();
  const selections = input.selections.map((item: unknown): SignatureSelection => {
    if (!item || typeof item !== 'object') throw new Error('Invalid signature selection.');
    const s = item as Record<string, unknown>;
    if ((s.role !== 'owner' && s.role !== 'partner') || roles.has(s.role)) throw new Error('Use one selection per signer.');
    roles.add(s.role);
    if (typeof s.page !== 'number' || !Number.isInteger(s.page) || s.page < 1 || s.page > 20) throw new Error('Select a source page between 1 and 20.');
    for (const key of ['x', 'y', 'width', 'height']) if (typeof s[key] !== 'number' || !Number.isFinite(s[key])) throw new Error('Invalid signature coordinates.');
    const {x,y,width,height}=s as unknown as SignatureSelection;
    if (x<0 || y<0 || width<0.01 || height<0.005 || x+width>1.000001 || y+height>1.000001 || width>0.9 || height>0.35) throw new Error('Select only the signature area inside the page.');
    let signedDate: string | undefined;
    if (s.signedDate !== undefined && s.signedDate !== '') {
      if (typeof s.signedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.signedDate)) throw new Error('Check the original signature date.');
      const date=new Date(`${s.signedDate}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==s.signedDate) throw new Error('Check the original signature date.');
      signedDate=s.signedDate;
    }
    return {role:s.role,page:s.page,x,y,width,height,...(signedDate?{signedDate}:{})};
  });
  return {sourceSha256:input.sourceSha256,authorized:true,authorizationNote:input.authorizationNote.trim(),selections};
}

export function signatureSourcePath(source: {lead_id?:string;application_id?:string|null;storage_path?:string|null;file_path?:string|null}, leadId: string, verifiedApplicationId?:string) {
  const path=source.storage_path || source.file_path || '';
  if (source.lead_id!==leadId || path.includes('..') || path.includes('\\') || path.includes('%') || path.includes('://')) throw new Error('The source file does not belong to this client.');
  if (path.startsWith(`leads/${leadId}/`) || (verifiedApplicationId && source.application_id===verifiedApplicationId && path.startsWith(`applications/${verifiedApplicationId}/`))) return path;
  throw new Error('The source file does not belong to this client.');
}

/** Keep browser preview and PDF embedding consistent for photos with EXIF rotation. */
export function assertSignatureImageOrientation(bytes: Uint8Array) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  function checkTiff(start:number,end:number) {
    if(start+8>end) throw new Error('Invalid image orientation metadata.');
    const little=view.getUint16(start)===0x4949;
    const ifd=start+view.getUint32(start+4,little);
    if(ifd<start || ifd+2>end) throw new Error('Invalid image orientation metadata.');
    const count=view.getUint16(ifd,little);
    if(ifd+2+count*12>end) throw new Error('Invalid image orientation metadata.');
    for(let i=0;i<count;i++) {
      const entry=ifd+2+i*12;
      if(view.getUint16(entry,little)===0x112 && view.getUint16(entry+8,little)!==1) throw new Error('This photo uses rotation metadata. Save an upright PDF or PNG copy, upload it, and select the signature there.');
    }
  }
  if(bytes[0]===255 && bytes[1]===216) {
    let offset=2;
    while(offset+4<=bytes.length && bytes[offset]===255) {
      const marker=bytes[offset+1];if(marker===0xda || marker===0xd9)break;
      const length=view.getUint16(offset+2);if(length<2 || offset+2+length>bytes.length)break;
      if(marker===0xe1 && new TextDecoder().decode(bytes.slice(offset+4,offset+10))==='Exif\0\0') checkTiff(offset+10,offset+2+length);
      offset+=2+length;
    }
  } else if(bytes[0]===137 && bytes[1]===80) {
    let offset=8;
    while(offset+12<=bytes.length) {
      const size=view.getUint32(offset);if(size>bytes.length-offset-12)break;
      if(new TextDecoder().decode(bytes.slice(offset+4,offset+8))==='eXIf') checkTiff(offset+8,offset+8+size);
      offset+=12+size;
    }
  }
}
