# Supabase setup for Bypass Solution CRM

## Required project settings

Add only these browser-safe variables to Vercel/Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`
- `VITE_ADMIN_URL`

Never expose service-role keys, database passwords, OAuth client secrets, JWT signing secrets, or one-time passwords in frontend variables.

## Apply migrations

Apply every SQL file in `supabase/migrations` in timestamp order. The latest production access helper is:

```sql
select public.bootstrap_crm_profile('admin@example.com', 'Admin Name', 'admin');
```

Run that statement only after the user exists in **Authentication → Users**. Replace the email/name with the real administrator. The helper does not create an Auth user or password; it only creates/updates `public.profiles` for an existing Auth user.

The current CRM create-flow policy migration is `20260511183000_fix_crm_create_flow_rls.sql`. It keeps viewer profiles read-only while allowing active `admin`, `underwriter`, and `sales_rep` profiles to create CRM leads, create applications through full submissions, and create/update funding partners.

## First admin user

1. Open Supabase **Authentication → Users**.
2. Invite or create the first admin with Supabase's email invite/reset flow.
3. After the user accepts the invite or sets a password, run:

```sql
select public.bootstrap_crm_profile('admin@example.com', 'Admin Name', 'admin');
```

4. Confirm `public.profiles` has `role = 'admin'` and `status = 'active'` for the Auth user UUID.

Allowed CRM roles are `admin`, `underwriter`, `sales_rep`, and `viewer`.

## Team member invites

The Settings Team Members tab calls the Supabase Edge Function `invite-team-member`. Deploy it with JWT verification enabled. The function requires the built-in Supabase Edge runtime variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; do not put the service-role key in Vercel or frontend code.

Only active `admin` profiles can invite users. The function sends the Supabase Auth invite email and creates the matching `public.profiles` row with the selected CRM role.

## Auth redirect URLs

Configure Supabase Auth redirect URLs for:

- `https://crm.bypasssolution.com/admin`
- `https://crm.bypasssolution.com/admin/dashboard`
- `https://bypasssolution.com/admin`
- `https://bypasssolution.com/admin/dashboard`
- local development URLs such as `http://localhost:5173/admin`

## Storage

The app uses the private bucket `application-documents` for CRM documents. Migrations create and harden this bucket. Keep public access disabled. CRM users view files through signed URLs.

Allowed upload extensions are PDF, DOC, DOCX, PNG, JPG, and JPEG.

## Core tables used by the app

- `profiles`
- `leads`
- `applications`
- `funding_partners`
- `partner_submissions`
- `documents`
- `offers`
- `activity_logs`
- `audit_logs`
- `communications`
- `tasks`

RLS must remain enabled. Users who authenticate but do not have an active row in `profiles` will see a clear unauthorized state with a safe sign-out path.

## Verify CRM create flows

Use non-sensitive test data only:

1. In Leads, use Add Lead with Lead only and confirm the inserted row exists in `public.leads`.
2. In Applications, use New Application with Full submission and confirm matching rows exist in `public.leads` and `public.applications`.
3. In Funding Partners, create a partner and confirm it exists in `public.funding_partners`.
4. Confirm a `viewer` profile can read CRM data but cannot create or update leads, applications, or funding partners.
5. Confirm an authenticated user without an active `profiles` row lands on the unauthorized screen and can sign out.

Helpful verification query:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('leads', 'applications', 'funding_partners')
order by tablename, policyname;
```
