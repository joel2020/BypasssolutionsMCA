// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {DocumentList} from './CrmWorkflowComponents';
import type {Document} from '../../lib/supabase';
const mocks=vi.hoisted(()=>({url:vi.fn()}));
vi.mock('../../hooks/useDocuments',()=>({createDocumentSignedUrl:mocks.url,deleteDocument:vi.fn(),REQUIRED_DOCUMENT_TYPES:[],useUploadDocument:vi.fn()}));
const doc={id:'doc',file_name:'sample.pdf',storage_path:'leads/l/sample.pdf',status:'Uploaded'} as Document;
afterEach(cleanup);
it('renders the document outside the containing card and closes with Escape',async()=>{
 mocks.url.mockResolvedValue('https://example.test/private.pdf');const {container}=render(<div style={{transform:'translateZ(0)'}}><DocumentList documents={[doc]}/></div>);
 fireEvent.click(screen.getByText('View'));const dialog=await screen.findByRole('dialog');
 expect(container.contains(dialog)).toBe(false);expect(dialog.parentElement).toBe(document.body);expect(screen.getByTitle('sample.pdf').getAttribute('src')).toContain('#view=FitH');
 expect(document.body.style.overflow).toBe('hidden');fireEvent.keyDown(window,{key:'Escape'});
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(document.body.style.overflow).toBe('');
});
it('shows a signed URL error without opening an empty viewer',async()=>{
 mocks.url.mockRejectedValue(new Error('Document unavailable'));render(<DocumentList documents={[doc]}/>);fireEvent.click(screen.getByText('View'));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Document unavailable'));expect(screen.queryByRole('dialog')).toBeNull();
});
