# Email client files to lenders

Update: the later [production Gmail verification](gmail-live-verification-2026-09-10.md) confirmed real self-addressed delivery, PDF opening, submission history, token refresh, and client-link preservation during sync.

From a client's CRM record with an application, click **Submit to Lender**. Active admins, underwriters and sales reps can send within their existing client permissions. The composer shows the connected Gmail sender, an active lender's saved email address, editable subject/message, and document filenames with types and sizes. Choose files explicitly; no attachments are selected automatically. Each send goes to one lender, keeping other lenders' addresses private.

The package contains real MIME attachments downloaded by the authenticated caller from the private CRM document bucket. Select 1–20 files totaling at most 18 MB. Missing, pending, rejected, empty, inaccessible and wrong-client files are rejected before Gmail is called. Files must be stored in the selected client's lead/application folder; legacy files elsewhere must be uploaded into that folder before sending.

A unique request ID is reserved before Gmail is called. Concurrent/repeated requests cannot send the same package twice. A network failure after the send starts is marked uncertain and requires checking Gmail Sent rather than automatically retrying. Once Gmail returns a message ID, an atomic database function records the delivery, lender submission, attachment IDs and client email activity. If logging fails after Google accepts the email, the composer explicitly reports it as sent and warns against resending.

## Validation

- Full verification passed: **128 tests across 19 files**, frontend/API typechecks, lint and Vite production build. The final submission-history badge also passed typechecking/lint.
- All seven Edge Functions passed Deno typechecking.
- New handler tests cover binary attachments, wrong-client files, stale lender addresses, inaccessible/oversized documents, duplicate reservations, uncertain sends and post-send logging failures. Composer tests cover explicit selection, Gmail connection requirements and visible failure handling.
- Hosted Supabase preview completion test passed: repeat completion returns the same submission; Gmail/client activity logs include the send; browser users cannot fabricate delivery records or execute completion. Fixtures were rolled back. Reproducible SQL: `supabase/tests/lender_email_delivery.sql` (run against an isolated preview).
- Migration adds the missing `included_document_ids` column on previews where historical schema differed, then adds the delivery receipt table and service-only, security-invoker completion RPC.

## Acceptance still requiring a person

A CRM user must connect Gmail first. Google OAuth remains in Testing with Joel's mailbox listed. No actual lender email or client file was sent during development. A test with an explicitly approved recipient and non-sensitive sample documents is still needed to verify inbox delivery and attachment opening.

## Production release

Source commit `4c34f65` was promoted to `https://crm.bypasssolution.com` as Vercel deployment `dpl_DR3ijbbA256eeUKmwHaXCH2JesrK`. The public CRM asset matches the verified deployment. `gmail-send-lender` is ACTIVE with JWT verification enabled, and the new migration is applied with its repository history marker. An unauthenticated request returned 401. Production database checks confirmed the completion RPC is service-role-only and no lender delivery attempts were made during testing. GitHub, Vercel and Supabase preview checks passed; the security advisor reported no findings for the new lender objects.
