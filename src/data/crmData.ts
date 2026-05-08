import {
  ArrowRight, Banknote, Bell, Building2, CheckCircle2, CircleDollarSign, ClipboardCheck,
  Clock3, FileCheck2, FileText, MessageSquareText, ShieldCheck, TrendingUp, UploadCloud,
} from 'lucide-react';

export type PipelineStage = 'New Lead' | 'Documents Needed' | 'Under Review' | 'Pre-Approved' | 'Offer Sent' | 'Funded';
export type DocumentStatus = 'complete' | 'pending' | 'requested';

export interface CrmApplication {
  id: string;
  businessName: string;
  dba: string;
  ownerName: string;
  ownerTitle: string;
  email: string;
  phone: string;
  requestedFunding: number;
  monthlyRevenue: number;
  annualRevenue: number;
  averageDailyBalance: number;
  monthlyDeposits: number;
  nsfs: number;
  currentMcaBalances: number;
  industry: string;
  entityType: string;
  businessStartDate: string;
  status: PipelineStage;
  assignedRep: string;
  source: string;
  dateSubmitted: string;
  lastActivity: string;
  factorRate: number;
  paybackAmount: number;
  fundingPartner: string;
  offerStatus: string;
  progress: number;
  notes: string[];
}

export const pipelineStages: PipelineStage[] = ['New Lead', 'Documents Needed', 'Under Review', 'Pre-Approved', 'Offer Sent', 'Funded'];

