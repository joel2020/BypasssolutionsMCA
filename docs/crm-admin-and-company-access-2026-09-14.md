# Admin rep views and company access — September 14, 2026

Released to https://crm.bypasssolution.com as Vercel deployment `dpl_Hxg62VZzmJEsfph6DTbUPxLAKTkU`. Production build was staged with `--skip-domain`, returned HTTP 200, then promoted. The user confirmed that Ninja mode permits editing under the admin's existing permissions and that the company domain is `bypasssolution.com`.

## CRM changes

- Active admins can select an active sales rep in the sidebar's Ninja mode selector. Dashboard, pipeline, leads, submissions, offers, documents, tasks, calls, commissions and reports use that rep's assigned records. Both UUID assignments and legacy name assignments are recognized.
- A persistent banner identifies the selected rep. Authentication and mutation identity remain the admin's. Exiting restores the company view. Switching reps remounts record panels so open editors do not carry across views. Email/account settings require exiting; mailbox ownership policies and token access are unchanged.
- Leads has an admin rep selector, Unassigned option and rep search alongside company search and contact-status filtering. The count reflects the filtered rows.
- Submission details no longer offer Send e-sign App. Leads retains Send app; submission signature synchronization remains available.

## Company enrollment and Gmail

`20260914194556_company_crm_self_enrollment.sql` is applied to production; its local version matches hosted migration history. New users with a verified Google identity at exactly `@bypasssolution.com` receive an active sales-rep profile when entering the CRM. The function takes no user ID or role input, reads the authenticated user's verified Auth email and Google identity, and preserves every existing profile, including pending/disabled profiles and existing roles.

Automatic profile names use the verified email. User-editable Google display names are intentionally excluded because legacy record ownership also matches rep names. Admins can set the rep's display name through existing profile management.

Supabase's Before User Created hook now calls `public.before_company_user_created`. It rejects outside-domain registrations before an Auth session is issued. New signups are enabled, email confirmation is required, and anonymous sign-ins/manual linking remain disabled. Existing non-company admin accounts retain access.

Google Cloud project `refined-analogy-508220-d6` initially still listed only Joel in Testing. Roman's previously confirmed mailbox was enrolled and its saved row verified. The user then explicitly approved publishing the OAuth app for company-wide connections. Google now reports **In production**, so individual test-user enrollment is no longer required. CRM membership is still checked at Gmail OAuth start and callback; each user must grant consent to their own Gmail account.

Google verification remains pending. The console reports a 100-user cap for unapproved sensitive/restricted scopes, and users may see an unverified-app notice. See [Google's audience documentation](https://support.google.com/cloud/answer/15549945?hl=en). Publishing is not a claim that Google has verified the app or that every rep has completed consent.

## Verification

- `npm run verify`: 263 tests across 38 files passed, plus frontend/server TypeScript, ESLint and production build. The existing Vite large-chunk advisory remains.
- Enrollment and signup-hook regressions were first observed failing, then passing with the implementation. Coverage includes domain lookalikes, unverified email/Google identities, role/name claim injection, preserved disabled/pending profiles, and anonymous-call rejection.
- Browser tests cover rep switching across record hooks, admin identity preservation, exiting, non-admin restrictions and private settings blocking.
- Live Ninja mode showed 7 records for Luis against 14 total; the database independently returned the same counts. Live Leads filtering showed 4 of 9 lead-stage records, also matching the database. The submission editor opened and was cancelled without saving. Send e-sign App was absent on submission details; Send app remained on Leads.
- Live Auth settings returned Google enabled, signup disabled=false, mail auto-confirm=false. A signup request for a synthetic outside-domain address returned HTTP 403 with the company-domain error. No email was sent and no client record was modified.
- Hosted privileges confirm anonymous callers cannot enroll, authenticated users cannot invoke the signup hook, and Supabase Auth can invoke it. The SQL connector uses a read-only role, so direct hook execution through that connector was denied; actual Auth endpoint rejection verified the live hook instead.
- Supabase's [security-definer advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) flags the enrollment RPC. Authenticated execution is intentional: the narrowly scoped function creates only the caller's verified-company sales-rep profile. Existing advisor notices include other privileged RPCs, the service-only OAuth state table, and leaked-password protection being disabled; those were not changed.
- Claude review was attempted using the scoped diff, tests and security-sensitive files but failed because its OAuth session expired. No independent Claude approval is claimed.

Each new employee still needs to complete Google sign-in and **Email → Connect Gmail** personally. This release did not complete a new employee's Google consent flow or send a test Gmail message.

## Approved external address

The user clarified that `roman@elitefundingsol.com` should access Bypass CRM. Migration `20260914195729_allow_roman_elite_crm_access.sql` is applied to production and permits that exact address, case-insensitively, in both the Auth signup hook and verified Google enrollment. Other addresses at `elitefundingsol.com` remain ineligible. Initial access is an active sales-rep profile; existing profiles, verification checks and function privileges are preserved.

All 24 enrollment tests passed, including the four exception tests that failed before implementation. TypeScript and focused ESLint checks passed. Live function definitions and privileges confirm the exception and preserved verification/access controls. Claude review was attempted again but its OAuth session is still expired. Roman has no existing Auth account; he must complete Google sign-in and then Email → Connect Gmail himself. No account or email was created on his behalf.
