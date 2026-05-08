# Bypass Solution — Production MCA / Working Capital CRM

Bypass Solution is a premium fintech web application for working-capital intake and internal MCA CRM operations. The product includes a public marketing site, secure multi-step application flow, private document intake, role-protected CRM, underwriting workflow scaffolding, communications logging, partner/offers/commission schema, sample MCA operating data, and production deployment guidance.

## Stack

- Vite + React + TypeScript
- Tailwind CSS dark fintech dashboard UI
- Recharts analytics
- Supabase Auth, Postgres, RLS, and private Storage
- React Router SPA deployment

## CRM capabilities

The admin CRM is available at `/admin/dashboard` on the main app and should be mapped to `https://crm.bypasssolution.com` in production. The CRM subdomain root redirects operators to `/admin` or `/admin/dashboard` based on auth state. It includes:

- Fixed dark navy sidebar with Bypass Solution branding and the tagline “Working Capital. Smarter. Faster.”
- Global search, notification bell, profile menu, filter action, and new-application action.
- KPI cards for applications, new leads, underwriting, approvals, funded deals, requested volume, funded volume, and conversion rate.
- Kanban-style MCA lifecycle columns: New, Submitted, In Review, Underwriting, Approved, Offer Sent, Funded, Declined, and Withdrawn.
- Application cards with business, owner, requested funding, monthly revenue, assigned rep, last activity, status, and progress.
- Activity feed for submissions, uploads, underwriting review, offers, follow-up tasks, notes, stage changes, and document requests.
- Recharts funding-volume trend and application-source mix.
- Underwriting snapshot, secure document checklist, and encrypted-upload indicator.
- Lead detail profile with tabs for Overview, Business Info, Owner Info, Underwriting, Documents, Email Activity, Offers, Communications, Tasks, Notes, and Activity Timeline.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. To test the CRM subdomain locally, add `127.0.0.1 crm.bypasssolution.test` to your hosts file and run Vite with an allowed host if needed; production uses `https://crm.bypasssolution.com`. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before testing application submissions, uploads, CRM login, or database-backed pages.

## Database setup

Apply the Supabase migrations in `supabase/migrations` in timestamp order:

1. `20260507183928_create_core_schema.sql` — legacy CRM core tables.
2. `20260507191338_fix_rls_policies_and_search_path.sql` — policy/search-path hardening.
3. `20260507203000_production_admin_roles_and_secure_crm.sql` — profiles, admin roles, RLS, private buckets.
4. `20260508090000_mca_application_crm_expansion.sql` — normalized MCA application/CRM expansion, status history, communications, partner submissions, underwriting, duplicate detection, private public-intake uploads.
5. `20260508120000_bypass_solution_crm_seed_data.sql` — realistic sample data for 18 Bypass Solution MCA applications, owners, documents, tasks, notes, offers, partner submissions, underwriting snapshots, activity logs, and commissions.
6. `20260508123000_add_joel_admin_user.sql` — secure idempotent Joel Carias admin-profile binding after Supabase Auth invite/reset-password account creation. It does not create or store a password.
7. `20260508133000_production_indexes_triggers_and_rls.sql` — production indexes, updated_at trigger coverage, and legacy broad-policy cleanup.
8. `20260508150000_gmail_integration_and_document_hardening.sql` — Gmail connection/message/sync tables, Gmail communication fields, RLS, and document bucket file-type hardening.

## Data model coverage

The CRM schema supports:

- `users` / `profiles` for authenticated role-based access.
- `applications`, `companies`, and `owners` for normalized MCA records.
- `documents` with private storage metadata and file validation policies.
- `tasks`, `notes`, `activity_logs`, and `application_status_history` for operational workflow and audit trail.
- `offers`, `funding_partners`, and `partner_submissions` for capital-provider workflow.
- `communications` and `email_templates` for CRM messaging.
- `pipeline_stages`, `application_underwriting`, `duplicate_detections`, and `commissions` for MCA operations.

## Required environment variables

### Frontend

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL for `hiweeafewcralneqfosy`. |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon key protected by RLS. |

### Supabase Edge Function secrets

Set these with `supabase secrets set ...` for project `hiweeafewcralneqfosy`:

| Secret | Scope | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Edge Functions only | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Edge Functions only | Google OAuth web client secret. Never expose this to frontend code. |
| `GOOGLE_REDIRECT_URI` | Edge Functions only | Must be `https://hiweeafewcralneqfosy.supabase.co/functions/v1/gmail-oauth-callback`. |
| `APP_URL` | Edge Functions only | CRM URL, `https://crm.bypasssolution.com`. |

