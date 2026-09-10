import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, encodeRfc822, validateRecipients, decodeBody } from '../supabase/functions/_shared/gmailSecurity';
describe('Gmail wire format and token protection', () => {
  it('preserves the MIME separator, blank lines and Unicode body', () => {
    const raw = encodeRfc822({ to: ['rep@example.com'], subject: 'Hola José', body: 'Hello\n\nJosé 👋' });
    const decoded = Buffer.from(raw, 'base64url').toString();
    const [headers, body] = decoded.split('\r\n\r\n');
    expect(headers).toContain('Content-Transfer-Encoding: base64');
    expect(headers).toContain(Buffer.from('Hola José').toString('base64'));
    expect(Buffer.from(body, 'base64').toString()).toBe('Hello\n\nJosé 👋');
  });
  it('rejects injected recipient and subject headers', () => {
    expect(() => validateRecipients(['a@b.com\r\nBcc: victim@example.com'])).toThrow();
    expect(() => encodeRfc822({ to: ['a@b.com'], subject: 'Hi\r\nBcc: x@y.com', body: 'x' })).toThrow();
  });
  it('decodes Gmail UTF-8 payloads', () => { expect(decodeBody(Buffer.from('José 👋').toString('base64url'))).toBe('José 👋'); });
  it('encrypts with randomized IVs and refuses tampering/plaintext', async () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const encrypted = await encryptToken('secret-token', key);
    expect(encrypted).not.toContain('secret-token');
    expect(await encryptToken('secret-token', key)).not.toBe(encrypted);
    expect(await decryptToken(encrypted, key)).toBe('secret-token');
    await expect(decryptToken(encrypted, Buffer.alloc(32, 8).toString('base64'))).rejects.toThrow();
    await expect(decryptToken('plaintext', key)).rejects.toThrow();
  });
});
