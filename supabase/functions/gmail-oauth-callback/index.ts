import { adminClient, corsHeaders, env, exchangeCode, gmailScopes } from '../_shared/gmail.ts';

async function verifyState(state: string) {
  const [encodedPayload, encodedSignature] = state.split('.');
  if (!encodedPayload || !encodedSignature) throw new Error('Google OAuth state is invalid.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('GOOGLE_CLIENT_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(atob(encodedSignature), (char) => char.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(encodedPayload));
  if (!valid) throw new Error('Google OAuth state signature is invalid.');
  const payload = JSON.parse(atob(encodedPayload));
  if (typeof payload.created_at === 'number' && Date.now() - payload.created_at > 10 * 60 * 1000) throw new Error('Google OAuth state expired. Please connect Gmail again.');
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const appUrl = Deno.env.get('APP_URL') || 'https://crm.bypasssolution.com';
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    if (oauthError) throw new Error(oauthError);
    if (!code || !state) throw new Error('Google OAuth callback is missing code or state.');
    const parsedState = await verifyState(state);
    const userId = parsedState.user_id as string | undefined;
    if (!userId) throw new Error('Google OAuth state is invalid.');

    const token = await exchangeCode(code);
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) throw new Error('Unable to read Gmail profile email.');

    // TODO: Replace isolated server-side token storage with KMS-backed envelope encryption.
    // Tokens are never returned to the browser and are only accessed by Edge Functions.
    const supabase = adminClient();
    await supabase.from('gmail_connections').upsert({
      user_id: userId,
      gmail_email: profile.email,
      access_token_encrypted: token.access_token,
      refresh_token_encrypted: token.refresh_token,
      token_expires_at: new Date(Date.now() + Number(token.expires_in ?? 3600) * 1000).toISOString(),
      scopes: typeof token.scope === 'string' ? token.scope.split(' ') : gmailScopes,
      status: 'connected',
    }, { onConflict: 'user_id' });

    return Response.redirect(`${appUrl.replace(/\/$/, '')}/admin/email?gmail=connected`, 302);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Gmail OAuth failed.');
    return Response.redirect(`${appUrl.replace(/\/$/, '')}/admin/email?gmail=error&message=${message}`, 302);
  }
});
