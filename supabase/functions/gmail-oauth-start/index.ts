import { corsHeaders, env, gmailScopes, json, requireUser } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, service } = await requireUser(req);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env('GOOGLE_CLIENT_ID'));
    url.searchParams.set('redirect_uri', env('GOOGLE_REDIRECT_URI'));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', gmailScopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    env('GMAIL_TOKEN_ENCRYPTION_KEY');
    const nonce = crypto.randomUUID();
    await service.from('gmail_oauth_states').delete().lt('expires_at', new Date().toISOString());
    const { error } = await service.from('gmail_oauth_states').insert({ nonce, user_id: user.id, expires_at: new Date(Date.now() + 600_000).toISOString() });
    if (error) throw error;
    url.searchParams.set('state', nonce);
    if (new URL(req.url).searchParams.get('json') === '1') return json({ url: url.toString() });
    return Response.redirect(url.toString(), 302);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to start Gmail OAuth.' }, 400);
  }
});