Supabase also provides the Edge Function runtime with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The Gmail OAuth callback uses the service-role key server-side only to persist OAuth tokens after Google redirects back without a CRM JWT. Do not place service-role keys in Vite, Vercel browser variables, or frontend source.

### Google Cloud setup

Create a Google Cloud OAuth web client with Gmail API enabled and add this authorized redirect URI exactly:

```text
https://hiweeafewcralneqfosy.supabase.co/functions/v1/gmail-oauth-callback
```

Production CRM URL:

```text
https://crm.bypasssolution.com
```

## Admin user setup

Joel Carias is the permanent production CRM administrator:

- `full_name`: Joel Carias
- `email`: joelcarias23@gmail.com
- `role`: admin
- `status`: active

Use Supabase Auth's invite/reset-password flow instead of seed passwords:

1. In Supabase, open **Authentication → Users**.
2. Invite or create `joelcarias23@gmail.com` and send the invite/reset email.
3. After Joel accepts the invite or sets his password, apply/rerun `20260508123000_add_joel_admin_user.sql`.
4. Confirm `public.profiles` has Joel's Auth user ID with `role = 'admin'` and `status = 'active'`.

Allowed roles are `admin`, `underwriter`, `sales_rep`, and `viewer`. CRM access is blocked unless the profile is active and has an authorized role. Never store passwords in frontend code, migrations, Vercel variables, or documentation. See `docs/production-admin-bootstrap.md` for the exact production checklist.

## Storage setup

The migrations create private buckets:

- `application-documents`
- `credit-reports`
- `contracts`

Public applicants and CRM users can upload PDF, DOC, DOCX, JPG, JPEG, and PNG documents into `application-documents`; public reads are not permitted. CRM users view files through signed URLs only. Keep bucket public access disabled.

## Gmail setup

The CRM includes Supabase Edge Functions for full Gmail API integration:

- `gmail-oauth-start` starts Google OAuth for an authenticated CRM user.
- `gmail-oauth-callback` exchanges the Google code, fetches the Gmail profile, and stores server-side tokens.
- `gmail-sync` syncs the latest inbox and sent messages, matches messages to leads by email, and writes `gmail_messages` plus `communications`.
- `gmail-send` sends mail through the connected Gmail account and logs the outbound message.
- `gmail-disconnect` marks the connection disconnected and attempts token revocation without deleting historical CRM messages.

Token security note: Gmail access and refresh tokens are isolated to Edge Functions and never returned to the browser. A TODO remains to replace the current server-side token columns with KMS-backed envelope encryption before regulated production rollout.

## Deployment checklist

- [ ] Run all migrations in order, including seed data for staging/demo environments only if desired.
- [ ] Confirm RLS is enabled on CRM, applications, communications, activity, partner, and storage-backed tables.
- [ ] Create at least one active admin profile.
- [ ] Add `crm.bypasssolution.com` to the hosting provider project domains and create a DNS `CNAME` from `crm` to the hosting provider target.
- [ ] Configure Supabase Auth redirect URLs for `https://crm.bypasssolution.com/admin`, `https://crm.bypasssolution.com/admin/dashboard`, and the existing main-domain `/admin` URLs.
- [ ] Configure private Storage buckets and verify public reads are blocked.
- [ ] Configure email worker for queued communication records.
- [ ] Configure DNS and canonical app URL (`https://bypasssolution.com`) plus CRM app URL (`https://crm.bypasssolution.com`).
- [ ] Deploy SPA rewrite fallback to `index.html` for React Router routes.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build` before release.
- [ ] Verify `/`, `/solutions`, `/industries`, `/about`, `/faq`, `/how-it-works`, `/apply`, `/contact`, `/privacy`, `/terms`, `/disclosure`, `/admin`, `/admin/dashboard`, `/admin/leads/:id`, and `https://crm.bypasssolution.com` routes.
- [ ] Perform a test application upload with non-sensitive sample documents.
- [ ] Confirm no full SSN, full EIN, routing number, or bank account number is stored by the public flow.

## Security notes

- Full SSN and full bank account data are intentionally not collected in the client intake flow.
- Sensitive identifiers are masked to last four digits.
- Browser code uses only `VITE_` variables; service-role and integration keys remain server-only.
- CRM routes require Supabase authentication plus role-based profile authorization.
- All applicant documents should remain in private Supabase buckets.

## Scripts

```bash
npm run dev        # local development
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run build      # production build
npm run preview    # preview production build
```
