/** Resolve exactly the recipients shown in the lender-send preview. */
export function resolveLenderRecipients(partner: {email?: string | null; submission_email?: string | null; additional_cc_emails?: string | null}) {
  const valid = (value: string) => {
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) throw new Error('Enter valid lender email addresses.');
    return email;
  };
  const to = valid(partner.submission_email?.trim() || partner.email?.trim() || '');
  const extras = partner.additional_cc_emails?.split(/[,;\s]+/).filter(Boolean) ?? [];
  if (extras.length > 20) throw new Error('Use no more than 20 additional CC addresses.');
  const cc = [...new Set([...(partner.email?.trim() ? [partner.email] : []), ...extras].map(valid))].filter(email => email !== to);
  return {to, cc};
}
