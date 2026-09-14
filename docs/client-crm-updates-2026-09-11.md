# Client CRM updates — September 11, 2026

The client-requested lead status, submission overview, document viewer and funding partner editor are deployed to https://crm.bypasssolution.com. Implementation commits: `83175b4` and `8087647`.

## Behavior

- Leads have six contact-status choices and a filter. Contact status is stored separately from underwriting stage; selecting Submitted does not send an email.
- Overview lists lender submissions across every application belonging to the current lead. Missing lead/application queries return no records. Late query results cannot replace another client's results.
- Overview and Notes share an append-only, timestamped composer. The server derives the author from the active CRM profile and checks access. Notes refresh on focus, periodically while visible, or manually.
- Documents occupy the full content width and open in a full-viewport viewer with close/Escape and a new-tab fallback.
- Funding partner create/edit retains the existing layout and adds Elite-style routing and criteria fields, including submission address, CCs, portal/method, funding minimums, business age, FICO, positions, negative days, NSFs, decision time, states, products, industries, documents and notes.
- Gmail uses the saved submission address (contact-email fallback), copies the contact plus additional CCs, and removes duplicate/primary recipients. The server validates current stored routing and rejects a stale preview. Delivery/activity records include CCs.
- Live testing exposed session-refresh remounts that discarded open tabs/viewers. The guard now rechecks the same account in the background while preserving UI state; switching accounts hides prior content immediately, and revoked/error results deny access.

## Verification

- `npm run verify`: 232 tests across 33 files, app/server TypeScript, ESLint and production build passed. Vite retains a nonblocking large-chunk advisory.
- Deno check passed for the changed Gmail lender function.
- Tests cover all six status values, persistence/error handling, real additive migration SQL in PGlite, author spoofing/ownership, input bounds, cross-lead and late-response isolation, viewer portal/errors, partner fields, recipient deduplication/stale CC rejection and session-refresh/account-switch/revocation behavior.
- Production browser: synthetic lead changed to Unresponsive; SQL confirmed underlying pipeline remained New Lead. After reload, the Unresponsive filter returned only the synthetic lead.
- Production browser: created a synthetic funding partner with routing and criteria; SQL confirmed values. Reopened editor and changed decision days from 2 to 3; SQL confirmed update.
- Production overview showed two lenders across two applications for the test lead and excluded the lender on a different test lead.
- Production note posted through the UI and stored with the authenticated admin ID, name and timestamp. It persisted after reload and appeared in both Overview and Notes.
- After the session fix, the private synthetic PDF rendered at full viewport width in Chrome, with readable content, native PDF controls and a working close button.
- Production recipient preview showed To `submit@example.invalid`, CC `contact@example.invalid, cc@example.invalid`; choosing the synthetic PDF enabled Send. Send was not clicked. SQL confirmed zero Gmail messages and delivery records for both test leads.

## Release and database

Production deployment: `dpl_3J8EBwAFR84NiiBjbKBfecRQ9JdK`, https://bypasssolutions-a4mmh4iiz-joel-carias-projects.vercel.app, aliased to the CRM domain. GitHub verify, Vercel preview and Supabase preview checks passed for `8087647`.

Only additive migration `20260911022441_client_crm_updates.sql` was applied and recorded on production and preview. Historical migrations/seeds were not replayed. The changed `gmail-send-lender` function was deployed to both projects with existing JWT verification preserved. Security advisor findings were unchanged.

The existing PR remains draft pending reconciliation of historical hosted migration drift. Earlier Google login/Gmail and application import/signature verification are documented separately. Gmail OAuth Testing restrictions and the need to review actual partner layouts remain unchanged. This phase did not send lender emails or validate SMS/signNow acceptance.

## Cleanup

The exact synthetic storage object was removed through the Storage API, then test notes, submissions, document metadata, applications, leads and funding partners were deleted. Final hosted counts were zero for all seven categories. No real customer record or account was changed by QA.

Detailed local evidence is in `/tmp/bypass-client-updates/` (final-verify.log, final-deploy.log, migration/function logs, fixture IDs and cleanup logs). No credentials are included in this report.
