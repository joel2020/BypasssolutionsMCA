// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,renderHook,waitFor} from '@testing-library/react';
import {usePartnerSubmissions} from './usePartnerSubmissions';
const mocks=vi.hoisted(()=>({from:vi.fn(),eq:vi.fn(),in:vi.fn(),order:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{from:mocks.from}}));
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.from.mockImplementation(table=>({select:()=>table==='applications'?{eq:mocks.eq}:{in:mocks.in}}));mocks.in.mockReturnValue({order:mocks.order});mocks.order.mockResolvedValue({data:[{id:'submission'}],error:null});});
it('does not query other submissions when no lead or applications exist',async()=>{
 const missing=renderHook(()=>usePartnerSubmissions(undefined));await waitFor(()=>expect(missing.result.current.loading).toBe(false));expect(mocks.from).not.toHaveBeenCalled();missing.unmount();
 mocks.eq.mockResolvedValue({data:[],error:null});const empty=renderHook(()=>usePartnerSubmissions('lead'));await waitFor(()=>expect(empty.result.current.loading).toBe(false));expect(mocks.from).toHaveBeenCalledTimes(1);expect(empty.result.current.data).toEqual([]);
});
it('includes all applications for this lead and restricts submissions to those IDs',async()=>{
 mocks.eq.mockResolvedValue({data:[{id:'app-1'},{id:'app-2'}],error:null});const {result}=renderHook(()=>usePartnerSubmissions('lead'));
 await waitFor(()=>expect(result.current.loading).toBe(false));expect(mocks.eq).toHaveBeenCalledWith('lead_id','lead');expect(mocks.in).toHaveBeenCalledWith('application_id',['app-1','app-2']);expect(result.current.data).toEqual([{id:'submission'}]);
});
