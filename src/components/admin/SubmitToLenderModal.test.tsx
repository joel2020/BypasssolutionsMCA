// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SubmitToLenderModal from './SubmitToLenderModal';
import type { Document } from '../../lib/supabase';
const mocks=vi.hoisted(()=>({send:vi.fn(),connected:true}));
vi.mock('../../hooks/useGmail',()=>({sendLenderEmail:mocks.send,getGmailConnection:vi.fn()}));
vi.mock('../../hooks/useSupabaseQuery',()=>({useSupabaseQuery:()=>({data:mocks.connected?{status:'connected',gmail_email:'rep@example.com'}:null,loading:false,error:null})}));
vi.mock('../../hooks/usePartnerSubmissions',()=>({useFundingPartners:()=>({data:[{id:'lender',name:'Test Lender',email:'lender@example.com',status:'Active'}],loading:false,error:null})}));
const doc={id:'document',file_name:'statement.pdf',doc_type:'Bank Statement',status:'Uploaded',storage_path:'leads/lead/statement.pdf',file_size:100} as Document;
const changed=vi.fn();
const show=()=>render(<MemoryRouter><SubmitToLenderModal leadId="lead" applicationId="application" documents={[doc]} businessName="Client Business" onClose={vi.fn()} onSubmitted={changed}/></MemoryRouter>);
beforeEach(()=>{mocks.connected=true;mocks.send.mockReset();changed.mockReset();});afterEach(cleanup);
it('sends selected client document IDs to the reviewed lender',async()=>{
 mocks.send.mockResolvedValue({sent:true,message_id:'gmail'});show();
 expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
 fireEvent.change(screen.getByLabelText('Lender'),{target:{value:'lender'}});fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Send Email with Attachments'}));
 await waitFor(()=>expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({recipient:'lender@example.com',lead_id:'lead',application_id:'application',document_ids:['document']})));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Sent to Test Lender'));
 expect(changed).toHaveBeenCalledOnce();
});
it('requires a connected Gmail account',()=>{
 mocks.connected=false;show();expect((screen.getByRole('button',{name:'Send Email with Attachments'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByRole('link',{name:'Email page'}).getAttribute('href')).toBe('/admin/email');
});
it('keeps the composer open and reports failed delivery',async()=>{
 mocks.send.mockRejectedValue(new Error('Check Gmail Sent before retrying'));show();
 fireEvent.change(screen.getByLabelText('Lender'),{target:{value:'lender'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Send Email with Attachments'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Check Gmail Sent'));expect(changed).not.toHaveBeenCalled();
});
