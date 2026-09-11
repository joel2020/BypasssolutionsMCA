// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Applications from './Applications';
const mocks=vi.hoisted(()=>({update:vi.fn(),refetch:vi.fn()}));
vi.mock('../../hooks/useLeads',()=>({useLeads:()=>({data:[{id:'qa',status:'New Lead',business_name:'QA Client',first_name:'Test',last_name:'Owner',notes:'',email:'qa@example.test',phone:'',assigned_rep:'Rep'}],loading:false,error:null,refetch:mocks.refetch})}));
vi.mock('../../hooks/useScope',()=>({useScope:()=>({canAccess:()=>true})}));
vi.mock('../../lib/leadMutations',()=>({updateLead:mocks.update}));
vi.mock('../../components/admin/NewApplicationModal',()=>({default:()=>null}));
vi.mock('../../components/admin/ManageLeadModal',()=>({default:()=>null}));
afterEach(cleanup);beforeEach(()=>{mocks.update.mockReset();mocks.refetch.mockReset();});
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