export const crmApplications: CrmApplication[] = [
  { id: 'app-001', businessName: 'Bright Bistro LLC', dba: 'Bright Bistro', ownerName: 'Sarah Johnson', ownerTitle: 'Managing Member', email: 'sarah@brightbistro.com', phone: '(212) 555-0178', requestedFunding: 75000, monthlyRevenue: 120000, annualRevenue: 1440000, averageDailyBalance: 18750, monthlyDeposits: 562300, nsfs: 3, currentMcaBalances: 245000, industry: 'Restaurant', entityType: 'LLC', businessStartDate: '2018-04-12', status: 'New Lead', assignedRep: 'AT', source: 'Direct / Organic', dateSubmitted: '2026-05-08', lastActivity: '2h ago', factorRate: 1.27, paybackAmount: 95250, fundingPartner: 'OnDeck', offerStatus: 'Active', progress: 42, notes: ['Owner requested same-week review.', 'Missing March bank statement.'] },
  { id: 'app-002', businessName: 'Urban Road Logistics', dba: 'Urban Road', ownerName: 'Mark Spencer', ownerTitle: 'President', email: 'mark@urbanroadlogistics.com', phone: '(718) 555-0144', requestedFunding: 250000, monthlyRevenue: 410000, annualRevenue: 4920000, averageDailyBalance: 42500, monthlyDeposits: 905000, nsfs: 1, currentMcaBalances: 320000, industry: 'Transportation', entityType: 'Corporation', businessStartDate: '2016-09-02', status: 'Documents Needed', assignedRep: 'DP', source: 'Referral', dateSubmitted: '2026-05-07', lastActivity: '3h ago', factorRate: 1.31, paybackAmount: 327500, fundingPartner: 'Forward Financing', offerStatus: 'Documents requested', progress: 36, notes: ['Requested voided check and four months statements.'] },
  { id: 'app-003', businessName: 'Elite Auto Group', dba: 'Elite Auto', ownerName: 'David Wilson', ownerTitle: 'Owner', email: 'david@eliteautogroup.com', phone: '(201) 555-0199', requestedFunding: 300000, monthlyRevenue: 500000, annualRevenue: 6000000, averageDailyBalance: 58700, monthlyDeposits: 1140000, nsfs: 0, currentMcaBalances: 125000, industry: 'Auto Sales', entityType: 'LLC', businessStartDate: '2013-03-19', status: 'Under Review', assignedRep: 'AT', source: 'Partner', dateSubmitted: '2026-05-07', lastActivity: '1h ago', factorRate: 1.24, paybackAmount: 372000, fundingPartner: 'Kapitus', offerStatus: 'Underwriter review', progress: 61, notes: ['Strong deposits, verify floor plan debt.'] },
  { id: 'app-004', businessName: 'NorthStar Restaurant', dba: 'NorthStar', ownerName: 'Olivia Bennett', ownerTitle: 'CEO', email: 'olivia@northstarrestaurant.com', phone: '(646) 555-0125', requestedFunding: 200000, monthlyRevenue: 320000, annualRevenue: 3840000, averageDailyBalance: 31750, monthlyDeposits: 790000, nsfs: 2, currentMcaBalances: 175000, industry: 'Restaurant', entityType: 'S-Corp', businessStartDate: '2017-11-06', status: 'Pre-Approved', assignedRep: 'AT', source: 'Direct / Organic', dateSubmitted: '2026-05-06', lastActivity: '2h ago', factorRate: 1.28, paybackAmount: 256000, fundingPartner: 'Rapid Finance', offerStatus: 'Pre-approved', progress: 72, notes: ['Pre-approval pending landlord verification.'] },
  { id: 'app-005', businessName: 'NextGen Marketing', dba: 'NextGen', ownerName: 'Justin Hall', ownerTitle: 'Founder', email: 'justin@nextgenmarketing.com', phone: '(917) 555-0162', requestedFunding: 125000, monthlyRevenue: 210000, annualRevenue: 2520000, averageDailyBalance: 22500, monthlyDeposits: 540000, nsfs: 1, currentMcaBalances: 80000, industry: 'Marketing', entityType: 'LLC', businessStartDate: '2019-06-21', status: 'Offer Sent', assignedRep: 'AT', source: 'Direct / Organic', dateSubmitted: '2026-05-05', lastActivity: '3h ago', factorRate: 1.25, paybackAmount: 156250, fundingPartner: 'Credibly', offerStatus: 'Sent', progress: 84, notes: ['Offer email opened twice.'] },
  { id: 'app-006', businessName: 'Summit Industrial', dba: 'Summit Industrial', ownerName: 'Jason Price', ownerTitle: 'Managing Partner', email: 'jason@summitindustrial.com', phone: '(973) 555-0110', requestedFunding: 350000, monthlyRevenue: 690000, annualRevenue: 8280000, averageDailyBalance: 73500, monthlyDeposits: 1480000, nsfs: 0, currentMcaBalances: 0, industry: 'Manufacturing', entityType: 'Corporation', businessStartDate: '2011-01-14', status: 'Funded', assignedRep: 'AT', source: 'Partner', dateSubmitted: '2026-05-03', lastActivity: 'Funded on May 7, 2026', factorRate: 1.22, paybackAmount: 427000, fundingPartner: 'OnDeck', offerStatus: 'Funded', progress: 100, notes: ['Commission scheduled for next payroll.'] },
  { id: 'app-007', businessName: 'Coastal Plumbing Inc.', dba: 'Coastal Plumbing', ownerName: 'James Carter', ownerTitle: 'President', email: 'james@coastalplumbing.com', phone: '(732) 555-0140', requestedFunding: 150000, monthlyRevenue: 250000, annualRevenue: 3000000, averageDailyBalance: 28750, monthlyDeposits: 610000, nsfs: 0, currentMcaBalances: 95000, industry: 'Contractor', entityType: 'Corporation', businessStartDate: '2015-05-30', status: 'New Lead', assignedRep: 'DP', source: 'Referral', dateSubmitted: '2026-05-08', lastActivity: '6h ago', factorRate: 1.29, paybackAmount: 193500, fundingPartner: 'Fora Financial', offerStatus: 'Queued', progress: 28, notes: ['Prefers morning calls.'] },
  { id: 'app-008', businessName: 'Sunshine Daycare', dba: 'Sunshine Daycare', ownerName: 'Melissa Green', ownerTitle: 'Owner', email: 'melissa@sunshinedaycare.com', phone: '(516) 555-0137', requestedFunding: 80000, monthlyRevenue: 130000, annualRevenue: 1560000, averageDailyBalance: 16400, monthlyDeposits: 330000, nsfs: 2, currentMcaBalances: 45000, industry: 'Childcare', entityType: 'LLC', businessStartDate: '2020-02-10', status: 'Documents Needed', assignedRep: 'KW', source: 'Direct / Organic', dateSubmitted: '2026-05-08', lastActivity: '6h ago', factorRate: 1.34, paybackAmount: 107200, fundingPartner: 'Everest Business Funding', offerStatus: 'Documents requested', progress: 31, notes: ['Needs processing statements.'] },
  { id: 'app-009', businessName: 'GreenLeaf Landscaping', dba: 'GreenLeaf', ownerName: 'Chris Martin', ownerTitle: 'Owner', email: 'chris@greenleaflandscaping.com', phone: '(908) 555-0170', requestedFunding: 120000, monthlyRevenue: 180000, annualRevenue: 2160000, averageDailyBalance: 19800, monthlyDeposits: 430000, nsfs: 1, currentMcaBalances: 55000, industry: 'Landscaping', entityType: 'LLC', businessStartDate: '2018-08-08', status: 'Under Review', assignedRep: 'KW', source: 'Referral', dateSubmitted: '2026-05-06', lastActivity: '5h ago', factorRate: 1.3, paybackAmount: 156000, fundingPartner: 'National Funding', offerStatus: 'Under review', progress: 58, notes: ['Seasonal revenue; normalize trailing six months.'] },
  { id: 'app-010', businessName: 'FastLane Towing', dba: 'FastLane', ownerName: 'Brian Turner', ownerTitle: 'Owner', email: 'brian@fastlanetowing.com', phone: '(347) 555-0188', requestedFunding: 95000, monthlyRevenue: 150000, annualRevenue: 1800000, averageDailyBalance: 14250, monthlyDeposits: 365000, nsfs: 4, currentMcaBalances: 70000, industry: 'Automotive Services', entityType: 'LLC', businessStartDate: '2019-10-01', status: 'Pre-Approved', assignedRep: 'KW', source: 'Partner', dateSubmitted: '2026-05-05', lastActivity: '6h ago', factorRate: 1.36, paybackAmount: 129200, fundingPartner: 'Rapid Finance', offerStatus: 'Pre-approved', progress: 68, notes: ['Condition approval on NSF explanation.'] },
  { id: 'app-011', businessName: 'Blue Wave Cleaning', dba: 'Blue Wave', ownerName: 'Amber Scott', ownerTitle: 'Founder', email: 'amber@bluewavecleaning.com', phone: '(914) 555-0120', requestedFunding: 85000, monthlyRevenue: 140000, annualRevenue: 1680000, averageDailyBalance: 15800, monthlyDeposits: 315000, nsfs: 0, currentMcaBalances: 38000, industry: 'Facilities Services', entityType: 'LLC', businessStartDate: '2021-03-18', status: 'Offer Sent', assignedRep: 'KW', source: 'Direct / Organic', dateSubmitted: '2026-05-04', lastActivity: '1d ago', factorRate: 1.32, paybackAmount: 112200, fundingPartner: 'Credibly', offerStatus: 'Sent', progress: 80, notes: ['Owner reviewing weekly remittance option.'] },
  { id: 'app-012', businessName: 'Golden Gate Retail', dba: 'Golden Gate', ownerName: 'Lisa Tran', ownerTitle: 'Owner', email: 'lisa@goldengateretail.com', phone: '(415) 555-0148', requestedFunding: 150000, monthlyRevenue: 260000, annualRevenue: 3120000, averageDailyBalance: 30000, monthlyDeposits: 680000, nsfs: 1, currentMcaBalances: 0, industry: 'Retail', entityType: 'S-Corp', businessStartDate: '2014-07-24', status: 'Funded', assignedRep: 'KW', source: 'Referral', dateSubmitted: '2026-05-02', lastActivity: 'Funded on May 6, 2026', factorRate: 1.23, paybackAmount: 184500, fundingPartner: 'Fora Financial', offerStatus: 'Funded', progress: 100, notes: ['Renewal date set for September.'] },
  { id: 'app-013', businessName: 'Peak Performance Gym', dba: 'Peak Performance', ownerName: 'Rachel Adams', ownerTitle: 'Owner', email: 'rachel@peakperformancegym.com', phone: '(203) 555-0192', requestedFunding: 60000, monthlyRevenue: 95000, annualRevenue: 1140000, averageDailyBalance: 9700, monthlyDeposits: 220000, nsfs: 2, currentMcaBalances: 25000, industry: 'Fitness', entityType: 'LLC', businessStartDate: '2020-01-01', status: 'New Lead', assignedRep: 'AT', source: 'Direct / Organic', dateSubmitted: '2026-05-08', lastActivity: '1d ago', factorRate: 1.39, paybackAmount: 83400, fundingPartner: 'National Funding', offerStatus: 'Queued', progress: 24, notes: ['Looking for equipment purchase funding.'] },
  { id: 'app-014', businessName: 'All Pro Construction', dba: 'All Pro', ownerName: 'Tom Reynolds', ownerTitle: 'President', email: 'tom@allproconstruction.com', phone: '(609) 555-0155', requestedFunding: 200000, monthlyRevenue: 350000, annualRevenue: 4200000, averageDailyBalance: 40200, monthlyDeposits: 820000, nsfs: 0, currentMcaBalances: 160000, industry: 'Construction', entityType: 'Corporation', businessStartDate: '2012-04-04', status: 'Documents Needed', assignedRep: 'AT', source: 'Partner', dateSubmitted: '2026-05-07', lastActivity: '1d ago', factorRate: 1.28, paybackAmount: 256000, fundingPartner: 'Kapitus', offerStatus: 'Documents requested', progress: 38, notes: ['Document requested: processing statements.'] },
  { id: 'app-015', businessName: 'Premium Staffing Co.', dba: 'Premium Staffing', ownerName: 'Angela Lee', ownerTitle: 'CEO', email: 'angela@premiumstaffing.com', phone: '(212) 555-0117', requestedFunding: 175000, monthlyRevenue: 290000, annualRevenue: 3480000, averageDailyBalance: 33500, monthlyDeposits: 740000, nsfs: 0, currentMcaBalances: 115000, industry: 'Staffing', entityType: 'LLC', businessStartDate: '2016-12-01', status: 'Under Review', assignedRep: 'DP', source: 'Referral', dateSubmitted: '2026-05-06', lastActivity: '1d ago', factorRate: 1.26, paybackAmount: 220500, fundingPartner: 'OnDeck', offerStatus: 'Under review', progress: 63, notes: ['Payroll lender payoff letter requested.'] },
  { id: 'app-016', businessName: 'Pro HVAC Services', dba: 'Pro HVAC', ownerName: 'Kevin White', ownerTitle: 'Owner', email: 'kevin@prohvacservices.com', phone: '(856) 555-0168', requestedFunding: 110000, monthlyRevenue: 190000, annualRevenue: 2280000, averageDailyBalance: 21500, monthlyDeposits: 485000, nsfs: 1, currentMcaBalances: 62000, industry: 'HVAC', entityType: 'LLC', businessStartDate: '2017-09-09', status: 'Pre-Approved', assignedRep: 'DP', source: 'Direct / Organic', dateSubmitted: '2026-05-05', lastActivity: '23h ago', factorRate: 1.29, paybackAmount: 141900, fundingPartner: 'Forward Financing', offerStatus: 'Pre-approved', progress: 70, notes: ['Eligible for split funding option.'] },
  { id: 'app-017', businessName: 'Velocity Transport', dba: 'Velocity', ownerName: 'Steven Moore', ownerTitle: 'Owner', email: 'steven@velocitytransport.com', phone: '(718) 555-0190', requestedFunding: 275000, monthlyRevenue: 460000, annualRevenue: 5520000, averageDailyBalance: 50100, monthlyDeposits: 1100000, nsfs: 2, currentMcaBalances: 210000, industry: 'Transportation', entityType: 'LLC', businessStartDate: '2014-02-27', status: 'Offer Sent', assignedRep: 'DP', source: 'Partner', dateSubmitted: '2026-05-04', lastActivity: '1d ago', factorRate: 1.27, paybackAmount: 349250, fundingPartner: 'Rapid Finance', offerStatus: 'Sent', progress: 82, notes: ['Offer includes payoff of two positions.'] },
  { id: 'app-018', businessName: 'Arrow Security Solutions', dba: 'Arrow Security', ownerName: 'Robert Craig', ownerTitle: 'Founder', email: 'robert@arrowsecurity.com', phone: '(646) 555-0181', requestedFunding: 100000, monthlyRevenue: 170000, annualRevenue: 2040000, averageDailyBalance: 17600, monthlyDeposits: 410000, nsfs: 0, currentMcaBalances: 0, industry: 'Security', entityType: 'LLC', businessStartDate: '2018-10-15', status: 'Funded', assignedRep: 'DP', source: 'Direct / Organic', dateSubmitted: '2026-05-01', lastActivity: 'Funded on May 4, 2026', factorRate: 1.25, paybackAmount: 125000, fundingPartner: 'Credibly', offerStatus: 'Funded', progress: 100, notes: ['Post-funding check-in scheduled.'] },
];

