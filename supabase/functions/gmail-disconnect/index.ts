import { decryptToken } from '../_shared/gmailSecurity.ts';
import { corsHeaders, env, json, requireUser } from '../_shared/gmail.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const { user, service } = await requireUser(req);
    const { data: connection } = await service.from('gmail_connections').select('*').eq('user_id', user.id).maybeSingle();
    if (!connection) return json({ disconnected: true });
    const encrypted = connection.refresh_token_encrypted || connection.access_token_encrypted;
    if (encrypted) {
      const token = await decryptToken(encrypted, env('GMAIL_TOKEN_ENCRYPTION_KEY'));
      const revoked = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
      if (!revoked.ok && revoked.status !== 400) throw new Error('Google revocation failed. Try disconnecting again.');
    }
    const { error } = await service.from('gmail_connections').update({ status: 'disconnected', access_token_encrypted: null, refresh_token_encrypted: null, token_expires_at: null }).eq('id', connection.id);
    if (error) throw error;
    return json({ disconnected: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to disconnect Gmail.' }, 400);
  }
});
