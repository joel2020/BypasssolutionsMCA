/**
 * Backend-only placeholder for credit pull requests and reports.
 * TODO: Implement inside a Supabase Edge Function or trusted server API only.
 * Never expose credit provider API keys or credit reports in Vite client code.
 */
export async function requestCreditPull(): Promise<never> {
  throw new Error('Credit provider integration is not configured. Credit pulls require recorded consent and must run only from Supabase Edge Functions or server-side API.');
}
