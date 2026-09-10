import { beforeEach, expect, it, vi } from 'vitest';
import handler from '../api/generate-application';
const mock=vi.hoisted(()=>({source:true,insertError:false,draw:vi.fn(),insert:vi.fn(),remove:vi.fn(),updates:vi.fn()}));
vi.mock('../server/crmAccess.js',()=>({getWritableLead:vi.fn(async()=>({lead:{id:'lead',legal_name:'Example LLC',business_name:'Example LLC',owner_full_name:'Test Owner',ein_last_four:'1111',ssn_last_four:'2222'}}))}));
vi.mock('pdf-lib',()=>({StandardFonts:{Helvetica:'Helvetica'},rgb:vi.fn(),PDFDocument:{load:vi.fn(async()=>({embedFont:async()=>({widthOfTextAtSize:()=>30}),getPages:()=>[{drawText:mock.draw}],save:async()=>new Uint8Array([1,2,3])}))}}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({
 auth:{getUser:async()=>({data:{user:{id:'rep'}},error:null})},
 from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mock.source?{id:'source'}:null,error:null}),update:mock.updates,insert:(data:unknown)=>{mock.insert(data);return q;},single:async()=>({data:mock.insertError?null:{id:'generated'},error:mock.insertError?new Error('db'):null})};return q;},
 storage:{from:()=>({download:async()=>({data:{arrayBuffer:async()=>new ArrayBuffer(0)},error:null}),upload:async()=>({error:null}),remove:mock.remove})}
})}));
beforeEach(()=>{mock.source=true;mock.insertError=false;vi.clearAllMocks();vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_ANON_KEY','anon');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','service');});
const run=async(body:unknown)=>{const json=vi.fn();const status=vi.fn().mockReturnValue({json});await handler({method:'POST',headers:{authorization:'Bearer test'},body},{setHeader:vi.fn(),status});return {status,json};};
it('renders reviewed identifiers into private PDF without changing the source signature status',async()=>{
 const result=await run({leadId:'lead',sourceDocumentId:'source',identifiers:{ein:'12-3456789',ssn:'123-45-6789'},partner:{partner_full_name:'Second Owner',partner_dob:'1982-02-12'}});
 expect(result.status).toHaveBeenCalledWith(200);
 expect(mock.draw).toHaveBeenCalledWith('12-3456789',expect.anything());expect(mock.draw).toHaveBeenCalledWith('123-45-6789',expect.anything());
 expect(mock.draw).toHaveBeenCalledWith('Second Owner',expect.anything());expect(mock.updates).not.toHaveBeenCalled();expect(JSON.stringify(mock.insert.mock.calls)).not.toContain('123-45-6789');
});
it('rejects a source from a different or inaccessible lead before rendering',async()=>{
 mock.source=false;const result=await run({leadId:'lead',sourceDocumentId:'other-source'});
 expect(result.status).toHaveBeenCalledWith(403);expect(mock.draw).not.toHaveBeenCalled();expect(mock.insert).not.toHaveBeenCalled();
});
it('cleans up the generated file if attaching its database row fails',async()=>{
 mock.insertError=true;const result=await run({leadId:'lead'});expect(result.status).toHaveBeenCalledWith(502);expect(mock.remove).toHaveBeenCalledOnce();
});
it.each(['{bad', {leadId:'lead',identifiers:{ein:'<invalid>'}}])('rejects malformed payload before generating',async body=>{
 const result=await run(body);expect(result.status).toHaveBeenCalledWith(400);expect(mock.draw).not.toHaveBeenCalled();
});
