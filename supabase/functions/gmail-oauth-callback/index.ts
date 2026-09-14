import { encryptToken } from '../_shared/gmailSecurity.ts';
import { adminClient, corsHeaders, env, exchangeCode, gmailScopes } from '../_shared/gmail.ts';

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
    const supabase = adminClient();
    const { data: oauthState, error: stateError } = await supabase.from('gmail_oauth_states').delete().eq('nonce', state).gt('expires_at', new Date().toISOString()).select('user_id').maybeSingle();
    if (stateError || !oauthState) throw new Error('Google OAuth state expired or already used. Connect Gmail again.');
    const userId = oauthState.user_id;
    const { data: crmProfile } = await supabase.from('profiles').select('role,status').eq('id', userId).maybeSingle();
    if (crmProfile?.status !== 'active' || !['admin','underwriter','sales_rep'].includes(crmProfile.role)) throw new Error('CRM access denied.');
    const token = await exchangeCode(code);
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) throw new Error('Unable to read Gmail profile email.');

    const scopes = typeof token.scope === 'string' ? token.scope.split(' ') : [];
    if (!gmailScopes.filter(scope => scope.startsWith('https:')).every(scope => scopes.includes(scope))) throw new Error('Approve Gmail read and send access to connect.');
    if (!token.refresh_token) throw new Error('Google did not issue offline access. Remove the previous app grant and reconnect.');
    const { error: saveError } = await supabase.from('gmail_connections').upsert({
      user_id: userId,
      gmail_email: profile.email,
      access_token_encrypted: await encryptToken(token.access_token, env('GMAIL_TOKEN_ENCRYPTION_KEY')),
      refresh_token_encrypted: await encryptToken(token.refresh_token, env('GMAIL_TOKEN_ENCRYPTION_KEY')),
      token_expires_at: new Date(Date.now() + Number(token.expires_in ?? 3600) * 1000).toISOString(),
      scopes,
      status: 'connected',
    }, { onConflict: 'user_id' });

    if (saveError) throw saveError;
    return Response.redirect(`${appUrl.replace(/\/$/, '')}/admin/email?gmail=connected`, 302);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Gmail OAuth failed.');
    return Response.redirect(`${appUrl.replace(/\/$/, '')}/admin/email?gmail=error&message=${message}`, 302);
  }
});
