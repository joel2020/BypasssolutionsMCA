// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ConvertToBypassModal from './ConvertToBypassModal';
import type { Lead } from '../../lib/supabase';
const mocks=vi.hoisted(()=>({update:vi.fn(),read:vi.fn()}));
vi.mock('../../lib/leadMutations',()=>({updateLead:mocks.update}));
vi.mock('../../lib/readApplication',()=>({readApplication:mocks.read}));
vi.mock('../../lib/supabase',()=>({supabase:{auth:{getSession:vi.fn().mockResolvedValue({data:{session:{access_token:'test'}}})}}}));
const lead={id:'lead',legal_name:'Existing Business',owner_full_name:'Existing Owner',annual_revenue:0} as unknown as Lead;
const close=vi.fn();const done=vi.fn();
const show=()=>render(<ConvertToBypassModal lead={lead} sourceDocumentId="source" onClose={close} onDone={done} />);
beforeEach(()=>{close.mockClear();done.mockClear();mocks.update.mockReset().mockResolvedValue(undefined);mocks.read.mockReset();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({fieldsFilled:2})}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('requires review and never sends email when attaching or pressing enter',async()=>{
 show();expect((screen.getByRole('button',{name:'Attach only'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByLabelText(/I reviewed/));
 fireEvent.submit(screen.getByRole('button',{name:'Attach only'}).closest('form')!);
 await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith('lead',expect.objectContaining({annual_revenue:0,start_date:null,owner_dob:null})));
 await waitFor(()=>expect(done).toHaveBeenCalledOnce());expect(close.mock.invocationCallOrder[0]).toBeLessThan(done.mock.invocationCallOrder[0]);
 expect(fetch).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledWith('/api/generate-application',expect.anything());
});
it('shows extracted suggestions and warnings without saving until reviewed',async()=>{
 mocks.read.mockResolvedValue({fields:{legal_name:'Partner Company'},warnings:['Multiple owners: check original'],text:'Legal name: Partner Company',pageCount:1});
 show();fireEvent.click(screen.getByRole('button',{name:'Extract & fill fields'}));
 await waitFor(()=>expect((screen.getByLabelText(/Legal business name/) as HTMLInputElement).value).toBe('Partner Company'));
 expect(screen.getByText('Multiple owners: check original')).toBeTruthy();expect(mocks.update).not.toHaveBeenCalled();
 expect((screen.getByRole('button',{name:'Attach only'}) as HTMLButtonElement).disabled).toBe(true);
});
it('reports access failures and does not generate a PDF after a rejected lead update',async()=>{
 mocks.update.mockRejectedValue(new Error('This lead could not be updated.'));
 show();fireEvent.click(screen.getByLabelText(/I reviewed/));fireEvent.click(screen.getByRole('button',{name:'Attach only'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('could not be updated'));
 expect(fetch).not.toHaveBeenCalled();
});

it('retains a date input when another field changes and sends it to the PDF',async()=>{
 show();fireEvent.input(screen.getByLabelText('Partner date of birth (PDF only)'),{target:{value:'1982-02-12'}});
 fireEvent.change(screen.getByLabelText('Partner full name (PDF only)'),{target:{value:'Second Owner'}});
 expect((screen.getByLabelText('Partner date of birth (PDF only)') as HTMLInputElement).value).toBe('1982-02-12');
 fireEvent.click(screen.getByLabelText(/I reviewed/));fireEvent.click(screen.getByRole('button',{name:'Attach only'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
 expect(body.partner.partner_dob).toBe('1982-02-12');
});
