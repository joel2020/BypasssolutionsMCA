// Pure helpers shared by Edge Functions and regression tests.
const encoder = new TextEncoder();
function base64(bytes: Uint8Array) {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 32768) chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
  return btoa(chunks.join(''));
}
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
export function encodeRfc822(input: { to: string[]; cc?: string[]; subject: string; body: string; from?: string; attachments?: { name: string; mimeType: string; data: Uint8Array }[] }) {
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
    'MIME-Version: 1.0',
  ].join('\r\n');
  const body = base64(encoder.encode(input.body)).match(/.{1,76}/g)?.join('\r\n') ?? '';
  const textPart = `Content-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}`;
  let message = `${header}\r\n${textPart}`;
  if (input.attachments?.length) {
    const boundary = `bypass_${crypto.randomUUID()}`;
    const parts = [textPart];
    for (const attachment of input.attachments) {
      const characters = Array.from(attachment.name.replace(/["\\/]/g,'_')).map(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? '_' : c).slice(0,180);
      while (encoder.encode(characters.join('')).length > 120) characters.pop();
      const filename = characters.join('') || 'document';
      const fallback = filename.replace(/[^\x20-\x7e]/g,'_');
      const encodedName = encodeURIComponent(filename).replace(/['()*]/g,c => '%' + c.charCodeAt(0).toString(16));
      const mime = /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(attachment.mimeType) ? attachment.mimeType : 'application/octet-stream';
      const content = base64(attachment.data).match(/.{1,76}/g)?.join('\r\n') ?? '';
      parts.push(`Content-Type: ${mime}\r\nContent-Disposition: attachment; filename="${fallback}"; filename*=UTF-8''${encodedName}\r\nContent-Transfer-Encoding: base64\r\n\r\n${content}`);
    }
    message = `${header}\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\n${parts.join(`\r\n--${boundary}\r\n`)}\r\n--${boundary}--\r\n`;
  }
  return base64(encoder.encode(message)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeBody(value: string) {
  return new TextDecoder().decode(bytes(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')));
}