export const kpis = [
  { label: 'Total Applications', value: '1,248', trend: '12.5%', icon: Building2 },
  { label: 'New Leads', value: '256', trend: '8.1%', icon: CircleDollarSign },
  { label: 'Pending Underwriting', value: '312', trend: '15.3%', icon: ClipboardCheck },
  { label: 'Approved Deals', value: '186', trend: '11.2%', icon: TrendingUp },
  { label: 'Funded Deals', value: '143', trend: '10.4%', icon: Banknote },
  { label: 'Total Requested Funding', value: '$34.62M', trend: '18.6%', icon: ArrowRight },
  { label: 'Total Funded Volume', value: '$12.75M', trend: '14.3%', icon: CheckCircle2 },
  { label: 'Conversion Rate', value: '22.8%', trend: '5.7%', icon: TrendingUp },
];

export const fundingTrend = [
  { day: 'Apr 23', requested: 0.8, funded: 0.35 }, { day: 'Apr 25', requested: 1.5, funded: 0.65 },
  { day: 'Apr 27', requested: 2.8, funded: 1.2 }, { day: 'Apr 30', requested: 1.1, funded: 0.75 },
  { day: 'May 3', requested: 2.3, funded: 1.1 }, { day: 'May 7', requested: 3.8, funded: 1.9 },
  { day: 'May 10', requested: 2.2, funded: 1.4 }, { day: 'May 14', requested: 4.9, funded: 2.6 },
  { day: 'May 17', requested: 2.5, funded: 1.8 }, { day: 'May 21', requested: 3.7, funded: 2.3 },
];

