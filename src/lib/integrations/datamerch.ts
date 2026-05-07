/**
 * Backend-only placeholder for DataMerch checks.
 * TODO: Implement inside a Supabase Edge Function or trusted server API only.
 * Never import this module into user-facing UI that would expose API credentials.
 */
export async function runDataMerchCheck(): Promise<never> {
  throw new Error('DataMerch integration is not configured. Run real checks only from Supabase Edge Functions or server-side API after consent is recorded.');
}
