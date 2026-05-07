export type LeadStatus =
  | 'New Lead' | 'Contacted' | 'Application Started' | 'Docs Requested'
  | 'Docs Received' | 'Underwriting' | 'Offers Available' | 'Contract Sent'
  | 'Funded' | 'Renewal Eligible' | 'Declined' | 'Lost';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  industry: string;
  requestedAmount: number;
  monthlyRevenue: number;
  status: LeadStatus;
  assignedRep: string;
  lastContact: string;
  source: string;
  score: number;
  state: string;
  timeInBusiness: string;
  createdAt: string;
  useOfFunds: string;
  existingAdvances: boolean;
  urgency: string;
}

export interface Task {
  id: string;
  title: string;
  leadId: string;
  leadName: string;
  assignedRep: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed';
  type: string;
}

export interface Offer {
  id: string;
  leadId: string;
  leadName: string;
  funderName: string;
  fundingAmount: number;
  paybackAmount: number;
  factorRate: number;
  estimatedPayment: number;
  term: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  commission: number;
  commissionPct: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired' | 'Contract Sent';
  createdAt: string;
}

export interface Funder {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  minRevenue: number;
  minTimeInBusiness: string;
  industriesAccepted: string[];
  states: string;
  maxFunding: number;
  notes: string;
  status: 'Active' | 'Inactive';
}

export interface Commission {
  id: string;
  leadName: string;
  businessName: string;
  funder: string;
  rep: string;
  fundedAmount: number;
  commissionPct: number;
  commissionAmount: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  fundedDate: string;
}

