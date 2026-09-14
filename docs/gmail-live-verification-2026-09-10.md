# Gmail production verification — September 10, 2026

Tested the live CRM in Chrome with the user's signed-in `joelcarias23@gmail.com` account. The user completed the separate CRM password login and authorized Gmail connection and self-addressed test emails.

## Verified live

- CRM login reached Joel Carias's production admin dashboard.
- Connect Gmail completed Google account selection, the Testing-mode notice, consent for Gmail read/send, and the production OAuth callback. The CRM displayed the connected mailbox.
- The regular CRM composer sent **Bypass CRM Gmail live test — 2026-09-10** to the same mailbox. Gmail showed the message in Inbox.
- Manual sync processed 100 Inbox/Sent entries and stored 98 distinct messages on its first run. The production sync log reported success.
- A synthetic client/application and self-addressed test lender were created with zero funding/revenue amounts. A harmless one-page PDF uploaded through the CRM's normal private-storage flow.
- Submit to Lender sent **Bypass CRM lender attachment test — 2026-09-10**, with that PDF, to Joel's mailbox. Gmail displayed the received attachment and opened its complete one-page contents, including reference `BYPASS-ATTACHMENT-20260910`.
- Gmail message ID `1a08d808d12c2129` had a confirmed delivery receipt, one lender submission, one client email activity record, and attachment metadata. The CRM showed **Emailed via Gmail · 1 attachment(s)**.
- Moving only the connection's stored expiry timestamp into the past exercised the real Google refresh-token exchange. The next sync renewed the access-token expiry to more than 50 minutes in the future.

## Bug found and fixed during the live test

Sync originally recomputed a message's client only from email addresses. A lender send has the rep and lender as participants, so sync erased its original client link. This was reproduced against the synthetic package: `gmail_messages.lead_id` became null after sync, while the delivery receipt and submission remained correct.

Sync now loads existing message links and confirmed delivery links in batches, restricted to the current mailbox owner. It validates all candidate clients through the caller's RLS-scoped client, preserves valid links, and gives confirmed lender deliveries precedence over inferred matches. This also repairs previously erased lender-message links on the next sync.

The corrected `gmail-sync` function was deployed to production and preview. A production resync restored the package's client link while preserving exactly one submission and one client activity entry.

Validation: **132 tests across 20 files passed**, plus frontend/server typechecks, lint, production build, and Deno checking of the changed Edge Function. Four new regressions cover lender-link recovery, ordinary CRM email links, inaccessible clients, and confirmed-delivery precedence. Claude review was attempted but could not authenticate because its OAuth session had expired; no independent Claude approval is claimed.

After verification, the temporary client, application, lender, document and related test submission records were removed, including the sample PDF in CRM storage. The two self-addressed Gmail messages and the connected mailbox were retained. The synthetic fixture evidence and source PDF are saved locally under `/tmp/bypass-crm-live-test/`; no credentials were included in that evidence. Removing the synthetic client deliberately clears its link from the retained test message after the preservation check above.

## Limits

Google still runs the OAuth app in **Testing**; Joel's mailbox is an enrolled test user. Additional rep mailboxes need enrollment or production publishing and applicable Google verification. This run verified the admin's Gmail workflow, not invitation acceptance and Gmail onboarding for a brand-new sales rep. No real client document or email to a real lender was used. SMS and actual signNow signature completion remain outside this Gmail verification.
