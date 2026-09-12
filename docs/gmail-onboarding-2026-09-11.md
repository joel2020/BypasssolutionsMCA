# Gmail onboarding investigation — September 11, 2026

The existing Joel mailbox successfully refreshed its expired Google access token and synced 100 messages in production. The success log is timestamped `2026-09-11 20:13:44.03706+00`, with no error. No email was sent during this investigation.

A CRM OAuth start from `roman@bypasssolution.com` reached the server at approximately 14:36 UTC but did not complete the callback. Google Cloud project `refined-analogy-508220-d6` is still in Testing, and its live audience table contains only `joelcarias23@gmail.com`. Accounts outside that list cannot authorize the Gmail scopes. The specific Google address Roman used and his displayed error remain to be confirmed; the CRM account address alone does not prove which mailbox he selected.

Google's documentation: https://support.google.com/cloud/answer/15549945?hl=en. Test-user authorizations for Gmail scopes expire after seven days. Adding the correct test account resolves that account's audience restriction; production publishing and applicable verification are separate rollout work. No audience or Google permissions were changed during this investigation.

Settings previously hard-coded Google Workspace as Connected for every user and claimed calendar sync, which is not implemented. It now reads the current user's existing Gmail connection, displays the connected mailbox only after a successful status check, and offers Connect Gmail when unconnected. Query failures and loading never show Connected. No authentication, RLS, OAuth scope, or token handling changed.

Validation: three new regression tests failed against the old behavior, then passed after the fix. Full `npm run verify` passed: 235 tests across 34 files, app/server TypeScript, ESLint and production build. The existing Vite large-chunk advisory is unchanged.

The investigation does not establish that Roman's mailbox is connected. His Google account selection/consent must be tested after the correct address is enrolled. Existing Gmail account isolation and CRM membership checks remain enforced.

Release: implementation `774bfa4` deployed as `dpl_74LMGj6Jjqd4CQvhecnSJWg1BuH1` to https://crm.bypasssolution.com. GitHub verify, Vercel preview and Supabase preview passed. Live Settings showed Checking connection, then Connected with `joelcarias23@gmail.com` and Manage Gmail after its query completed. The Google Add users form is prepared, with no address entered or saved, pending the affected mailbox clarification.

Continuation: using Roman's known CRM address as the likely Google account, entered `roman@bypasssolution.com` in Google Cloud's Add users form and submitted Save. The form did not show a confirmed success or updated list. Browser control then repeatedly timed out and reset. A fresh Google Cloud tab loaded its shell, but the audience list could not be read before another timeout. Enrollment is therefore unverified; check the saved list before adding again. No Gmail consent for Roman or email sending was performed.