export const mockLeads: Lead[] = [
  {
    id: 'L001', firstName: 'Marcus', lastName: 'Johnson', businessName: 'Johnson Trucking LLC',
    phone: '(555) 234-5678', email: 'marcus@johnsontruck.com', industry: 'Trucking & Transportation',
    requestedAmount: 75000, monthlyRevenue: 95000, status: 'Docs Received', assignedRep: 'Sarah K.',
    lastContact: '2024-01-05', source: 'Website', score: 82, state: 'Texas',
    timeInBusiness: '3–5 years', createdAt: '2024-01-01', useOfFunds: 'Fleet Maintenance',
    existingAdvances: false, urgency: 'Within 1 week',
  },
  {
    id: 'L002', firstName: 'Elena', lastName: 'Ramirez', businessName: 'Casa Elena Restaurant',
    phone: '(555) 345-6789', email: 'elena@casaelena.com', industry: 'Restaurants & Food Service',
    requestedAmount: 45000, monthlyRevenue: 72000, status: 'Offers Available', assignedRep: 'Mike T.',
    lastContact: '2024-01-06', source: 'Referral', score: 91, state: 'Florida',
    timeInBusiness: '5+ years', createdAt: '2024-01-02', useOfFunds: 'Kitchen Equipment',
    existingAdvances: true, urgency: 'ASAP',
  },
  {
    id: 'L003', firstName: 'Derek', lastName: 'Chen', businessName: 'Chen Construction Co.',
    phone: '(555) 456-7890', email: 'derek@chenconstruction.com', industry: 'Construction & Contractors',
    requestedAmount: 150000, monthlyRevenue: 185000, status: 'Underwriting', assignedRep: 'Sarah K.',
    lastContact: '2024-01-04', source: 'Google Ads', score: 78, state: 'California',
    timeInBusiness: '5+ years', createdAt: '2023-12-28', useOfFunds: 'Project Startup',
    existingAdvances: false, urgency: 'Within 2 weeks',
  },
  {
    id: 'L004', firstName: 'Priya', lastName: 'Patel', businessName: 'Patel Family Pharmacy',
    phone: '(555) 567-8901', email: 'priya@patelpharma.com', industry: 'Medical & Healthcare',
    requestedAmount: 100000, monthlyRevenue: 130000, status: 'Contract Sent', assignedRep: 'Tom R.',
    lastContact: '2024-01-06', source: 'Website', score: 88, state: 'New York',
    timeInBusiness: '5+ years', createdAt: '2023-12-20', useOfFunds: 'Equipment Purchase',
    existingAdvances: false, urgency: 'This month',
  },
  {
    id: 'L005', firstName: 'James', lastName: 'Williams', businessName: 'Williams Auto & Repair',
    phone: '(555) 678-9012', email: 'james@williamsauto.com', industry: 'Auto Repair',
    requestedAmount: 35000, monthlyRevenue: 48000, status: 'Funded', assignedRep: 'Mike T.',
    lastContact: '2024-01-03', source: 'Facebook', score: 85, state: 'Georgia',
    timeInBusiness: '2–5 years', createdAt: '2023-12-15', useOfFunds: 'Equipment',
    existingAdvances: false, urgency: 'ASAP',
  },
  {
    id: 'L006', firstName: 'Sophia', lastName: 'Martinez', businessName: 'Bloom Wellness Studio',
    phone: '(555) 789-0123', email: 'sophia@bloomwellness.com', industry: 'Beauty & Wellness',
    requestedAmount: 25000, monthlyRevenue: 38000, status: 'Application Started', assignedRep: 'Tom R.',
    lastContact: '2024-01-05', source: 'Instagram', score: 74, state: 'Arizona',
    timeInBusiness: '1–2 years', createdAt: '2024-01-04', useOfFunds: 'Renovation',
    existingAdvances: false, urgency: 'This month',
  },
  {
    id: 'L007', firstName: 'Anthony', lastName: 'Brown', businessName: 'Brown\'s Wholesale Distributors',
    phone: '(555) 890-1234', email: 'anthony@brownwholesale.com', industry: 'Retail & Wholesale',
    requestedAmount: 200000, monthlyRevenue: 310000, status: 'Docs Requested', assignedRep: 'Sarah K.',
    lastContact: '2024-01-06', source: 'Google Ads', score: 79, state: 'Illinois',
    timeInBusiness: '5+ years', createdAt: '2024-01-03', useOfFunds: 'Inventory',
    existingAdvances: true, urgency: 'Within 1 week',
  },
  {
    id: 'L008', firstName: 'Linda', lastName: 'Thompson', businessName: 'Thompson E-Commerce Solutions',
    phone: '(555) 901-2345', email: 'linda@thompsoneco.com', industry: 'E-commerce',
    requestedAmount: 60000, monthlyRevenue: 82000, status: 'New Lead', assignedRep: 'Unassigned',
    lastContact: 'Never', source: 'Website', score: 66, state: 'Washington',
    timeInBusiness: '1–2 years', createdAt: '2024-01-06', useOfFunds: 'Marketing',
    existingAdvances: false, urgency: 'This week',
  },
  {
    id: 'L009', firstName: 'Robert', lastName: 'Davis', businessName: 'Davis Concrete & Masonry',
    phone: '(555) 012-3456', email: 'robert@davisconcrete.com', industry: 'Construction & Contractors',
    requestedAmount: 80000, monthlyRevenue: 115000, status: 'Contacted', assignedRep: 'Mike T.',
    lastContact: '2024-01-06', source: 'Referral', score: 71, state: 'Ohio',
    timeInBusiness: '3–5 years', createdAt: '2024-01-05', useOfFunds: 'Equipment',
    existingAdvances: false, urgency: 'Within 2 weeks',
  },
  {
    id: 'L010', firstName: 'Grace', lastName: 'Kim', businessName: 'Seoul Garden Restaurant',
    phone: '(555) 123-4567', email: 'grace@seoulgardennyc.com', industry: 'Restaurants & Food Service',
    requestedAmount: 55000, monthlyRevenue: 78000, status: 'Declined', assignedRep: 'Tom R.',
    lastContact: '2023-12-30', source: 'Website', score: 52, state: 'New York',
    timeInBusiness: '6–12 months', createdAt: '2023-12-20', useOfFunds: 'Working Capital',
    existingAdvances: true, urgency: 'ASAP',
  },
];

