export const CANONICAL_ORIGIN = 'https://www.elitefundingsolution.com';

export const ROUTE_META: Record<string, { title: string; description: string; keywords?: string }> = {
  '/': {
    title: 'Business Funding From $10K to $5M | Elite Funding Solutions',
    description: 'Compare working capital, revenue-based financing, lines of credit, equipment financing, SBA options, invoice factoring, and commercial real estate funding.',
    keywords: 'business funding, working capital, revenue based financing, merchant cash advance, small business funding, fast business funding',
  },
  '/funding-fit-check': {
    title: 'Check Funding Fit | Elite Funding Solutions',
    description: 'Check business funding fit without submitting SSN, EIN, bank statements, routing numbers, or account numbers.',
    keywords: 'funding fit check, business funding prequalification, merchant cash advance requirements, working capital eligibility',
  },
  '/solutions': {
    title: 'Funding Solutions | Working Capital & Revenue-Based Financing',
    description: 'Compare funding solutions including working capital, revenue-based financing, business lines of credit, equipment financing, SBA options, invoice factoring, and commercial real estate funding.',
    keywords: 'business funding solutions, revenue based financing, working capital, business line of credit, equipment financing, invoice factoring',
  },
  '/industries': {
    title: 'Industry Funding Options | Restaurants, Trucking, Construction & More',
    description: 'Business funding options for restaurants, trucking companies, construction firms, retail stores, medical practices, e-commerce brands, home services, and professional services.',
    keywords: 'restaurant business funding, trucking business funding, construction business funding, retail business funding, medical practice funding, e-commerce business funding',
  },
  '/how-it-works': {
    title: 'How Business Funding Review Works | Elite Funding Solutions',
    description: 'Learn how business owners check funding fit, submit a secure application, upload documents, compare funding options, and review terms before accepting.',
  },
  '/apply': {
    title: 'Apply Securely | Elite Funding Solutions Application',
    description: 'Submit a secure business funding application with required business details, owner authorization, and documents for advisor-led review.',
  },
  '/contact': {
    title: 'Contact Elite Funding Solutions | Speak With a Funding Advisor',
    description: 'Contact Elite Funding Solutions at +1 (813) 648-4272 or info@elitefundingsolution.com to discuss business funding options and application questions.',
  },
  '/privacy': {
    title: 'Privacy Policy | Elite Funding Solutions',
    description: 'Review how Elite Funding Solutions collects, uses, shares, protects, and retains website, contact, application, and document information.',
  },
  '/terms': {
    title: 'Terms of Use | Elite Funding Solutions',
    description: 'Review the terms governing use of the Elite Funding Solutions website, funding fit check, secure application, communications, and advisor-led review services.',
  },
  '/disclosure': {
    title: 'Funding Disclosure | Elite Funding Solutions',
    description: 'Important commercial funding disclosures: Elite Funding Solutions is not a bank or direct lender, funding is subject to approval, and terms vary by partner.',
  },
  '/application-consent': {
    title: 'Application Consent | Elite Funding Solutions',
    description: 'Review the application authorization used for commercial funding review, partner sharing, document review, and funding communications.',
  },
  '/esign-consent': {
    title: 'E-Sign Consent | Elite Funding Solutions',
    description: 'Review consent to receive, sign, and retain commercial funding application records and disclosures electronically.',
  },
  '/sms-terms': {
    title: 'SMS Terms | Elite Funding Solutions',
    description: 'Review optional SMS messaging terms, opt-out instructions, carrier charges, and funding consent disclosures.',
  },
  '/cookie-policy': {
    title: 'Cookie Policy | Elite Funding Solutions',
    description: 'Review how cookies and tracking technologies support website functionality, attribution, analytics, and funding inquiry follow-up.',
  },
};

export function canonicalUrl(pathname: string) {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return `${CANONICAL_ORIGIN}${cleanPath}`;
}
