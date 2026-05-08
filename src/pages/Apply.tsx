import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, FileText, LockKeyhole, Shield, Upload, User, WalletCards } from 'lucide-react';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../lib/supabase';

const APPLICATION_DRAFT_KEY = 'bypass-funding-application-draft-v2';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
const CONSENT_TEXT = 'By submitting this application, you authorize Bypass Solution and its funding partners to review the information provided, contact you regarding funding options, and request additional documentation as needed. Submission does not guarantee approval or funding.';

const steps = [
  { label: 'Business', icon: Building2 },
  { label: 'Funding', icon: WalletCards },
  { label: 'Owner', icon: User },
  { label: 'Documents', icon: FileText },
  { label: 'Review', icon: Shield },
];

const industries = ['Restaurants', 'Retail', 'Construction', 'Healthcare', 'Transportation', 'Automotive', 'Professional Services', 'E-commerce', 'Beauty and Wellness', 'Home Services', 'Manufacturing', 'Other'];
const entityTypes = ['LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietorship', 'Nonprofit', 'Other'];
const useOfFunds = ['Cash flow gaps', 'Payroll', 'Inventory', 'Equipment', 'Expansion', 'Marketing', 'Emergency business expenses', 'Seasonal working capital', 'Debt consolidation', 'Other'];
const yesNo = ['Yes', 'No'];
const documentRequirements = [
  { key: 'bankStatements', label: '3 to 6 months business bank statements', type: 'bank_statement', required: true, multiple: true },
  { key: 'governmentId', label: 'Government-issued ID', type: 'government_id', required: true, multiple: false },
  { key: 'voidedCheck', label: 'Voided check', type: 'voided_check', required: true, multiple: false },
  { key: 'merchantStatements', label: 'Merchant statements, if applicable', type: 'merchant_statement', required: false, multiple: true },
  { key: 'existingStatements', label: 'Existing MCA / loan statements, if applicable', type: 'existing_advance_statement', required: false, multiple: true },
] as const;

type DocumentKey = (typeof documentRequirements)[number]['key'];
type FileState = Record<DocumentKey, File[]>;

interface FormData {
  legalName: string;
  dba: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  website: string;
  ein: string;
  startDate: string;
  entityType: string;
  industry: string;
  requestedAmount: string;
  useOfFunds: string;
  monthlyRevenue: string;
  annualRevenue: string;
  averageDailyBalance: string;
  currentAdvances: string;
  currentBank: string;
  nsfsLast90Days: string;
  negativeDays: string;
  currentMcaBalances: string;
  currentDailyPayments: string;
  currentWeeklyPayments: string;
  grossMonthlyRevenue: string;
  netMonthlyDeposits: string;
  numberOfDeposits: string;
  endingBalances: string;
  ownerName: string;
  ownerTitle: string;
  ownershipPercentage: string;
  dateOfBirth: string;
  ssn: string;
  ownerPhone: string;
  ownerEmail: string;
  homeAddress: string;
  acceptsCards: string;
  paymentProcessor: string;
  monthlyCardVolume: string;
  depositsPerMonth: string;
  routingLastFour: string;
  accountLastFour: string;
  smsOptIn: boolean;
  consent: boolean;
  honeypot: string;
}

const defaultFiles: FileState = {
  bankStatements: [],
  governmentId: [],
  voidedCheck: [],
  merchantStatements: [],
  existingStatements: [],
};

