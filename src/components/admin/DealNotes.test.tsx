// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import DealNotes from './DealNotes';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),refetch:vi.fn()}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('../../hooks/useNotes',()=>({useNotes:()=>({data:[{id:'n',text:'Rep update',created_by_name:'Assigned rep',created_at:'2026-09-11T00:00:00Z'}],loading:false,error:null,refetch:mocks.refetch})}));
afterEach(cleanup);beforeEach(()=>{mocks.rpc.mockReset();mocks.refetch.mockReset();});
it('posts only the deal ID and text, leaving author attribution to the server',async()=>{
 mocks.rpc.mockResolvedValue({data:{id:'new'},error:null});render(<DealNotes leadId="deal"/>);
 expect(screen.getByText('Rep update')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Add a deal note'),{target:{value:'Admin reviewed the file'}});fireEvent.click(screen.getByText('Post note'));
 await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('add_deal_note',{p_lead_id:'deal',p_text:'Admin reviewed the file'}));
 await waitFor(()=>expect(mocks.refetch).toHaveBeenCalled());expect((screen.getByLabelText('Add a deal note') as HTMLTextAreaElement).value).toBe('');
});
it('keeps the draft after a failed save and blocks blank notes',async()=>{
 mocks.rpc.mockResolvedValue({error:{message:'Access changed'}});render(<DealNotes leadId="deal"/>);
 expect((screen.getByText('Post note') as HTMLButtonElement).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Add a deal note'),{target:{value:'Keep my draft'}});fireEvent.click(screen.getByText('Post note'));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Access changed'));
 expect((screen.getByLabelText('Add a deal note') as HTMLTextAreaElement).value).toBe('Keep my draft');
});
