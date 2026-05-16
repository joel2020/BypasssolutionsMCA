import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export const allowedOrigins = new Set([
  'https://www.elitefundingsolution.com',
  'https://elitefundingsolution.com',
  'https://crm.elitefundingsolution.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://www.elitefundingsolution.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function badRequest(req: Request, errors: string[]) {
  return jsonResponse(req, { ok: false, errors }, 400);
}

export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase server environment is not configured.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

export function lastFour(value: unknown) {
  return onlyDigits(value).slice(-4);
}

export function text(value: unknown, max = 180) {
  return String(value || '').trim().slice(0, max);
}

export function money(value: unknown) {
  return Number(onlyDigits(value)) || 0;
}

export function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value, 240));
}

export function clientIp(req: Request) {
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  const secret = Deno.env.get('APPLICATION_FIELD_ENCRYPTION_KEY');
  if (!secret || secret.length < 24) {
    throw new Error('APPLICATION_FIELD_ENCRYPTION_KEY must be set to store sensitive application data.');
  }

  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptJson(value: unknown) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    alg: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptJson<T>(value: unknown): Promise<T | null> {
  if (!value || typeof value !== 'object') return null;
  const record = value as { iv?: string; ciphertext?: string };
  if (!record.iv || !record.ciphertext) return null;

  const key = await encryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(record.iv) },
    key,
    base64ToBytes(record.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