const defaultForm: FormData = {
  legalName: '', dba: '', businessAddress: '', businessPhone: '', businessEmail: '', website: '', ein: '', startDate: '', entityType: '', industry: '',
  requestedAmount: '', useOfFunds: '', monthlyRevenue: '', annualRevenue: '', averageDailyBalance: '', currentAdvances: '', currentBank: '', nsfsLast90Days: '', negativeDays: '', currentMcaBalances: '', currentDailyPayments: '', currentWeeklyPayments: '', grossMonthlyRevenue: '', netMonthlyDeposits: '', numberOfDeposits: '', endingBalances: '',
  ownerName: '', ownerTitle: '', ownershipPercentage: '', dateOfBirth: '', ssn: '', ownerPhone: '', ownerEmail: '', homeAddress: '',
  acceptsCards: '', paymentProcessor: '', monthlyCardVolume: '', depositsPerMonth: '', routingLastFour: '', accountLastFour: '',
  smsOptIn: false, consent: false, honeypot: '',
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function lastFour(value: string) {
  return onlyDigits(value).slice(-4);
}

function parseMoney(value: string) {
  return Number(onlyDigits(value)) || 0;
}

function formatMoneyInput(value: string) {
  const amount = onlyDigits(value);
  return amount ? Number(amount).toLocaleString() : '';
}

function splitOwnerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-field ${props.className || ''}`} />;
}

function Select({ value, onChange, options, placeholder = 'Select an option' }: { value: string; onChange: (value: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select className="select-field" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function SectionHeader({ icon: Icon, title, eyebrow }: { icon: typeof Building2; title: string; eyebrow: string }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className="w-11 h-11 rounded-xl bg-navy-900 flex items-center justify-center shadow-lg shadow-navy-900/10"><Icon size={19} className="text-accent-300" /></div>
      <div>
        <p className="section-label mb-1">{eyebrow}</p>
        <h2 className="text-[24px] font-bold tracking-[-0.02em] text-navy-900">{title}</h2>
      </div>
    </div>
  );
}

async function uploadDocument(leadId: string, docType: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 96);
  const path = `${leadId}/${docType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('application-documents').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  await supabase.from('documents').insert({
    lead_id: leadId,
    file_name: safeName,
    doc_type: docType,
    document_type: docType,
    storage_path: path,
    file_path: path,
    file_size: file.size,
    mime_type: file.type,
    status: 'Pending',
  });
}

export default function Apply() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [files, setFiles] = useState<FileState>(defaultFiles);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(APPLICATION_DRAFT_KEY);
    if (saved) setForm((prev) => ({ ...prev, ...JSON.parse(saved), ssn: '', ein: '', routingLastFour: '', accountLastFour: '' }));
  }, []);

  useEffect(() => {
    const safeDraft = { ...form, ssn: '', ein: '', routingLastFour: '', accountLastFour: '' };
    localStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(safeDraft));
  }, [form]);

  const set = (key: keyof FormData) => (value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectedFileCount = useMemo(() => Object.values(files).reduce((total, group) => total + group.length, 0), [files]);

  function validateStep(step = currentStep) {
    const nextErrors: string[] = [];
    const requiredByStep: Record<number, Array<[string, string | boolean]>> = {
      0: [['Legal business name', form.legalName], ['Business address', form.businessAddress], ['Business phone', form.businessPhone], ['Business email', form.businessEmail], ['Business start date', form.startDate], ['Entity type', form.entityType], ['Industry', form.industry]],
      1: [['Requested funding amount', form.requestedAmount], ['Use of funds', form.useOfFunds], ['Average monthly revenue', form.monthlyRevenue], ['Annual revenue', form.annualRevenue], ['Average daily bank balance', form.averageDailyBalance], ['Current outstanding advances', form.currentAdvances], ['Current bank', form.currentBank], ['NSFs in last 90 days', form.nsfsLast90Days]],
      2: [['Owner name', form.ownerName], ['Owner title', form.ownerTitle], ['Ownership percentage', form.ownershipPercentage], ['Date of birth', form.dateOfBirth], ['Owner phone', form.ownerPhone], ['Owner email', form.ownerEmail], ['Home address', form.homeAddress]],
      3: [],
      4: [['Consent authorization', form.consent]],
    };

    requiredByStep[step].forEach(([label, value]) => {
      if (value === '' || value === false) nextErrors.push(`${label} is required.`);
    });

    if (step === 0 && form.ein && lastFour(form.ein).length !== 4) nextErrors.push('Enter the EIN last four digits only.');
    if (step === 1 && Number(form.nsfsLast90Days) < 0) nextErrors.push('NSFs cannot be negative.');
    if (step === 2 && form.ssn && lastFour(form.ssn).length !== 4) nextErrors.push('Enter the SSN last four digits only.');
    if (step === 2 && Number(form.ownershipPercentage) <= 0) nextErrors.push('Ownership percentage must be greater than 0.');
    if (step === 3) {
      documentRequirements.filter((doc) => doc.required).forEach((doc) => {
        if (files[doc.key].length === 0) nextErrors.push(`${doc.label} is required.`);
      });
    }
    if (step === 4 && form.honeypot) nextErrors.push('Application could not be submitted.');

    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function chooseFiles(key: DocumentKey, fileList: FileList | null, multiple: boolean) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const rejected = incoming.filter((file) => file.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(file.type));
    if (rejected.length) {
      setErrors([`Files must be PDF, JPG, or PNG and 15MB or smaller. Rejected: ${rejected.map((file) => file.name).join(', ')}`]);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: multiple ? incoming : incoming.slice(0, 1) }));
    setErrors([]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (![0, 1, 2, 3, 4].every((step) => validateStep(step))) return;

    setSubmitting(true);
    try {
      assertSupabaseConfigured();
      const { firstName, lastName } = splitOwnerName(form.ownerName);
      const { data, error } = await supabase.from('leads').insert({
        business_name: form.legalName.trim(),
        legal_name: form.legalName.trim(),
        dba: form.dba.trim(),
        business_address: form.businessAddress.trim(),
        business_phone: form.businessPhone.trim(),
        business_email: form.businessEmail.trim(),
        website: form.website.trim(),
        ein_last_four: lastFour(form.ein),
        start_date: form.startDate,
        entity_type: form.entityType,
        industry: form.industry,
        state: '',
        time_in_business: '',
        monthly_revenue: parseMoney(form.monthlyRevenue),
        gross_monthly_revenue: parseMoney(form.grossMonthlyRevenue || form.monthlyRevenue),
        net_monthly_deposits: parseMoney(form.netMonthlyDeposits),
        annual_revenue: parseMoney(form.annualRevenue),
        funding_amount_requested: parseMoney(form.requestedAmount),
        requested_amount: parseMoney(form.requestedAmount),
        first_name: firstName,
        last_name: lastName,
        owner_full_name: form.ownerName.trim(),
        owner_title: form.ownerTitle.trim(),
        owner_dob: form.dateOfBirth,
        ssn_last_four: lastFour(form.ssn),
        owner_home_address: form.homeAddress.trim(),
        email: form.ownerEmail.trim(),
        phone: form.ownerPhone.trim(),
        ownership_pct: form.ownershipPercentage,
        use_of_funds: form.useOfFunds,
        existing_advances: form.currentAdvances === 'Yes',
        current_advances: form.currentAdvances,
        current_bank: form.currentBank.trim(),
        nsfs_last_90_days: Number(form.nsfsLast90Days) || 0,
        negative_days: Number(form.negativeDays) || 0,
        current_mca_balances: parseMoney(form.currentMcaBalances),
        current_daily_payments: parseMoney(form.currentDailyPayments),
        current_weekly_payments: parseMoney(form.currentWeeklyPayments),
        monthly_deposits: parseMoney(form.netMonthlyDeposits || form.monthlyRevenue),
        avg_daily_balance: parseMoney(form.averageDailyBalance),
        number_of_deposits: Number(form.numberOfDeposits || form.depositsPerMonth) || 0,
        ending_balances: form.endingBalances,
        accepts_credit_cards: form.acceptsCards === 'Yes',
        payment_processor: form.paymentProcessor.trim(),
        monthly_card_volume: parseMoney(form.monthlyCardVolume),
        deposits_per_month: Number(form.depositsPerMonth) || 0,
        routing_last_four: lastFour(form.routingLastFour),
        account_last_four: lastFour(form.accountLastFour),
        sms_opt_in: form.smsOptIn,
        status: 'Application Started',
        source: 'Website',
        consent: true,
        consent_text: CONSENT_TEXT,
        submitted_at: new Date().toISOString(),
      }).select('id').single();

      if (error) throw error;
      const leadId = data.id as string;

      for (const requirement of documentRequirements) {
        for (const file of files[requirement.key]) {
          await uploadDocument(leadId, requirement.type, file);
        }
      }

      await supabase.from('communications').insert([
        { lead_id: leadId, application_id: leadId, channel: 'Email', direction: 'outbound', subject: 'Application received', body: 'Applicant confirmation queued: Bypass Solution received the funding application and documents for review.', recipient: form.ownerEmail, sender: 'info@bypasssolution.com', status: 'queued', related_template: 'applicant_confirmation' },
        { lead_id: leadId, application_id: leadId, channel: 'Email', direction: 'outbound', subject: `New funding application: ${form.legalName}`, body: `Internal alert queued for ${form.legalName}. Requested amount: ${form.requestedAmount}.`, recipient: 'funding@bypasssolution.com', sender: 'system@bypasssolution.com', status: 'queued', related_template: 'internal_admin_alert' },
      ]);
      await supabase.from('activity_logs').insert({ lead_id: leadId, application_id: leadId, action: 'application_submitted', metadata: { source: 'website', documents: selectedFileCount } });

      localStorage.removeItem(APPLICATION_DRAFT_KEY);
      setConfirmationId(leadId.slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Application submission is temporarily unavailable. Please contact info@bypasssolution.com.');
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    if (validateStep()) setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  if (submitted) {
    return (
      <main className="pt-16 lg:pt-[72px] min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
        <section className="max-w-xl w-full card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6"><Check size={30} className="text-green-600" /></div>
          <p className="section-label mb-2">Confirmation {confirmationId}</p>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] text-navy-900 mb-3">Application received securely</h1>
          <p className="text-slate-600 leading-relaxed mb-6">Thank you, {form.ownerName || 'there'}. Your Bypass Solution funding application has been submitted for private review. A funding specialist will contact you after your application and documents are reviewed.</p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-left text-[13px] text-blue-800 mb-7"><strong>Next step:</strong> Monitor your email and phone for document requests or available funding options. Submission does not guarantee approval or funding.</div>
          <Link to="/" className="btn-primary w-full">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-16 lg:pt-[72px] min-h-screen bg-slate-50">
      <section className="bg-[#07152B] text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,140,255,0.28),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="relative max-w-[1100px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-accent-300 text-[12px] font-bold uppercase tracking-[0.18em] mb-4">Secure funding intake</p>
            <h1 className="text-[38px] lg:text-[58px] leading-[1.05] font-extrabold tracking-[-0.045em] mb-5">Apply for working capital with confidence.</h1>
            <p className="text-slate-300 text-[17px] leading-relaxed max-w-2xl">A polished, encrypted application designed for established business owners. We collect only masked sensitive identifiers until deeper compliance controls are configured.</p>
          </div>
        </div>
      </section>

      <section className="max-w-[980px] mx-auto px-6 lg:px-8 -mt-7 relative z-10 pb-14">
        <div className="card p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => index < currentStep && setCurrentStep(index)} className={`flex items-center gap-2 min-w-max px-3 py-2 rounded-lg text-[13px] font-semibold ${index === currentStep ? 'bg-accent-50 text-accent-700' : index < currentStep ? 'bg-green-50 text-green-700' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${index < currentStep ? 'bg-green-500 text-white' : index === currentStep ? 'bg-accent-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{index < currentStep ? <Check size={13} /> : index + 1}</span>
                {step.label}
              </button>
            ))}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-accent-600 transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 lg:p-8">
          {errors.length > 0 && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700"><div className="flex gap-2 font-semibold mb-1"><AlertCircle size={16} /> Please review</div><ul className="list-disc pl-5 space-y-1">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

          {currentStep === 0 && (
            <div>
              <SectionHeader icon={Building2} eyebrow="Business profile" title="Tell us about the business" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Legal business name" required><Input value={form.legalName} onChange={(e) => set('legalName')(e.target.value)} placeholder="Bypass Holdings LLC" /></Field>
                <Field label="DBA"><Input value={form.dba} onChange={(e) => set('dba')(e.target.value)} placeholder="Operating name" /></Field>
                <Field label="Business address" required><Input value={form.businessAddress} onChange={(e) => set('businessAddress')(e.target.value)} placeholder="Street, city, state, ZIP" /></Field>
                <Field label="Business phone" required><Input type="tel" value={form.businessPhone} onChange={(e) => set('businessPhone')(e.target.value)} placeholder="(555) 000-0000" /></Field>
                <Field label="Business email" required><Input type="email" value={form.businessEmail} onChange={(e) => set('businessEmail')(e.target.value)} placeholder="ops@company.com" /></Field>
                <Field label="Website"><Input value={form.website} onChange={(e) => set('website')(e.target.value)} placeholder="https://company.com" /></Field>
                <Field label="EIN last four" hint="Full EIN is not stored in this intake."><Input inputMode="numeric" maxLength={4} value={form.ein} onChange={(e) => set('ein')(onlyDigits(e.target.value).slice(0, 4))} placeholder="1234" /></Field>
                <Field label="Business start date" required><Input type="date" value={form.startDate} onChange={(e) => set('startDate')(e.target.value)} /></Field>
                <Field label="Entity type" required><Select value={form.entityType} onChange={set('entityType')} options={entityTypes} /></Field>
                <Field label="Industry" required><Select value={form.industry} onChange={set('industry')} options={industries} /></Field>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <SectionHeader icon={WalletCards} eyebrow="Funding request" title="Revenue profile and capital needs" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Requested funding amount" required><Input inputMode="numeric" value={form.requestedAmount} onChange={(e) => set('requestedAmount')(formatMoneyInput(e.target.value))} placeholder="125,000" /></Field>
                <Field label="Use of funds" required><Select value={form.useOfFunds} onChange={set('useOfFunds')} options={useOfFunds} /></Field>
                <Field label="Average monthly revenue" required><Input inputMode="numeric" value={form.monthlyRevenue} onChange={(e) => set('monthlyRevenue')(formatMoneyInput(e.target.value))} placeholder="85,000" /></Field>
                <Field label="Annual revenue" required><Input inputMode="numeric" value={form.annualRevenue} onChange={(e) => set('annualRevenue')(formatMoneyInput(e.target.value))} placeholder="1,020,000" /></Field>
                <Field label="Average daily bank balance" required><Input inputMode="numeric" value={form.averageDailyBalance} onChange={(e) => set('averageDailyBalance')(formatMoneyInput(e.target.value))} placeholder="9,500" /></Field>
                <Field label="Current outstanding loans / advances" required><Select value={form.currentAdvances} onChange={set('currentAdvances')} options={yesNo} /></Field>
                <Field label="Current bank" required><Input value={form.currentBank} onChange={(e) => set('currentBank')(e.target.value)} placeholder="Bank name" /></Field>
                <Field label="NSFs in last 90 days" required><Input type="number" min={0} value={form.nsfsLast90Days} onChange={(e) => set('nsfsLast90Days')(e.target.value)} placeholder="0" /></Field>
                <Field label="Negative days"><Input type="number" min={0} value={form.negativeDays} onChange={(e) => set('negativeDays')(e.target.value)} placeholder="0" /></Field>
                <Field label="Current MCA balances"><Input inputMode="numeric" value={form.currentMcaBalances} onChange={(e) => set('currentMcaBalances')(formatMoneyInput(e.target.value))} placeholder="0" /></Field>
                <Field label="Current daily payments"><Input inputMode="numeric" value={form.currentDailyPayments} onChange={(e) => set('currentDailyPayments')(formatMoneyInput(e.target.value))} placeholder="0" /></Field>
                <Field label="Current weekly payments"><Input inputMode="numeric" value={form.currentWeeklyPayments} onChange={(e) => set('currentWeeklyPayments')(formatMoneyInput(e.target.value))} placeholder="0" /></Field>
                <Field label="Gross monthly revenue"><Input inputMode="numeric" value={form.grossMonthlyRevenue} onChange={(e) => set('grossMonthlyRevenue')(formatMoneyInput(e.target.value))} placeholder="85,000" /></Field>
                <Field label="Net monthly deposits"><Input inputMode="numeric" value={form.netMonthlyDeposits} onChange={(e) => set('netMonthlyDeposits')(formatMoneyInput(e.target.value))} placeholder="76,000" /></Field>
                <Field label="Number of deposits"><Input type="number" min={0} value={form.numberOfDeposits} onChange={(e) => set('numberOfDeposits')(e.target.value)} placeholder="38" /></Field>
                <Field label="Ending balances"><Input value={form.endingBalances} onChange={(e) => set('endingBalances')(e.target.value)} placeholder="Example: 8k, 11k, 9k" /></Field>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <SectionHeader icon={User} eyebrow="Owner profile" title="Primary ownership information" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Owner name" required><Input value={form.ownerName} onChange={(e) => set('ownerName')(e.target.value)} placeholder="Alex Morgan" /></Field>
                <Field label="Title" required><Input value={form.ownerTitle} onChange={(e) => set('ownerTitle')(e.target.value)} placeholder="Managing Member" /></Field>
                <Field label="Ownership percentage" required><Input type="number" min={1} max={100} value={form.ownershipPercentage} onChange={(e) => set('ownershipPercentage')(e.target.value)} placeholder="100" /></Field>
                <Field label="Date of birth" required><Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} /></Field>
                <Field label="SSN last four" hint="Full SSN is intentionally not stored."><Input inputMode="numeric" maxLength={4} value={form.ssn} onChange={(e) => set('ssn')(onlyDigits(e.target.value).slice(0, 4))} placeholder="1234" /></Field>
                <Field label="Owner phone" required><Input type="tel" value={form.ownerPhone} onChange={(e) => set('ownerPhone')(e.target.value)} placeholder="(555) 000-0000" /></Field>
                <Field label="Owner email" required><Input type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail')(e.target.value)} placeholder="owner@company.com" /></Field>
                <Field label="Home address" required><Input value={form.homeAddress} onChange={(e) => set('homeAddress')(e.target.value)} placeholder="Street, city, state, ZIP" /></Field>
                <Field label="Accepts credit cards"><Select value={form.acceptsCards} onChange={set('acceptsCards')} options={yesNo} /></Field>
                <Field label="Payment processor"><Input value={form.paymentProcessor} onChange={(e) => set('paymentProcessor')(e.target.value)} placeholder="Stripe, Square, Fiserv…" /></Field>
                <Field label="Monthly card volume"><Input inputMode="numeric" value={form.monthlyCardVolume} onChange={(e) => set('monthlyCardVolume')(formatMoneyInput(e.target.value))} placeholder="25,000" /></Field>
                <Field label="Deposits per month"><Input type="number" min={0} value={form.depositsPerMonth} onChange={(e) => set('depositsPerMonth')(e.target.value)} placeholder="42" /></Field>
                <Field label="Routing number last four" hint="Full routing data is not stored."><Input inputMode="numeric" maxLength={4} value={form.routingLastFour} onChange={(e) => set('routingLastFour')(onlyDigits(e.target.value).slice(0, 4))} placeholder="1234" /></Field>
                <Field label="Account number last four" hint="Full account data is not stored."><Input inputMode="numeric" maxLength={4} value={form.accountLastFour} onChange={(e) => set('accountLastFour')(onlyDigits(e.target.value).slice(0, 4))} placeholder="6789" /></Field>
              </div>
              <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600"><input type="checkbox" checked={form.smsOptIn} onChange={(e) => set('smsOptIn')(e.target.checked)} className="mt-1" /> I agree to receive SMS updates about my funding application. Message and data rates may apply. Reply STOP to opt out.</label>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <SectionHeader icon={FileText} eyebrow="Secure documents" title="Upload underwriting documents" />
              {!isSupabaseConfigured && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Supabase environment variables are required before production uploads can be accepted.</div>}
              <div className="space-y-4">
                {documentRequirements.map((doc) => (
                  <div key={doc.key} className="rounded-2xl border border-slate-200 p-5 hover:border-accent-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div><p className="font-semibold text-navy-900">{doc.label} {doc.required && <span className="text-red-500">*</span>}</p><p className="text-[13px] text-slate-500 mt-1">PDF, JPG, or PNG. 15MB maximum per file. Stored in a private bucket.</p></div>
                      <label className="btn-secondary cursor-pointer h-10"><Upload size={15} /> Choose file<input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple={doc.multiple} className="hidden" onChange={(e) => chooseFiles(doc.key, e.target.files, doc.multiple)} /></label>
                    </div>
                    {files[doc.key].length > 0 && <div className="mt-4 flex flex-wrap gap-2">{files[doc.key].map((file) => <span key={`${doc.key}-${file.name}`} className="badge-brand normal-case tracking-normal">{file.name}</span>)}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[13px] text-blue-800"><LockKeyhole size={17} className="mt-0.5 flex-shrink-0" /> Uploaded files are private. CRM users must have an active authorized role before viewing applicant documents.</div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <SectionHeader icon={Shield} eyebrow="Final review" title="Confirm and submit" />
              <div className="grid md:grid-cols-2 gap-5 mb-6">
                {[['Business', form.legalName], ['Owner', form.ownerName], ['Requested', form.requestedAmount ? `$${form.requestedAmount}` : '—'], ['Monthly revenue', form.monthlyRevenue ? `$${form.monthlyRevenue}` : '—'], ['Use of funds', form.useOfFunds], ['Documents selected', String(selectedFileCount)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-4"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>)}
              </div>
              <input className="hidden" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => set('honeypot')(e.target.value)} aria-hidden="true" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[14px] text-slate-600 leading-relaxed mb-5"><p>{CONSENT_TEXT}</p><p className="mt-3">Sensitive identifiers and bank details are masked to last four digits in this intake. Full SSN and full bank account numbers are not stored by this form.</p></div>
              <label className="flex items-start gap-3 text-[14px] text-slate-700"><input type="checkbox" checked={form.consent} onChange={(e) => set('consent')(e.target.checked)} className="mt-1" /> I certify the information provided is accurate and agree to the authorization above, the <Link className="text-accent-700 hover:underline" to="/terms" target="_blank">Terms of Use</Link>, and the <Link className="text-accent-700 hover:underline" to="/privacy" target="_blank">Privacy Policy</Link>.</label>
            </div>
          )}

          {submitError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{submitError}</div>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))} disabled={currentStep === 0 || submitting} className="btn-secondary disabled:opacity-40"><ArrowLeft size={16} /> Previous</button>
            {currentStep < steps.length - 1 ? <button type="button" onClick={nextStep} className="btn-primary">Continue <ArrowRight size={16} /></button> : <button type="submit" disabled={submitting || !form.consent} className="btn-primary disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit application'} <ArrowRight size={16} /></button>}
          </div>
          <p className="mt-5 text-center text-[12px] text-slate-400">Working Capital. Smarter. Faster. Subject to review and approval.</p>
        </form>
      </section>
    </main>
  );
}
