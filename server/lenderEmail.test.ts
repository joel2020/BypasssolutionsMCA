import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PACKAGE_BYTES, parsePackage, sendLenderPackage, type LenderDependencies, type PackageInput } from '../supabase/functions/gmail-send-lender/handler';
const id = (n: number) => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const input: PackageInput = { request_id:id(1),lead_id:id(2),application_id:id(3),funding_partner_id:id(4),recipient:'lender@example.com',document_ids:[id(5)],subject:'Funding — Client',body:'Please review.\n\nThank you.' };
const document = { id:id(5),lead_id:id(2),file_name:'statement.pdf',storage_path:`leads/${id(2)}/statement.pdf`,file_size:5,mime_type:'application/pdf',status:'Uploaded' };
let deps: LenderDependencies;
beforeEach(()=>{ deps = {
  userId:id(6),authorize:vi.fn().mockResolvedValue({email:'lender@example.com',from:'rep@example.com'}),documents:vi.fn().mockResolvedValue([document]),download:vi.fn().mockResolvedValue(new Blob([new Uint8Array([0,255,1,13,10])])),receipt:vi.fn().mockResolvedValue(null),reserve:vi.fn().mockResolvedValue(undefined),send:vi.fn().mockResolvedValue({id:'gmail-id',threadId:'thread'}),complete:vi.fn().mockResolvedValue(undefined),markUnknown:vi.fn().mockResolvedValue(undefined),
}; });
describe('lender email package',()=>{
 it('sends binary attachments and records only after Gmail accepts',async()=>{
  const result=await sendLenderPackage(input,deps);
  expect(result.sent).toBe(true);
  const raw=vi.mocked(deps.send).mock.calls[0][0];
  const mime=Buffer.from(raw,'base64url').toString();
  expect(mime).toContain('multipart/mixed'); expect(mime).toContain('To: lender@example.com');
  expect(mime).toContain('filename="statement.pdf"'); expect(mime).toContain('AP8BDQo=');
  expect(mime).toContain('Content-Type: application/pdf');
  expect(vi.mocked(deps.reserve).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(deps.send).mock.invocationCallOrder[0]);
  expect(vi.mocked(deps.complete).mock.invocationCallOrder[0]).toBeGreaterThan(vi.mocked(deps.send).mock.invocationCallOrder[0]);
 });
 it('strips untrusted ownership and delivery-state overrides',()=>{
  const parsed=parsePackage({...input,user_id:id(99),state:'sent',gmail_message_id:'fake'});
  expect(parsed).not.toHaveProperty('user_id');expect(parsed).not.toHaveProperty('state');
 });
 it('requires explicit file selection',async()=>{
  await expect(sendLenderPackage({...input,document_ids:[]},deps)).rejects.toThrow(/Choose/);expect(deps.send).not.toHaveBeenCalled();
 });
 it('denies a caller without client/application access',async()=>{
  vi.mocked(deps.authorize).mockRejectedValue(new Error('access denied'));
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/access/);expect(deps.download).not.toHaveBeenCalled();
 });
 it('rejects stale or substituted lender recipients',async()=>{
  await expect(sendLenderPackage({...input,recipient:'different@example.com'},deps)).rejects.toThrow(/changed/);expect(deps.send).not.toHaveBeenCalled();
 });
 it.each(['Missing','Pending','Rejected'])('blocks %s files',async status=>{
  vi.mocked(deps.documents).mockResolvedValue([{...document,status}]);
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/unavailable/);expect(deps.send).not.toHaveBeenCalled();
 });
 it('rejects files owned by another client',async()=>{
  vi.mocked(deps.documents).mockResolvedValue([{...document,lead_id:id(99)}]);
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/another client/);expect(deps.download).not.toHaveBeenCalled();
 });
 it('rejects missing files instead of sending a partial package',async()=>{
  vi.mocked(deps.documents).mockResolvedValue([]);
  await expect(sendLenderPackage(input,deps)).rejects.toThrow();expect(deps.send).not.toHaveBeenCalled();
 });
 it('rejects a storage path pointing at another client',async()=>{
  vi.mocked(deps.documents).mockResolvedValue([{...document,storage_path:`leads/${id(99)}/other.pdf`}]);
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/document folder/);expect(deps.download).not.toHaveBeenCalled();
 });
 it('rejects oversized packages before downloading',async()=>{
  vi.mocked(deps.documents).mockResolvedValue([{...document,file_size:MAX_PACKAGE_BYTES+1}]);
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/18 MB/);expect(deps.download).not.toHaveBeenCalled();
 });
 it('checks actual file sizes rather than trusting metadata',async()=>{
  vi.mocked(deps.download).mockResolvedValue(new Blob([new Uint8Array(MAX_PACKAGE_BYTES+1)]));
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/18 MB/);expect(deps.send).not.toHaveBeenCalled();
 });
 it('does not send when downloading a selected document fails',async()=>{
  vi.mocked(deps.download).mockRejectedValue(new Error('file unavailable'));
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/unavailable/);expect(deps.reserve).not.toHaveBeenCalled();
 });
 it('does not repeat an accepted request',async()=>{
  vi.mocked(deps.receipt).mockResolvedValue({id:id(1),state:'sent',gmail_message_id:'previous'});
  expect(await sendLenderPackage(input,deps)).toMatchObject({sent:true,already_sent:true,message_id:'previous'});expect(deps.send).not.toHaveBeenCalled();
 });
 it('blocks retries while delivery is uncertain',async()=>{
  vi.mocked(deps.receipt).mockResolvedValue({id:id(1),state:'unknown'});
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/uncertain/);expect(deps.send).not.toHaveBeenCalled();
 });
 it('does not send when another request won the reservation race',async()=>{
  vi.mocked(deps.reserve).mockRejectedValue(new Error('duplicate request'));
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/duplicate/);expect(deps.send).not.toHaveBeenCalled();
 });
 it('records uncertainty after a Gmail transport failure without claiming a submission',async()=>{
  vi.mocked(deps.send).mockRejectedValue(new Error('network failure'));
  await expect(sendLenderPackage(input,deps)).rejects.toThrow(/Check Gmail Sent/);
  expect(deps.markUnknown).toHaveBeenCalledWith(id(1));expect(deps.complete).not.toHaveBeenCalled();
 });
 it('reports accepted mail even when CRM logging fails',async()=>{
  vi.mocked(deps.complete).mockRejectedValue(new Error('database error'));
  expect(await sendLenderPackage(input,deps)).toMatchObject({sent:true,message_id:'gmail-id',warning:expect.stringContaining('Do not resend')});
 });
});
