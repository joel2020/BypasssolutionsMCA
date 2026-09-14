# CRM review and repair — September 10, 2026

Repository: `joel2020/BypasssolutionsMCA`, reviewed from `31f2d2a`.
Branch: `codex/crm-reliability-review`.

The repaired frontend/API, invitation function, and two database migrations were deployed to production on September 10, 2026. Local verification and a hosted preview transaction test passed. Inbox delivery, password completion, new-rep browser acceptance, and the external integrations below remain unverified.

## Repaired findings

| Finding | Repair | Evidence |
| --- | --- | --- |
| Invited reps had no password setup page; an authenticated invitation redirected straight to the dashboard. No forgotten-password flow existed. | Added `/admin/set-password`, invitation/recovery routing, password confirmation, expired-link handling, and password-reset requests. | App routing, login, and password component tests. |
| Invitation failures could leave Auth accounts without CRM profiles; existing accounts required SQL intervention. | Active admins can recover an orphaned Auth account using the existing service-role-only bootstrap helper and resend access to existing active profiles. Existing CRM roles are not overwritten. Redirects use server-configured `APP_URL`. | Nine invitation handler tests; Deno typecheck. |
| Rep visibility checked only display names, although database ownership also accepts user IDs. Reassignments could leave the previous UUID owner attached. | UI checks both ownership fields; new leads use the selected rep UUID; reassignment replaces the old UUID. Rep choices exclude disabled profiles. | Access, new-lead, and lead-mutation tests. |
| Empty date inputs produced invalid Postgres date values; numeric parsing silently changed invalid/negative inputs. | Blank dates become NULL; invalid funding values are rejected; valid negative average balances and zero values are preserved. | Eight lead-field tests. |
| Editing, notes, and pipeline actions could claim success after zero rows changed or ignore errors. | Shared checked update helper requires a returned row and surfaces errors. | Lead-mutation tests. |
| Conversion could ignore failed saves/application inserts, advance a lead anyway, or create duplicates on retry. | A security-invoker RPC locks the lead, checks ownership and four uploaded bank statements, saves details, creates/reuses an application, and changes status in one transaction. | PostgreSQL tests: rollback on insert failure, missing/rejected documents, invalid dates, repeat calls, and unauthorized callers; modal failure tests. |
| Bank statements uploaded before conversion disappeared from deal detail because of an application-ID filter. | Retrieve documents for the lead, including pre-conversion uploads. | Source review; live upload/view smoke test still required. |
| Three service-role application endpoints checked only authentication. | Require an active writable CRM role, caller-scoped lead lookup, and matching ownership before privileged operations. | Eighteen endpoint tests deny other reps, viewers, disabled/missing profiles and invalid sessions. |
| A permissive legacy lead policy allowed viewer updates. Storage allowed reps to access other reps' documents. | Restrictive lead/storage policies bound existing permissions; owned storage deletion is explicitly supported. | PostgreSQL policy tests with deliberately broad legacy policies present. |
| Calls and SMS were browser-only sample workflows. | Calls now read/write `call_logs` for real leads. SMS no longer displays fictitious conversations or pretends to send messages. | Call persistence/failure and unavailable-SMS component tests. |
| API files were not typechecked and CI was only an ignored template. | Added server typechecking and an active GitHub Actions workflow, including Deno validation. | `npm run verify`; Deno check. |

## Initial live checks (before release)

- Confirmed `crm.bypasssolution.com` serves the app and uses project `hiweeafewcralneqfosy`.
- The project initially reported `COMING_UP` and rejected SQL connections. It subsequently became `ACTIVE_HEALTHY`, and metadata queries succeeded.
- There are two active admin profiles and no rep profiles. No test accounts or business records were created in production. A subsequently authorized password-reset request for an existing admin is recorded below.
- Verified lead/application/call-log columns used by these fixes exist. All public tables have RLS enabled.
- Confirmed the viewer lead-update and broad storage-read policies are present in production.
- Confirmed `bootstrap_crm_profile` is not executable by anonymous or ordinary authenticated clients.
- Only `invite-team-member` is currently deployed as a Supabase function. Gmail functions present in GitHub are not deployed.
- Migration history differs from repository filenames even where schema changes exist. Do not blindly replay historical migrations or seed production data.

## Verification

