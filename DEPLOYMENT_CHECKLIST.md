# Bypass Solution Deployment Checklist

## Pre-deployment

- [ ] `npm ci` completes in the deployment environment.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `.env.example` has been mirrored into secure hosting environment variables.
- [ ] No server-only secrets are prefixed with `VITE_`.

## Supabase

- [ ] Apply all SQL migrations in `supabase/migrations` in timestamp order.
- [ ] Verify `public.profiles` contains at least one active `admin` user.
- [ ] Verify RLS is enabled and policies are active.
- [ ] Verify `application-documents`, `credit-reports`, and `contracts` buckets are private.
- [ ] Test anonymous document upload and confirm anonymous read fails.
- [ ] Confirm CRM role can read application documents.

## Application flow

- [ ] Submit a non-sensitive test application.
- [ ] Confirm status starts as `Submitted`.
- [ ] Confirm document metadata rows are created.
- [ ] Confirm communications are queued for applicant confirmation and internal alert.
- [ ] Confirm activity log entry is created.
- [ ] Confirm SSN/EIN/routing/account values are last-four only.

## CRM

- [ ] Login via `/admin` with an active role.
- [ ] Verify dashboard metrics render.
- [ ] Verify leads list search/filter/export works.
- [ ] Verify pipeline stages include New Lead through Funded / Declined / Lost.
- [ ] Verify lead detail tabs include application, underwriting, documents, notes, tasks, and compliance sections.

## Public website

- [ ] Verify desktop, tablet, and mobile layouts.
- [ ] Verify CTAs route to `/apply` and `/contact`.
- [ ] Verify sitemap and robots are available.
- [ ] Verify privacy, terms, and disclosure pages are linked in footer.
- [ ] Verify OpenGraph metadata and favicon assets load.

## Manual follow-ups

- [ ] Implement Supabase Edge Function or backend worker for live email delivery.
- [ ] Add server-side rate limiting / CAPTCHA if production spam appears.
- [ ] Complete formal legal/compliance review before collecting regulated data.
