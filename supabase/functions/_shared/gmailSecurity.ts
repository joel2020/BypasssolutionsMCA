// Pure helpers shared by Edge Functions and regression tests.
const encoder = new TextEncoder();
function base64(bytes: Uint8Array) { return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')); }
function bytes(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function key(secret: string) {
  const raw = bytes(secret);
  if (raw.length !== 32) throw new Error('Gmail encryption key must contain 32 bytes.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptToken(token: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), encoder.encode(token));
  return `v1.${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}
export async function decryptToken(value: string, secret: string) {
  const [version, iv, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('Reconnect Gmail to restore secure access.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, await key(secret), bytes(ciphertext)));
}
export function validateRecipients(input: unknown): string[] {
  const values = Array.isArray(input) ? input : String(input ?? '').split(',').map(v => v.trim()).filter(Boolean);
  if (values.some(v => typeof v !== 'string' || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v))) throw new Error('Enter valid email addresses separated by commas.');
  if (values.length > 50) throw new Error('Limit each message to 50 recipients.');
  return values;
}
export function encodeRfc822(input: { to: string[]; cc?: string[]; subject: string; body: string; from?: string }) {
  validateRecipients(input.to); validateRecipients(input.cc ?? []);
  if (/[\r\n]/.test(input.subject)) throw new Error('Subject must be a single line.');
  if (input.from) validateRecipients([input.from]);
  const words: string[] = [];
  let word = '';
  for (const character of input.subject) {
    if (encoder.encode(word + character).length > 42) { words.push(word); word = ''; }
    word += character;
  }
  words.push(word);
  const subject = words.map(value => `=?UTF-8?B?${base64(encoder.encode(value))}?=`).join('\r\n ');
  const header = [
    ...(input.from ? [`From: ${input.from}`] : []),
    `To: ${input.to.join(', ')}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.join(', ')}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64',
  ].join('\r\n');
  const body = base64(encoder.encode(input.body)).match(/.{1,76}/g)?.join('\r\n') ?? '';
  return base64(encoder.encode(`${header}\r\n\r\n${body}`)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeBody(value: string) {
  return new TextDecoder().decode(bytes(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')));
}