export const sourceMix = [
  { name: 'Direct / Organic', value: 42, color: '#2f6bff' },
  { name: 'Referral', value: 28, color: '#60a5fa' },
  { name: 'Partner', value: 20, color: '#93c5fd' },
  { name: 'Other', value: 10, color: '#a8a29e' },
];

export const activities = [
  { icon: Bell, description: 'Application submitted', business: 'Bright Bistro LLC', user: 'Sarah Johnson', timestamp: '2h ago' },
  { icon: UploadCloud, description: 'Bank statements uploaded', business: 'Bright Bistro LLC', user: 'Sarah Johnson', timestamp: '3h ago' },
  { icon: ClipboardCheck, description: 'Underwriter review started', business: 'Bright Bistro LLC', user: 'Daniel P.', timestamp: '4h ago' },
  { icon: FileCheck2, description: 'Offer sent to applicant', business: 'Bright Bistro LLC', user: 'Daniel P.', timestamp: '6h ago' },
  { icon: Clock3, description: 'Follow-up task due', business: 'Bright Bistro LLC', user: 'Call Sarah Johnson', timestamp: 'Due in 2h', urgent: true },
  { icon: MessageSquareText, description: 'Notes added', business: 'Urban Road Logistics', user: 'Kevin W.', timestamp: '1d ago' },
  { icon: ArrowRight, description: 'Application moved to Under Review', business: 'Urban Road Logistics', user: 'System', timestamp: '1d ago' },
  { icon: FileText, description: 'Document requested', business: 'All Pro Construction', user: 'Admin', timestamp: '1d ago' },
];

export const documentChecklist = [
  { label: 'Bank Statements', status: 'complete' as DocumentStatus, count: '3 of 6' },
  { label: 'Government ID', status: 'complete' as DocumentStatus, count: '1 of 1' },
  { label: 'Voided Check', status: 'complete' as DocumentStatus, count: '1 of 1' },
  { label: 'Processing Statements', status: 'complete' as DocumentStatus, count: '1 of 1' },
  { label: 'MCA Statements', status: 'requested' as DocumentStatus, count: '0 of 1' },
];

export const securityControls = [
  'Auth-protected admin routes', 'Role-based CRM access', 'Private document storage', 'Validated API payloads',
  'File type allowlist', 'Activity logs and audit trail', 'Masked SSN/EIN/banking fields', 'No client-side secrets',
];

export const detailTabs = ['Overview', 'Business Info', 'Owner Info', 'Underwriting', 'Documents', 'Offers', 'Communications', 'Tasks', 'Notes', 'Activity Timeline'];

export const emptyStateIcon = ShieldCheck;
