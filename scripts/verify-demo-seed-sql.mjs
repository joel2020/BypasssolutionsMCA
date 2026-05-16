import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const seedPath = resolve('supabase/seed.sql');
const sql = readFileSync(seedPath, 'utf8');

const expectedSnippets = [
  "'leads', 150",
  "'deals', 100",
  "'approved_deals', 40",
  "'approved_not_accepted', 25",
  "'funded_deals', 35",
  "'renewal_opportunities', 20",
  "'renewal_review_tasks', 20",
  "'earnings_records', 50",
  "'funding_partners', 15",
  "'demo_users', 10",
  "renewal_opportunity_created",
  "Elite Funding Solutions demo seed data",
];

const missing = expectedSnippets.filter((snippet) => !sql.includes(snippet));

if (missing.length > 0) {
  console.error(`Seed SQL is missing expected demo assertions:\n${missing.join('\n')}`);
  process.exit(1);
}

const requiredTables = [
  'public.leads',
  'public.applications',
  'public.application_underwriting',
  'public.activity_logs',
  'public.notes',
  'public.commissions',
  'public.funding_partners',
  'public.funders',
  'public.profiles',
];

const missingTables = requiredTables.filter((table) => !sql.includes(table));

if (missingTables.length > 0) {
  console.error(`Seed SQL does not reference required tables:\n${missingTables.join('\n')}`);
  process.exit(1);
}

console.log('Elite Funding Solutions demo seed SQL contains expected count checks and CRM table coverage.');
