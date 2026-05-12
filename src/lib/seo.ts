export const CANONICAL_ORIGIN = 'https://www.bypasssolution.com';

export const ROUTE_META: Record<string, { title: string; description: string; keywords?: string }> = {
  '/': {
    title: 'Bypass Solution | Business Funding Built Around Cash Flow',
    description: 'Explore working capital, revenue-based funding, and business funding options through Bypass Solution’s streamlined review process.',
    keywords: 'business funding, working capital, revenue based funding, flexible capital solutions, small business funding, fast business funding',
  },
  '/solutions': {
    title: 'Funding Solutions | Working Capital & Revenue-Based Funding',
    description: 'Compare funding solutions including working capital, revenue-based funding, business funding, equipment and expansion capital, and short-term business funding.',
    keywords: 'business funding solutions, revenue based funding, working capital, business line of credit, equipment funding, short term business funding',
  },
  '/industries': {
    title: 'Industry Funding Options | Restaurants, Trucking, Construction & More',
    description: 'Business funding options for restaurants, trucking companies, construction firms, retail stores, medical practices, e-commerce brands, home services, and professional services.',
    keywords: 'restaurant business funding, trucking business funding, construction business funding, retail business funding, medical practice funding, e-commerce business funding',
  },
  '/how-it-works': {
    title: 'How Business Funding Review Works | Bypass Solution',
    description: 'Learn how Bypass Solution helps business owners submit information, review funding options, compare offers, and receive funds if approved by a funding partner.',
  },
  '/apply': {
    title: 'Start Funding Review | Bypass Solution Application',
    description: 'Start a secure business funding review with Bypass Solution. Funding is subject to review and approval; not all applicants qualify and terms vary.',
  },
  '/contact': {
    title: 'Contact Bypass Solution | Speak With a Funding Specialist',
    description: 'Contact Bypass Solution at +1 (813) 324-6359, fax +1 (813) 324-6360, or info@bypasssolution.com to discuss business funding options and application questions.',
  },
  '/privacy': {
    title: 'Privacy Policy | Bypass Solution',
    description: 'Review how Bypass Solution collects, uses, shares, protects, and retains information submitted through its website and funding review forms.',
  },
  '/terms': {
    title: 'Terms of Use | Bypass Solution',
    description: 'Review the terms governing use of the Bypass Solution website, application forms, communications, and funding review services.',
  },
  '/disclosure': {
    title: 'Funding Disclosure | Bypass Solution',
    description: 'Important funding disclosures: Bypass Solution is not a lender, funding is subject to approval, not all applicants qualify, and terms vary.',
  },
};

export function canonicalUrl(pathname: string) {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return `${CANONICAL_ORIGIN}${cleanPath}`;
}