export const mockTasks: Task[] = [
  { id: 'T001', title: 'Follow up on missing bank statements', leadId: 'L001', leadName: 'Marcus Johnson — Johnson Trucking', assignedRep: 'Sarah K.', dueDate: '2024-01-08', priority: 'High', status: 'Open', type: 'Request Documents' },
  { id: 'T002', title: 'Send offer package to Elena Ramirez', leadId: 'L002', leadName: 'Elena Ramirez — Casa Elena Restaurant', assignedRep: 'Mike T.', dueDate: '2024-01-07', priority: 'High', status: 'In Progress', type: 'Send Offer' },
  { id: 'T003', title: 'Follow up on contract signature', leadId: 'L004', leadName: 'Priya Patel — Patel Family Pharmacy', assignedRep: 'Tom R.', dueDate: '2024-01-07', priority: 'High', status: 'Open', type: 'Contract Reminder' },
  { id: 'T004', title: 'Initial outreach call', leadId: 'L008', leadName: 'Linda Thompson — Thompson E-Commerce', assignedRep: 'Unassigned', dueDate: '2024-01-08', priority: 'Medium', status: 'Open', type: 'Call Client' },
  { id: 'T005', title: 'Request voided check and ID', leadId: 'L007', leadName: 'Anthony Brown — Brown\'s Wholesale', assignedRep: 'Sarah K.', dueDate: '2024-01-08', priority: 'Medium', status: 'Open', type: 'Request Documents' },
  { id: 'T006', title: 'Call back — requested end of week', leadId: 'L009', leadName: 'Robert Davis — Davis Concrete', assignedRep: 'Mike T.', dueDate: '2024-01-10', priority: 'Low', status: 'Open', type: 'Follow Up' },
  { id: 'T007', title: 'Schedule renewal discussion', leadId: 'L005', leadName: 'James Williams — Williams Auto', assignedRep: 'Mike T.', dueDate: '2024-03-01', priority: 'Low', status: 'Open', type: 'Renewal Check' },
];

export const mockOffers: Offer[] = [
  {
    id: 'O001', leadId: 'L002', leadName: 'Elena Ramirez — Casa Elena Restaurant',
    funderName: 'CapitalBridge Funding', fundingAmount: 45000, paybackAmount: 60750,
    factorRate: 1.35, estimatedPayment: 675, term: '12 months', frequency: 'Daily',
    commission: 2700, commissionPct: 6, status: 'Sent', createdAt: '2024-01-05',
  },
  {
    id: 'O002', leadId: 'L002', leadName: 'Elena Ramirez — Casa Elena Restaurant',
    funderName: 'Rapid Capital Group', fundingAmount: 40000, paybackAmount: 52000,
    factorRate: 1.30, estimatedPayment: 538, term: '10 months', frequency: 'Daily',
    commission: 2400, commissionPct: 6, status: 'Sent', createdAt: '2024-01-05',
  },
  {
    id: 'O003', leadId: 'L004', leadName: 'Priya Patel — Patel Family Pharmacy',
    funderName: 'MedFund Capital', fundingAmount: 100000, paybackAmount: 132000,
    factorRate: 1.32, estimatedPayment: 3300, term: '8 months', frequency: 'Weekly',
    commission: 7000, commissionPct: 7, status: 'Contract Sent', createdAt: '2024-01-03',
  },
  {
    id: 'O004', leadId: 'L005', leadName: 'James Williams — Williams Auto',
    funderName: 'FastTrack Business Capital', fundingAmount: 35000, paybackAmount: 46550,
    factorRate: 1.33, estimatedPayment: 445, term: '14 weeks', frequency: 'Daily',
    commission: 2100, commissionPct: 6, status: 'Accepted', createdAt: '2023-12-28',
  },
];

