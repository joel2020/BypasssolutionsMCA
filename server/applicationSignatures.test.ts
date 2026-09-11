import {expect,it} from 'vitest';
import {signatureSourcePath,validateSignatureTransfer} from '../src/lib/applicationSignatures';
const selection={role:'owner' as const,page:1,x:.1,y:.7,width:.3,height:.1};
const request={authorized:true,sourceSha256:'a'.repeat(64),authorizationNote:'Synthetic test authorization only',selections:[selection]};
it('requires explicit authorization and a source fingerprint',()=>{
 expect(()=>validateSignatureTransfer({...request,authorized:false})).toThrow(/authorized/);
 expect(()=>validateSignatureTransfer({...request,sourceSha256:''})).toThrow(/Reload/);
 expect(()=>validateSignatureTransfer({...request,authorizationNote:'yes'})).toThrow(/Record/);
 expect(validateSignatureTransfer(request)).toEqual(request);
});
it.each([{x:-.1},{width:1},{height:.9},{page:0},{page:21},{x:NaN},{signedDate:'2025-02-30'},{role:'someone'}])('rejects invalid selection %j',change=>{
 expect(()=>validateSignatureTransfer({...request,selections:[{...selection,...change}]})).toThrow();
});
it('rejects duplicate roles and ignores extra client fields',()=>{
 expect(()=>validateSignatureTransfer({...request,selections:[selection,selection]})).toThrow();
 expect(validateSignatureTransfer({...request,signatureImage:'untrusted',selections:[{...selection,signatureImage:'untrusted'}]})).toEqual(request);
});
it('rejects cross-client or unverified application storage paths',()=>{
 expect(signatureSourcePath({lead_id:'a',storage_path:'leads/a/file.pdf'},'a')).toBe('leads/a/file.pdf');
 expect(()=>signatureSourcePath({lead_id:'a',storage_path:'leads/b/file.pdf'},'a')).toThrow();
 expect(()=>signatureSourcePath({lead_id:'a',application_id:'app',storage_path:'applications/app/file.pdf'},'a')).toThrow();
 expect(signatureSourcePath({lead_id:'a',application_id:'app',storage_path:'applications/app/file.pdf'},'a','app')).toBe('applications/app/file.pdf');
});
