# Gmail integration setup — September 10, 2026

Google Cloud project: `refined-analogy-508220-d6` (Bypass Solutions CRM), created with explicit authorization under the signed-in account `joelcariasrecruiter@gmail.com`.

## Configuration

- Gmail API enabled; web OAuth client named **Bypass CRM Gmail**.
- Callback: `https://hiweeafewcralneqfosy.supabase.co/functions/v1/gmail-oauth-callback`.
- Consent branding links point to the CRM, the existing `/privacy` policy and `/terms` page.
- Scopes: `openid`, email identity, `gmail.readonly`, `gmail.send`. No mailbox modification/deletion permission is requested.
- Google app is in **Testing**. The audience table lists `joelcarias23@gmail.com`. Additional reps require test-user enrollment until production publishing/verification is completed.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and a randomly generated 256-bit `GMAIL_TOKEN_ENCRYPTION_KEY` are stored in Supabase Edge Function secrets. Never commit these or rotate the encryption key without migrating existing encrypted tokens.
- Production migration `20260910203331_gmail_production_setup.sql` installs missing Gmail tables and communications fields without replaying unrelated historical storage migrations. Its hosted history marker is reconciled with the repository filename.
- All five Gmail functions are deployed. Four require a Supabase JWT and an active CRM writable profile. Only the Google callback has gateway JWT verification disabled; it requires an expiring, single-use server-side OAuth state and rechecks CRM access.

## Frontend release

Source commit `d40db5c` was deployed and promoted to `https://crm.bypasssolution.com` as Vercel deployment `dpl_9d5tSKTKoze1Mwt61sG4U94DVjWr`. The email route returned HTTP 200 on the verified deployment; the live CRM correctly requires sign-in before opening Email. GitHub verification, Vercel preview and Supabase preview checks passed.

## Repairs

Tokens are encrypted with AES-GCM and inaccessible to browser database clients. Gmail metadata/messages are restricted to the mailbox owner, including admins. Server persistence uses a service client after caller authentication; lead matching still uses the caller's RLS-scoped client. Unmatched personal mail is not copied into shared CRM communications.

Fixed malformed MIME body separation, Unicode decoding, subject/header injection, duplicate message IDs across mailboxes, discarded database errors, missing production communications fields, OAuth callback error display, and incomplete token clearing on disconnect. Sending validates a supplied lead before contacting Google. If Gmail accepts a message but CRM logging fails, the UI reports it as sent and advises sync instead of resending.

Sync is manual and reads the latest 50 Inbox and 50 Sent message references per run; it does not import the complete mailbox or download attachments.

## Verification and remaining acceptance

- `npm run verify`: 106 tests across 17 files passed; frontend/server types, lint and production build passed.
- Deno typecheck passed for all six Edge Functions, including the existing invitation function.
- Nine targeted Gmail regressions verify MIME/Unicode, header rejection, encryption/tampering, mailbox isolation, browser credential denial, viewer denial and one-time OAuth state consumption.
- Hosted preview transaction test passed for mailbox/message isolation and credential protection; all synthetic fixtures were rolled back.
- Live unauthenticated calls to OAuth start, send, sync and disconnect returned 401. A callback without code/state redirected to the CRM with an explicit error.
- Supabase advisor marks the OAuth-state table as RLS-enabled with no policies. This is intentional: only the service role can consume those states; public/anon/authenticated grants are revoked. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- No mailbox has been authorized and no Gmail message was sent during setup. Joel must sign in to CRM → Email → Connect Gmail and approve the Google permissions. Then verify sync, an explicitly approved test send, refresh and disconnect.
- Testing-mode grants for these Gmail scopes expire after seven days. Production publishing and Google's applicable verification are still required for an unrestricted rollout. [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2#expiration).
- The existing PR remains unmerged because older Supabase migration history is inconsistent; release directly from the verified branch rather than replaying old migrations/seeds.