export const mockFunders: Funder[] = [
  {
    id: 'F001', name: 'CapitalBridge Funding', contact: 'Alex Morgan', email: 'submissions@capitalbridge.com',
    phone: '(800) 445-6789', minRevenue: 15000, minTimeInBusiness: '6 months',
    industriesAccepted: ['Restaurants', 'Retail', 'Auto Repair', 'Beauty & Wellness'],
    states: 'All 50 states', maxFunding: 500000, status: 'Active',
    notes: 'Fast approval, good factor rates for restaurants. 24-hour turnaround.',
  },
  {
    id: 'F002', name: 'Rapid Capital Group', contact: 'Jordan Lee', email: 'iso@rapidcapital.com',
    phone: '(800) 556-7890', minRevenue: 12000, minTimeInBusiness: '3 months',
    industriesAccepted: ['All Industries'],
    states: 'All 50 states', maxFunding: 300000, status: 'Active',
    notes: 'Flexible on time in business. Good option for newer businesses with strong revenue.',
  },
  {
    id: 'F003', name: 'MedFund Capital', contact: 'Casey Park', email: 'deals@medfundcapital.com',
    phone: '(800) 667-8901', minRevenue: 25000, minTimeInBusiness: '12 months',
    industriesAccepted: ['Medical & Healthcare', 'Dental', 'Veterinary', 'Optometry'],
    states: 'All 50 states', maxFunding: 1000000, status: 'Active',
    notes: 'Specializes in healthcare. Requires clean bank statements for 6 months.',
  },
  {
    id: 'F004', name: 'FastTrack Business Capital', contact: 'Dana Rivers', email: 'submit@fasttrackbiz.com',
    phone: '(800) 778-9012', minRevenue: 10000, minTimeInBusiness: '3 months',
    industriesAccepted: ['Auto Repair', 'Trucking', 'Construction', 'Manufacturing'],
    states: 'Most states (excludes VT, ND)', maxFunding: 250000, status: 'Active',
    notes: 'Strong for trucking and auto. Fast decisions, 1 day funding after contract.',
  },
  {
    id: 'F005', name: 'NorthStar Working Capital', contact: 'Taylor Kim', email: 'iso@northstarwc.com',
    phone: '(800) 889-0123', minRevenue: 20000, minTimeInBusiness: '12 months',
    industriesAccepted: ['Retail', 'E-commerce', 'Professional Services', 'Wholesale'],
    states: 'All 50 states', maxFunding: 750000, status: 'Active',
    notes: 'Best for larger deals. Good for e-commerce with 6 months strong history.',
  },
];

export const mockCommissions: Commission[] = [
  {
    id: 'C001', leadName: 'James Williams', businessName: 'Williams Auto & Repair',
    funder: 'FastTrack Business Capital', rep: 'Mike T.',
    fundedAmount: 35000, commissionPct: 6, commissionAmount: 2100,
    status: 'Paid', fundedDate: '2024-01-03',
  },
  {
    id: 'C002', leadName: 'Priya Patel', businessName: 'Patel Family Pharmacy',
    funder: 'MedFund Capital', rep: 'Tom R.',
    fundedAmount: 100000, commissionPct: 7, commissionAmount: 7000,
    status: 'Pending', fundedDate: '2024-01-06',
  },
  {
    id: 'C003', leadName: 'Robert Nguyen', businessName: 'Nguyen Noodle House',
    funder: 'CapitalBridge Funding', rep: 'Sarah K.',
    fundedAmount: 28000, commissionPct: 6, commissionAmount: 1680,
    status: 'Paid', fundedDate: '2023-12-22',
  },
  {
    id: 'C004', leadName: 'Carmen Rodriguez', businessName: 'Rodriguez Tile & Flooring',
    funder: 'Rapid Capital Group', rep: 'Mike T.',
    fundedAmount: 55000, commissionPct: 5.5, commissionAmount: 3025,
    status: 'Unpaid', fundedDate: '2023-12-28',
  },
  {
    id: 'C005', leadName: 'Tyler Brooks', businessName: 'Brooks Digital Marketing',
    funder: 'NorthStar Working Capital', rep: 'Sarah K.',
    fundedAmount: 80000, commissionPct: 6, commissionAmount: 4800,
    status: 'Paid', fundedDate: '2023-12-15',
  },
];

export const pipelineStatuses: LeadStatus[] = [
  'New Lead', 'Contacted', 'Application Started', 'Docs Requested',
  'Docs Received', 'Underwriting', 'Offers Available', 'Contract Sent',
  'Funded', 'Renewal Eligible', 'Declined', 'Lost',
];

export const statusColors: Record<LeadStatus, string> = {
  'New Lead': 'bg-slate-100 text-slate-600',
  'Contacted': 'bg-blue-50 text-blue-700',
  'Application Started': 'bg-cyan-50 text-cyan-700',
  'Docs Requested': 'bg-amber-50 text-amber-700',
  'Docs Received': 'bg-yellow-50 text-yellow-700',
  'Underwriting': 'bg-orange-50 text-orange-700',
  'Offers Available': 'bg-emerald-50 text-emerald-700',
  'Contract Sent': 'bg-teal-50 text-teal-700',
  'Funded': 'bg-green-50 text-green-700',
  'Renewal Eligible': 'bg-purple-50 text-purple-700',
  'Declined': 'bg-red-50 text-red-700',
  'Lost': 'bg-slate-100 text-slate-500',
};
