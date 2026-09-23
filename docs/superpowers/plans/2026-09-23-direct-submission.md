# Direct Submission Implementation Plan

**Goal:** Save a submission directly from business name and optional uploads.
**Architecture:** A dedicated NewSubmissionModal uses existing document uploads and a security-invoker RPC for atomic lead/application creation. A second RPC makes existing-lead conversion atomic and repeatable.
**Tech Stack:** React, TypeScript, Supabase/PostgreSQL, Vitest.

## Constraints
Preserve RLS and lender delivery behavior. Never imply consent or submission to a lender. Retain successful uploads on retries. Keep the existing Add Lead flow on Leads.

- [x] Add a migration with authenticated-only, security-invoker functions for creating a draft and converting a lead. Test rollback, idempotency, and access boundaries.
- [x] Add NewSubmissionModal and a small creation/upload coordinator with behavioral tests. Replace Add Lead on the Submissions page. Validate files before record creation; retain pending uploads after failure; default ownership to the current rep.
- [x] Change ManageLeadModal to stop after failed detail saves and use atomic conversion without file-count gating.
- [ ] Run repository verification, inspect the UI, have Claude review the diff and security-sensitive changes, resolve actionable findings, and open a PR with deployment instructions.

## Validation results

- Full repository verification passes: TypeScript, ESLint, 52 tests, and production build.
- PostgreSQL tests use PGlite with the repository table definitions and RLS helpers/policies. They exercise minimal drafts, retries, rollback in both directions, existing document linkage, owner display fallback, and authenticated/anonymous access restrictions.
- Headless Chrome with mocked API responses verifies desktop/mobile rendering, name-only creation, partial-upload retry, failed-save retry with a stable ID, and no runtime errors. This is not a live Supabase integration test.
- Claude plan review was attempted but could not authenticate (expired OAuth session). Independent Claude review remains pending; manual diff/security review completed.

## Rollout

Apply `supabase/migrations/20260923120000_direct_crm_submissions.sql` before deploying the frontend. The migration keeps public website intake rules and existing lender submission behavior. Do not mark a saved draft as sent to a lender. Production migration/deployment is not performed by this branch.
