# CRM Google sign-in — September 10, 2026

The CRM login screen now offers **Sign in with Google** above email/password sign-in. It opens Google's account chooser, requests only standard identity information, and returns to `/admin`. Existing password login and recovery remain available. Provider failures and cancelled/denied callbacks produce visible login errors, including an invitation-only explanation when public signup is denied.

Authentication uses Supabase `signInWithOAuth`; it does not reuse Gmail mailbox tokens. The existing active-profile/role gate and database policies continue to control CRM access. No profile or role is created from Google user metadata. Supabase public signup is disabled, so administrators must invite/create users before they can enter the CRM.

## Configuration

- Google project: `refined-analogy-508220-d6`, under the authorized project-owner account.
- Dedicated web OAuth client: **Bypass CRM Sign In**.
- Client ID: `623414474922-r82imacv1acjvtvk28fdmifnc7huu9ec.apps.googleusercontent.com`.
- JavaScript origin: `https://crm.bypasssolution.com`.
- Redirect callbacks: `https://hiweeafewcralneqfosy.supabase.co/auth/v1/callback` and the isolated preview's `https://onsmjqylbpzfjquchmme.supabase.co/auth/v1/callback`.
- Standard identity scopes: openid, email, profile. Existing Gmail read/send consent remains a separate flow on the Email page.
- Google provider enabled on production and preview; `enable_signup=false`, `skip_nonce_check=false`, and email remains required. Existing redirect URLs, SMTP, MFA and other settings were preserved using a reviewed, narrowly scoped config push.
- The client secret is stored only in hosted Supabase Auth configuration. Temporary downloaded credentials and local secret configuration were deleted after setup.

This follows [Supabase's Google sign-in setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and its [automatic identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Live verification and release

- The production login screen displays the Google button without requiring email/password fields first.
- Google sign-in as `joelcarias23@gmail.com` reached the production dashboard using existing user `1464757a-6d42-421f-a8df-ac76d07f0917`; its admin role and active status were preserved.
- The existing user now has both email and Google identities, with no duplicate CRM profile. Its Gmail mailbox remains connected.
- A second test used the user's signed-in `joelcariasrecruiter@gmail.com`, which has no CRM invitation. Supabase rejected signup, the CRM showed its invitation-only message, and both Auth-user and CRM-profile counts for that address remained zero.
- **134 tests across 20 files passed**, including Google initiation without password fields and provider-failure recovery; full typechecks, lint, production build, GitHub verification, Supabase preview and Vercel checks passed. Claude review was attempted but its OAuth session had expired, so no independent Claude approval is claimed.
- Source `33d8d6c` is live at `https://crm.bypasssolution.com` as deployment `dpl_5rX9Hp76ytHab21nKDE2RQctpnJ9` (`https://bypasssolutions-b0620kmzd-joel-carias-projects.vercel.app`).

The Google project remains in Testing. The verified login requested only basic identity scopes; mailbox read/send still follows the separate Gmail Testing-mode requirements. Brand-new rep invitation acceptance was not part of this login test. The existing PR remains unmerged pending reconciliation of older Supabase migration history.
