# Bypass Solution — Production MCA / Working Capital CRM

Bypass Solution is a premium fintech web application for working-capital intake and internal MCA CRM operations. The product includes a public marketing site, secure multi-step application flow, private document intake, role-protected CRM, underwriting workflow scaffolding, communications logging, partner/offers/commission schema, sample MCA operating data, and production deployment guidance.

## Stack

- Vite + React + TypeScript
- Tailwind CSS dark fintech dashboard UI
- Recharts analytics
- Supabase Auth, Postgres, RLS, and private Storage
- React Router SPA deployment

## CRM capabilities

The admin CRM at `/admin/dashboard` includes:

- Fixed dark navy sidebar with Bypass Solution branding and the tagline “Working Capital. Smarter. Faster.”
- Global search, notification bell, profile menu, filter action, and new-application action.
- KPI cards for applications, new leads, underwriting, approvals, funded deals, requested volume, funded volume, and conversion rate.
- Kanban-style MCA pipeline columns: New Lead, Documents Needed, Under Review, Pre-Approved, Offer Sent, and Funded.
- Application cards with business, owner, requested funding, monthly revenue, assigned rep, last activity, status, and progress.
- Activity feed for submissions, uploads, underwriting review, offers, follow-up tasks, notes, stage changes, and document requests.
- Recharts funding-volume trend and application-source mix.
- Underwriting snapshot, secure document checklist, and encrypted-upload indicator.
- Lead detail profile with tabs for Overview, Business Info, Owner Info, Underwriting, Documents, Offers, Communications, Tasks, Notes, and Activity Timeline.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before testing application submissions, uploads, CRM login, or database-backed pages.

## Database setup

Apply the Supabase migrations in `supabase/migrations` in timestamp order:

1. `20260507183928_create_core_schema.sql` — legacy CRM core tables.
2. `20260507191338_fix_rls_policies_and_search_path.sql` — policy/search-path hardening.
3. `20260507203000_production_admin_roles_and_secure_crm.sql` — profiles, admin roles, RLS, private buckets.
4. `20260508090000_mca_application_crm_expansion.sql` — normalized MCA application/CRM expansion, status history, communications, partner submissions, underwriting, duplicate detection, private public-intake uploads.
5. `20260508120000_bypass_solution_crm_seed_data.sql` — realistic sample data for 18 Bypass Solution MCA applications, owners, documents, tasks, notes, offers, partner submissions, underwriting snapshots, activity logs, and commissions.

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

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon key protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Edge Functions and admin jobs. Never expose in Vite. |
| `EMAIL_PROVIDER_API_KEY` | Server only | Future transactional email delivery for queued templates. |
| `INTERNAL_APPLICATION_ALERT_EMAIL` | Server only | Internal funding-team notification recipient. |
| `TWILIO_*` | Server only | Future SMS delivery for opt-in applicants. |
| `DATAMERCH_API_KEY` / `CREDIT_PROVIDER_API_KEY` | Server only | Future risk/credit integrations. |

## Admin user setup

1. Create a Supabase Auth user for the CRM operator.
2. Insert a matching row into `public.profiles`:

```sql
insert into public.profiles (id, email, full_name, role, status)
values ('AUTH_USER_UUID', 'admin@bypasssolution.com', 'Bypass Admin', 'admin', 'active');
```

Allowed roles are `admin`, `underwriter`, `sales_rep`, and `viewer`. CRM access is blocked unless the profile is active and has an authorized role.

## Storage setup

The migrations create private buckets:

- `application-documents`
- `credit-reports`
- `contracts`

Public applicants can upload only PDF/JPG/PNG documents into `application-documents`; public reads are not permitted. CRM users with active roles can read private files. Keep bucket public access disabled.

## Email setup

The application currently logs applicant confirmations, internal alerts, and future templates into `communications` / `email_templates`. To send live email, add a Supabase Edge Function or backend worker that:

1. Reads queued communications.
2. Sends via the configured provider.
3. Updates `communications.status` to `sent` or `failed`.
4. Writes an `activity_logs` entry.

## Deployment checklist

- [ ] Run all migrations in order, including seed data for staging/demo environments only if desired.
- [ ] Confirm RLS is enabled on CRM, applications, communications, activity, partner, and storage-backed tables.
- [ ] Create at least one active admin profile.
- [ ] Configure Supabase Auth redirect URLs for `/admin`.
- [ ] Configure private Storage buckets and verify public reads are blocked.
- [ ] Configure email worker for queued communication records.
- [ ] Configure DNS and canonical app URL (`https://bypasssolution.com`).
- [ ] Deploy SPA rewrite fallback to `index.html` for React Router routes.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build` before release.
- [ ] Verify `/`, `/solutions`, `/industries`, `/about`, `/faq`, `/how-it-works`, `/apply`, `/contact`, `/privacy`, `/terms`, `/disclosure`, `/admin`, `/admin/dashboard`, and `/admin/leads/:id` routes.
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
