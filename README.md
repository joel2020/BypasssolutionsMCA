# Elite Funding Solutions Production MCA CRM

Elite Funding Solutions is a public funding intake site and internal MCA CRM. It includes a marketing site, funding fit check, secure application, private document intake, role-protected CRM, underwriting workflow, partner submissions, communications logging, offers, commissions, and Supabase-backed operating data.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS, Edge Functions, and private Storage
- React Router SPA deployment

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before testing application submissions, uploads, CRM login, or database-backed pages.

## Database setup

Apply the Supabase migrations in `supabase/migrations` in timestamp order. The current production path includes the core CRM schema, role-based profiles, normalized applications, private document storage, public intake validation hardening, Edge Function enforcement, encrypted full-application storage, and populated lender packet fields.

For a demo database, run `supabase/seed.sql` after migrations. Read `docs/elite-demo-seed.md` first because the seed resets CRM operating tables and is intended for local, staging, and demo databases only.

## Required environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon key protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Edge Function service role for validated intake and CRM lender submission. |
| `APPLICATION_FIELD_ENCRYPTION_KEY` | Server only | Required. Encrypts full EIN, SSN, consent, and complete application payload before storage. |
| `EMAIL_PROVIDER_API_KEY` / `RESEND_API_KEY` | Server only | Sends lender submission emails through Resend. Without this, lender packets are stored and marked `queued_provider_not_configured`. |
| `LENDER_EMAIL_FROM` / `EMAIL_FROM` | Server only | Sender address for lender submissions and applicant/internal notifications. |
| `INTERNAL_APPLICATION_ALERT_EMAIL` | Server only | Internal funding-team notification recipient. |
| `TWILIO_*` | Server only | Future SMS delivery for opt-in applicants. |
| `DATAMERCH_API_KEY` / `CREDIT_PROVIDER_API_KEY` | Server only | Future risk and credit integrations. |

## Public intake

The public application submits through the `submit-application` Supabase Edge Function. The function validates every required field server-side, verifies uploaded document metadata and storage objects, creates the lead, company, application, owner, underwriting, document, consent, communication, and activity records, and stores the full application payload in `application_sensitive_data.encrypted_payload`.

Normal CRM tables store only last-four EIN/SSN values. Full EIN/SSN are never rendered back into the browser UI and are decrypted only server-side for authorized lender package generation.

## Lender submissions

CRM lender submissions use the `submit-to-lenders` Supabase Edge Function. The function authenticates the CRM user, reads the stored CRM application, decrypts the protected payload server-side, builds a populated lender packet, stores the exact `package_snapshot`, `email_subject`, and `email_body` on `partner_submissions`, logs a `communications` row, and sends through Resend when provider credentials are configured.

If no provider key is configured, the lender packet is still stored and the email status is marked `queued_provider_not_configured`. Email delivery is not faked.

## Security notes

Full EIN and SSN are required for the full secure application and encrypted before storage. Bank routing and account numbers are intentionally not collected in the public prequalification/application flow. Public applicants can upload only PDF, JPG, JPEG, and PNG files into the private `application-documents` bucket and cannot read private files. CRM routes require Supabase authentication plus an active `admin`, `underwriter`, `sales_rep`, or `viewer` profile depending on the operation.

## Deployment checklist

- Run all migrations in order.
- Create at least one active admin profile.
- Configure `APPLICATION_FIELD_ENCRYPTION_KEY` before accepting live applications.
- Configure `RESEND_API_KEY` or `EMAIL_PROVIDER_API_KEY` before sending live lender submissions.
- Configure private Storage buckets and verify public reads are blocked.
- Configure `https://www.elitefundingsolution.com` and `https://crm.elitefundingsolution.com`.
- Configure Supabase Auth redirect URLs for the CRM domain and `/admin` routes.
- Run `npm run typecheck`, `npm run build`, `npm run test:public`, and `npm run test:overflow` before release.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run test:public
npm run test:overflow
```
