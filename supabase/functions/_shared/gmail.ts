import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const gmailScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Gmail integration is not configured. Missing ${name}.`);
  return value;
}

export function userClient(req: Request) {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
}

export function adminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
}

export async function requireUser(req: Request) {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Authentication required. Sign in to the CRM before using Gmail.');
  return { supabase, user: data.user };
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: env('GOOGLE_CLIENT_ID'),
    client_secret: env('GOOGLE_CLIENT_SECRET'),
    redirect_uri: env('GOOGLE_REDIRECT_URI'),
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Unable to exchange Google OAuth code.');
  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    client_secret: env('GOOGLE_CLIENT_SECRET'),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Unable to refresh Gmail token.');
  return data;
}

type GmailConnection = { id: string; access_token_encrypted?: string | null; refresh_token_encrypted?: string | null; token_expires_at?: string | null };
type GmailHeader = { name?: string; value?: string };
type GmailPayload = { mimeType?: string; body?: { data?: string }; parts?: GmailPayload[] };
type GmailCommunicationMessage = { lead_id?: string | null; direction?: 'inbound' | 'outbound'; subject?: string | null; body_text?: string | null; to_emails?: string[]; from_email?: string | null; user_id?: string | null; gmail_message_id?: string | null; gmail_thread_id?: string | null; sent_at?: string | null; raw_payload?: Record<string, unknown> | null };

export async function ensureAccessToken(supabase: ReturnType<typeof createClient>, connection: GmailConnection) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token_encrypted && expiresAt > Date.now() + 60_000) return connection.access_token_encrypted;
  if (!connection.refresh_token_encrypted) throw new Error('Gmail refresh token is missing. Reconnect Gmail.');
  const refreshed = await refreshAccessToken(connection.refresh_token_encrypted);
  const tokenExpiresAt = new Date(Date.now() + Number(refreshed.expires_in ?? 3600) * 1000).toISOString();
  await supabase.from('gmail_connections').update({
    access_token_encrypted: refreshed.access_token,
    token_expires_at: tokenExpiresAt,
    status: 'connected',
  }).eq('id', connection.id);
  return refreshed.access_token as string;
}

export async function gmailFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Gmail API request failed.');
  return data;
}

export function headerValue(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => String(h.name).toLowerCase() === name.toLowerCase())?.value ?? '';
}

export function parseEmails(value: string) {
  return [...value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((m) => m[0].toLowerCase());
}

function decodeBase64Url(value = '') {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  } catch { return ''; }
}

export function extractBodyText(payload: GmailPayload | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload.parts ?? []) {
    const text = extractBodyText(part);
    if (text) return text;
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data).replace(/<[^>]+>/g, ' ');
  return '';
}

export async function findLeadId(supabase: ReturnType<typeof createClient>, emails: string[]) {
  const clean = [...new Set(emails.map((e) => e.toLowerCase()).filter(Boolean))];
  if (clean.length === 0) return null;
  const { data } = await supabase.from('leads').select('id,email').in('email', clean).limit(1);
  return data?.[0]?.id ?? null;
}

export async function upsertCommunication(supabase: ReturnType<typeof createClient>, message: GmailCommunicationMessage) {
  await supabase.from('communications').upsert({
    lead_id: message.lead_id,
    direction: message.direction,
    channel: 'Email',
    subject: message.subject,
    body: message.body_text,
    recipient: (message.to_emails ?? []).join(', '),
    sender: message.from_email,
    status: message.direction === 'outbound' ? 'sent' : 'received',
    sent_by: message.direction === 'outbound' ? message.user_id : null,
    created_by: message.user_id,
    gmail_message_id: message.gmail_message_id,
    gmail_thread_id: message.gmail_thread_id,
    provider: 'gmail',
    provider_payload: message.raw_payload ?? {},
    created_at: message.sent_at ?? new Date().toISOString(),
  }, { onConflict: 'gmail_message_id' });
}

export function encodeRfc822(input: { to: string[]; cc?: string[]; subject: string; body: string; from?: string }) {
  const lines = [
    `To: ${input.to.join(', ')}`,
    input.cc?.length ? `Cc: ${input.cc.join(', ')}` : '',
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
  ].filter((line) => line !== '');
  return btoa(unescape(encodeURIComponent(lines.join('\r\n')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
