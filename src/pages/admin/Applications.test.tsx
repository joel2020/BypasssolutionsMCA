// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Applications from './Applications';
const mocks=vi.hoisted(()=>({update:vi.fn(),refetch:vi.fn(),isAdmin:true}));
vi.mock('../../hooks/useLeads',()=>({useLeads:()=>({data:[{id:'qa',status:'New Lead',business_name:'QA Client',first_name:'Test',last_name:'Owner',notes:'',email:'qa@example.test',phone:'',assigned_rep:'Rep'}],loading:false,error:null,refetch:mocks.refetch})}));
vi.mock('../../hooks/useScope',()=>({useScope:()=>({canAccess:()=>true,isAdmin:mocks.isAdmin})}));
vi.mock('../../hooks/useReps',()=>({useReps:()=>({data:[{id:'rep-1',full_name:'Rep',email:'rep@example.test'},{id:'rep-2',full_name:'Other',email:'other@example.test'}],error:null})}));
vi.mock('../../lib/leadMutations',()=>({updateLead:mocks.update}));
vi.mock('../../components/admin/NewApplicationModal',()=>({default:()=>null}));
vi.mock('../../components/admin/ManageLeadModal',()=>({default:()=>null}));
afterEach(cleanup);beforeEach(()=>{mocks.update.mockReset();mocks.refetch.mockReset();mocks.isAdmin=true;});
it('saves the selected contact disposition without changing the pipeline stage',async()=>{
 mocks.update.mockResolvedValue(undefined);render(<MemoryRouter><Applications/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Lead status for QA Client'),{target:{value:'Unresponsive'}});
 await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith('qa',{lead_status:'Unresponsive'}));await waitFor(()=>expect(mocks.refetch).toHaveBeenCalled());
});
it('reports failed status saves and keeps the previous value',async()=>{
 mocks.update.mockRejectedValue(new Error('Access changed'));render(<MemoryRouter><Applications/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Lead status for QA Client'),{target:{value:'Submitted'}});
 await waitFor(()=>expect(screen.getByText('Access changed')).toBeTruthy());expect((screen.getByLabelText('Lead status for QA Client') as HTMLSelectElement).value).toBe('New lead');
});
it('lets admins combine rep filtering and company search, and retains lead e-sign sending',()=>{
 render(<MemoryRouter><Applications/></MemoryRouter>);
 expect(screen.getByRole('button',{name:'Send app'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Filter leads by rep'),{target:{value:'rep-2'}});
 expect(screen.queryByText('QA Client')).toBeNull();
 fireEvent.change(screen.getByLabelText('Filter leads by rep'),{target:{value:'rep-1'}});
 expect(screen.getByText('QA Client')).toBeTruthy();
 fireEvent.change(screen.getByPlaceholderText('Search by company or rep...'),{target:{value:'rep'}});
 expect(screen.getByText('QA Client')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Filter leads by rep'),{target:{value:'Unassigned'}});
 expect(screen.queryByText('QA Client')).toBeNull();
});
it('does not offer other-rep filtering to non-admins',()=>{
 mocks.isAdmin=false;render(<MemoryRouter><Applications/></MemoryRouter>);
 expect(screen.queryByLabelText('Filter leads by rep')).toBeNull();
});
