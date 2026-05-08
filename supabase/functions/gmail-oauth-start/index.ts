import { corsHeaders, env, gmailScopes, json, requireUser } from '../_shared/gmail.ts';

async function signState(payload: Record<string, unknown>) {
  const encodedPayload = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('GOOGLE_CLIENT_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${encodedPayload}.${encodedSignature}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user } = await requireUser(req);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env('GOOGLE_CLIENT_ID'));
    url.searchParams.set('redirect_uri', env('GOOGLE_REDIRECT_URI'));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', gmailScopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', await signState({ user_id: user.id, nonce: crypto.randomUUID(), app_url: env('APP_URL'), created_at: Date.now() }));
    if (new URL(req.url).searchParams.get('json') === '1') return json({ url: url.toString() });
    return Response.redirect(url.toString(), 302);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to start Gmail OAuth.' }, 400);
  }
});
