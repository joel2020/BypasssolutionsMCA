# Direct submission entry

Approved in the task: New Submission → business name and optional documents → Save. Contact details, requested amount, notes, and documents may be completed later. Existing lead creation remains available on Leads. New submissions create a linked lead (Documents Needed) and application (New), assigned to the current user, without implying lender delivery or recorded consent. Use the existing document upload infrastructure and allow multiple application and bank-statement files, including a combined statement PDF. Keep advanced/contact fields optional.

Create linked records atomically through a security-invoker database function respecting existing RLS. Use a stable client-generated identifier for retries. On partial upload failure keep the saved submission, retain failed/pending files for retry, and show a clear message. Prevent duplicate clicks and closing during saves.

Existing lead conversion no longer counts bank-statement files as a prerequisite. Save edits successfully first; create the application and change the lead stage in one transaction. Lock the lead and reuse an existing application on repeated conversion. Preserve permissions and existing lender submission behavior.

Validation: automated behavioral coverage for creation, retries, partial uploads, conversion failure, and database rollback/authorization; typecheck, lint, tests, and production build. Review the plan and final diff using Claude. No production database migration or deployment is included in this PR.
