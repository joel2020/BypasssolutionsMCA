import {expect,it} from 'vitest';
import {resolveLenderRecipients} from '../supabase/functions/_shared/lenderRecipients';
it('uses the submission inbox and deduplicates contact and extra CCs',()=>{
 expect(resolveLenderRecipients({email:'Rep@Lender.test',submission_email:'Inbox@Lender.test',additional_cc_emails:'REP@lender.test; other@lender.test INBOX@lender.test'})).toEqual({to:'inbox@lender.test',cc:['rep@lender.test','other@lender.test']});
});
it('falls back to the contact email without copying it twice',()=>{expect(resolveLenderRecipients({email:'lender@example.com'})).toEqual({to:'lender@example.com',cc:[]});});
it.each([{email:'bad'},{email:'good@example.com',additional_cc_emails:'bad'}, {email:'good@example.com\r\nBcc:evil@example.com'}])('rejects invalid recipients: %j',partner=>{expect(()=>resolveLenderRecipients(partner)).toThrow();});