- Baseline: 27 tests passed but did not cover onboarding or conversion.
- Final: **97 tests across 15 files passed**, frontend/server TypeScript checks passed, ESLint passed, and the production Vite build passed (`npm run verify`).
- `deno check supabase/functions/invite-team-member/index.ts` passed.
- `git diff --check` passed.
- Database regression tests execute real PostgreSQL behavior locally using PGlite and fixtures. A separate hosted Supabase preview transaction test also passed (see release evidence). Email and provider APIs are mocked in the automated suite.
- Compatible lockfile updates removed the high-severity `ws` advisory. `npm audit --omit=dev` still reports two moderate entries in the React Router dependency chain. A complete fix requires a separate major-version upgrade; SSR hydration is not used here, and app navigation targets are fixed internal paths.
- Claude review was attempted, but its local OAuth session expired and could not refresh. No independent Claude approval is claimed.

## Production release evidence

- Released source commit: `c2a60ab3096d7e76a98f743827ecb0bbef17564a`; Vercel deployment `dpl_EMNDcc9tCtcssDfMbZchQaYPNSr8`, promoted successfully to `https://crm.bypasssolution.com`.
- Applied only the two new migrations to production project `hiweeafewcralneqfosy`. Reconciled their history markers to `20260910201059` and `20260910201604`; confirmed the conversion RPC and four restrictive policies each for leads and storage.
- Deployed `invite-team-member` version 3 with JWT verification enabled. Set `APP_URL=https://crm.bypasssolution.com`; confirmed Auth site URL and the existing CRM wildcard redirect permit the password route.
- Hosted preview test (`onsmjqylbpzfjquchmme`) created transaction-only fixtures for an authenticated rep, owned lead and four statement metadata records. Conversion succeeded, repeat conversion returned the same application, application count stayed one, nullable dates and owned-file permission checks passed. All fixtures were rolled back.
- The deployment password route returned HTTP 200. The public CRM rendered the new login/recovery flow; the public application-generation API returned HTTP 401 for a request without a CRM session. No error/fatal runtime logs were found for this deployment in the checked 30-minute window.
- Submitted the explicitly approved recovery request for Joel Carias at his existing admin account. The live UI confirmed that the request was accepted. No role change or password change was performed; inbox delivery and password/sign-in completion were not observed. This does not substitute for a new Sales Rep invitation acceptance test.
- GitHub Actions, Vercel preview, and Supabase preview checks passed for the released code. PR #21 remains open: production was promoted directly from the verified branch because the older main-branch Supabase migration history has drifted. Reconcile that history before merging or replaying historical migrations/seeds.

## Deployment runbook and remaining acceptance

Release steps 2–4 below are complete; retain this sequence for future deployments. Browser acceptance steps 5–7 remain.

1. Review this PR and the two new migrations. Preserve the existing security-invoker design and active-admin-only invitation authorization.
2. In the intended Supabase project, apply only `20260910201059_crm_safe_lead_conversion.sql` and `20260910201604_crm_document_access_boundary.sql` after reconciling migration history. Existing lead policies remain; restrictive policies narrow their effective permissions. No existing business data is backfilled or deleted.
3. Allow `https://crm.bypasssolution.com/admin/set-password` in Supabase Auth redirect URLs; retain existing login URLs. The [Supabase password guide](https://supabase.com/docs/guides/auth/passwords) explains the recovery/update flow.
4. Deploy the frontend/API branch and the updated `invite-team-member` function together. Set the function's `APP_URL=https://crm.bypasssolution.com`. Deploy the frontend before sending links to its new route. The conversion UI requires its RPC migration.
5. From Settings → Team → Add Team Member, invite an approved rep inbox with role Sales Rep. Accept the email, set a password, sign out, and sign in again. Verify resend/recovery links too.
6. As that rep, create and edit a lead with blank optional dates; reload; log a call; upload four non-sensitive statements; convert; confirm the statements remain visible. Try a failed conversion and retry. Verify another rep cannot read/edit that lead or download its documents and a viewer cannot write.
7. As admin, reassign a lead and verify the old rep loses access and the new rep gains it. Check tasks, offers, reports and earnings against real records.

## Remaining integration work

- SMS requires a real messaging provider and sending number; the previous screen never sent texts. It now says so explicitly.
- Gmail functions, database tables and Google credentials have now been configured; see `gmail-setup-2026-09-10.md`. Google mailbox consent, delivery acceptance and production publishing/verification remain.
- signNow endpoints now enforce CRM access, but signature requests, template rendering and signed-document retrieval still need a staging merchant test with configured provider credentials. No merchant messages were sent by this review.
- Supabase reports leaked-password protection is disabled. Its [password-security guide](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) covers enabling it. Existing authenticated-callable ownership helpers also produce [security-definer advisory notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable); these helpers are used by RLS and must not be revoked indiscriminately.
- The release used authenticated Vercel CLI 59.11.2; the CLI recommends an upgrade for future releases.
