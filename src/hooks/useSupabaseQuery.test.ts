// @vitest-environment jsdom
import {act,renderHook,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {useSupabaseQuery} from './useSupabaseQuery';
afterEach(cleanup);
it('ignores an old lead response after switching to another lead',async()=>{
 let resolveA!:(value:string[])=>void;let resolveB!:(value:string[])=>void;
 const a=new Promise<string[]>(resolve=>{resolveA=resolve;});const b=new Promise<string[]>(resolve=>{resolveB=resolve;});
 const {result,rerender}=renderHook(({lead})=>useSupabaseQuery(()=>lead==='a'?a:b,[] as string[],[lead]),{initialProps:{lead:'a'}});
 rerender({lead:'b'});await act(async()=>resolveB(['B lender']));await waitFor(()=>expect(result.current.data).toEqual(['B lender']));
 await act(async()=>resolveA(['A lender']));expect(result.current.data).toEqual(['B lender']);expect(result.current.loading).toBe(false);
});
