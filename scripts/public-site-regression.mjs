import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const checks = [];
function check(name, condition) {
  checks.push({ name, condition });
}

const app = read('src/App.tsx');
const apply = read('src/pages/Apply.tsx');
const fit = read('src/pages/FundingFitCheck.tsx');
const contact = read('src/pages/Contact.tsx');
const home = read('src/pages/Home.tsx');
const seo = read('src/lib/seo.ts');
const sitemap = read('public/sitemap.xml');
const vercel = read('vercel.json');
const submitApplication = read('supabase/functions/submit-application/index.ts');
const submitContact = read('supabase/functions/submit-contact/index.ts');
const submitToLenders = read('supabase/functions/submit-to-lenders/index.ts');
const edgePolicyMigration = read('supabase/migrations/20260516123000_public_intake_edge_function_enforcement.sql');
const lenderPacketMigration = read('supabase/migrations/20260516130000_store_full_application_and_lender_packets.sql');
const partnerHook = read('src/hooks/usePartnerSubmissions.ts');

check('Funding fit route exists', app.includes('path="/funding-fit-check"') && app.includes('FundingFitCheck'));
check('Sitemap includes funding fit check', sitemap.includes('https://www.elitefundingsolution.com/funding-fit-check'));
check('Homepage primary CTA routes to funding fit check', home.includes('to="/funding-fit-check"') && home.includes('Check Funding Fit'));
check('Homepage secondary CTA routes to secure application', home.includes('to="/apply"') && home.includes('Apply Securely'));
check('Apply validates full EIN and SSN in-session', apply.includes('Enter the full 9-digit EIN') && apply.includes('Enter the full 9-digit SSN'));
check('Apply requires bank statement count before authorization', apply.includes('Upload at least 3 bank statements') && apply.includes('minimum: 3'));
check('Apply requires all authorization consents', ['certifyConsent', 'creditAuthorization', 'sharingAuthorization', 'esignConsent', 'privacyConsent'].every((value) => apply.includes(value)));
check('Apply does not collect routing or account number fields', !apply.includes('routingLastFour') && !apply.includes('accountLastFour'));
check('Apply submits through server-side Edge Function', apply.includes("functions.invoke('submit-application'") && submitApplication.includes('At least 3 bank statements are required.'));
check('Apply creates normalized CRM application records', submitApplication.includes("from('companies')") && submitApplication.includes("from('applications')") && submitApplication.includes("from('owners')") && submitApplication.includes("from('application_underwriting')"));
check('Full sensitive application payload is encrypted at rest', submitApplication.includes('encryptJson') && lenderPacketMigration.includes('application_sensitive_data') && lenderPacketMigration.includes('encrypted_payload jsonb not null'));
check('Lender submissions use populated server-side email packets', partnerHook.includes("invoke('submit-to-lenders'") && submitToLenders.includes('package_snapshot') && submitToLenders.includes('email_body') && submitToLenders.includes('full_ssn'));
check('Funding fit check avoids sensitive fields', !fit.includes('name="ssn"') && !fit.includes('name="ein"') && !fit.includes('type="file"') && !fit.includes('name="routing'));
check('Contact and fit check submit through server-side Edge Function', contact.includes("functions.invoke('submit-contact'") && fit.includes("functions.invoke('submit-contact'") && submitContact.includes('Message is required.'));
check('Contact form has stable DOM names', ['name="name"', 'name="email"', 'name="phone"', 'name="message"', 'name="bot_field"'].every((value) => contact.includes(value)));
check('Legal pages have unique metadata entries', ['/application-consent', '/esign-consent', '/sms-terms', '/cookie-policy', '/disclosure'].every((route) => seo.includes(`'${route}'`)));
check('CSP removes script unsafe-inline and unsafe-eval', vercel.includes('Content-Security-Policy') && !vercel.includes("script-src 'self' 'unsafe-inline'") && !vercel.includes('unsafe-eval'));
check('Public table insert bypasses are removed', edgePolicyMigration.includes('drop policy if exists "Public can submit complete website applications"') && edgePolicyMigration.includes('drop policy if exists "Anyone can submit contact form"'));

const failures = checks.filter((item) => !item.condition);

if (failures.length > 0) {
  console.error('Public site regression checks failed:');
  for (const failure of failures) console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log(`Public site regression checks passed: ${checks.length}`);
