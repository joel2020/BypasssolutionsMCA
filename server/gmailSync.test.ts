import { describe, expect, it } from 'vitest';
import { preservedGmailLeadLinks } from '../supabase/functions/_shared/gmailSync';

describe('Gmail sync client links', () => {
  it('restores a lender delivery link even after an earlier sync erased it', () => {
    const links = preservedGmailLeadLinks(
      [{ gmail_message_id: 'sent', lead_id: null }],
      [{ gmail_message_id: 'sent', lead_id: 'client' }],
      ['client'],
    );
    expect(links.get('sent')).toBe('client');
  });
  it('preserves explicitly linked regular CRM emails', () => {
    expect(preservedGmailLeadLinks([{ gmail_message_id: 'sent', lead_id: 'client' }], [], ['client']).get('sent')).toBe('client');
  });
  it('does not carry over links to clients the current rep cannot access', () => {
    expect(preservedGmailLeadLinks(
      [{ gmail_message_id: 'old', lead_id: 'other-rep-client' }],
      [{ gmail_message_id: 'sent', lead_id: 'other-rep-client' }],
      [],
    ).size).toBe(0);
  });
  it('uses the actual lender delivery client over an inferred email match', () => {
    expect(preservedGmailLeadLinks(
      [{ gmail_message_id: 'sent', lead_id: 'inferred' }],
      [{ gmail_message_id: 'sent', lead_id: 'actual' }],
      ['inferred', 'actual'],
    ).get('sent')).toBe('actual');
  });
});
