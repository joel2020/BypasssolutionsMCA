import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, FileText, LockKeyhole, Shield, Upload, User, WalletCards } from 'lucide-react';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../lib/supabase';

const APPLICATION_DRAFT_KEY = 'bypass-funding-application-draft-v3';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const CONSENT_VERSION = 'website-application-consent-2026-05-16';
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);
const CONSENT_TEXT = 'By submitting this application, you certify that the information provided is accurate and authorize Elite Funding Solutions and its funding partners to review the application, documents, business credit, owner background, and related funding information for commercial funding options. Submission does not guarantee approval or funding.';

const steps = [
  { label: 'Business', icon: Building2 },
  { label: 'Bank', icon: WalletCards },
  { label: 'Owner', icon: User },
  { label: 'Funding', icon: WalletCards },
  { label: 'Documents', icon: FileText },
  { label: 'Authorize', icon: Shield },
];

const industries = ['Restaurants', 'Retail', 'Construction', 'Healthcare', 'Transportation', 'Automotive', 'Professional Services', 'E-commerce', 'Beauty and Wellness', 'Home Services', 'Manufacturing', 'Other'];
const entityTypes = ['LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietorship', 'Nonprofit', 'Other'];
const merchantTypes = ['B2B', 'B2C', 'Mixed', 'E-commerce', 'Card-present retail', 'Service business', 'Other'];
const accountTypes = ['Checking', 'Savings', 'Other'];
const useOfFunds = ['Cash flow gaps', 'Payroll', 'Inventory', 'Equipment', 'Expansion', 'Marketing', 'Emergency business expenses', 'Seasonal working capital', 'Debt consolidation', 'Other'];
const timelines = ['Same week', '1-2 weeks', '2-4 weeks', 'Flexible'];
const frequencies = ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Other'];
const financingStatuses = ['Active', 'Recently paid off', 'Defaulted', 'In collections', 'Other'];
const creditScoreRanges = ['Excellent 720+', 'Good 680-719', 'Fair 620-679', 'Challenged below 620', 'Not sure'];

const documentRequirements = [
  { key: 'bankStatements', label: 'Business bank statements', type: 'bank_statement', required: true, multiple: true, minimum: 3 },
  { key: 'governmentId', label: 'Driver license or government-issued ID', type: 'government_id', required: true, multiple: false, minimum: 1 },
  { key: 'voidedCheck', label: 'Voided business check', type: 'voided_check', required: false, multiple: false, minimum: 0 },
  { key: 'merchantStatements', label: 'Merchant statements, if applicable', type: 'merchant_statement', required: false, multiple: true, minimum: 0 },
  { key: 'existingStatements', label: 'Existing funding statements, if applicable', type: 'existing_advance_statement', required: false, multiple: true, minimum: 0 },
] as const;

type DocumentKey = (typeof documentRequirements)[number]['key'];
type FileState = Record<DocumentKey, File[]>;
type FieldErrors = Record<string, string>;

interface UploadedDoc {
  bucket: 'application-documents';
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  docType: string;
}

interface FinancingRecord {
  lenderName: string;
  originalAmount: string;
  currentBalance: string;
  paymentAmount: string;
  paymentFrequency: string;
  status: string;
}

interface FormData {
  legalName: string;
  dba: string;
  entityType: string;
  ein: string;
  merchantType: string;
  startDate: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessEmail: string;
  website: string;
  productsSold: string;
  industry: string;
  bankName: string;
  accountType: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownershipPercentage: string;
  ownerEmail: string;
  ownerPhone: string;
  dateOfBirth: string;
  ssn: string;
  homeAddress: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  creditScoreRange: string;
  requestedAmount: string;
  useOfFunds: string;
  averageMonthlySales: string;
  monthlyRevenue: string;
  desiredTimeline: string;
  hasExistingFinancing: string;
  financingRecords: FinancingRecord[];
  certifyConsent: boolean;
  creditAuthorization: boolean;
  sharingAuthorization: boolean;
  esignConsent: boolean;
  privacyConsent: boolean;
  smsOptIn: boolean;
  signedLegalName: string;
  signatureDate: string;
  honeypot: string;
}

const emptyFinancingRecord: FinancingRecord = {
  lenderName: '',
  originalAmount: '',
  currentBalance: '',
  paymentAmount: '',
  paymentFrequency: '',
  status: '',
};

const defaultFiles: FileState = {
  bankStatements: [],
  governmentId: [],
  voidedCheck: [],
  merchantStatements: [],
  existingStatements: [],
};

const defaultForm: FormData = {
  legalName: '',
  dba: '',
  entityType: '',
  ein: '',
  merchantType: '',
  startDate: '',
  businessAddress: '',
  businessCity: '',
  businessState: '',
  businessZip: '',
  businessPhone: '',
  businessEmail: '',
  website: '',
  productsSold: '',
  industry: '',
  bankName: '',
  accountType: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownershipPercentage: '',
  ownerEmail: '',
  ownerPhone: '',
  dateOfBirth: '',
  ssn: '',
  homeAddress: '',
  homeCity: '',
  homeState: '',
  homeZip: '',
  creditScoreRange: '',
  requestedAmount: '',
  useOfFunds: '',
  averageMonthlySales: '',
  monthlyRevenue: '',
  desiredTimeline: '',
  hasExistingFinancing: '',
  financingRecords: [{ ...emptyFinancingRecord }],
  certifyConsent: false,
  creditAuthorization: false,
  sharingAuthorization: false,
  esignConsent: false,
  privacyConsent: false,
  smsOptIn: false,
  signedLegalName: '',
  signatureDate: new Date().toISOString().slice(0, 10),
  honeypot: '',
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function parseMoney(value: string) {
  return Number(onlyDigits(value)) || 0;
}

function formatMoneyInput(value: string) {
  const amount = onlyDigits(value);
  return amount ? Number(amount).toLocaleString() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function hasValue(value: string | boolean) {
  return typeof value === 'boolean' ? value : value.trim().length > 0;
}

function fileExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

function Field({
  id,
  label,
  required,
  children,
  hint,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="block min-w-0">
      <label htmlFor={id} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-slate-500">{hint}</span>}
      {error && <span id={`${id}-error`} className="mt-1.5 block text-[12px] font-medium text-red-600">{error}</span>}
    </div>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${props.id}-error` : props['aria-describedby']} className={`input-field ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${props.className || ''}`} />;
}

function Textarea({ error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${props.id}-error` : props['aria-describedby']} className={`input-field min-h-24 py-3 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${props.className || ''}`} />;
}

function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  autoComplete,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      className={`select-field ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={autoComplete}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function SectionHeader({ icon: Icon, title, eyebrow }: { icon: typeof Building2; title: string; eyebrow: string }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className="w-11 h-11 rounded-xl bg-navy-900 flex flex-shrink-0 items-center justify-center shadow-lg shadow-navy-900/10"><Icon size={19} className="text-accent-300" /></div>
      <div className="min-w-0">
        <p className="section-label mb-1">{eyebrow}</p>
        <h2 className="text-[24px] font-bold tracking-[-0.02em] text-navy-900">{title}</h2>
      </div>
    </div>
  );
}

function buildStepErrors(form: FormData, files: FileState, step: number) {
  const nextErrors: FieldErrors = {};
  const requireField = (key: keyof FormData, label: string) => {
    if (!hasValue(form[key] as string | boolean)) nextErrors[key] = `${label} is required.`;
  };

  if (step === 0) {
    requireField('legalName', 'Business legal name');
    requireField('entityType', 'Entity type');
    requireField('ein', 'Full EIN');
    requireField('merchantType', 'Merchant type');
    requireField('startDate', 'Date business started');
    requireField('businessAddress', 'Business location');
    requireField('businessPhone', 'Business phone');
    requireField('businessEmail', 'Business email');
    requireField('businessCity', 'City');
    requireField('businessState', 'State');
    requireField('businessZip', 'ZIP');
    requireField('productsSold', 'Products or services sold');
    requireField('industry', 'Industry');
    if (form.ein && onlyDigits(form.ein).length !== 9) nextErrors.ein = 'Enter the full 9-digit EIN.';
    if (form.businessEmail && !isEmail(form.businessEmail)) nextErrors.businessEmail = 'Enter a valid business email.';
  }

  if (step === 1) {
    requireField('bankName', 'Bank name');
  }

  if (step === 2) {
    requireField('ownerFirstName', 'Owner first name');
    requireField('ownerLastName', 'Owner last name');
    requireField('ownershipPercentage', 'Ownership percentage');
    requireField('ownerEmail', 'Owner email');
    requireField('ownerPhone', 'Owner phone or mobile');
    requireField('dateOfBirth', 'Date of birth');
    requireField('ssn', 'Full SSN');
    requireField('homeAddress', 'Home address');
    requireField('homeCity', 'City');
    requireField('homeState', 'State');
    requireField('homeZip', 'ZIP');
    const ownership = Number(form.ownershipPercentage);
    if (form.ownershipPercentage && (Number.isNaN(ownership) || ownership < 1 || ownership > 100)) nextErrors.ownershipPercentage = 'Ownership must be 1 to 100.';
    if (form.ownerEmail && !isEmail(form.ownerEmail)) nextErrors.ownerEmail = 'Enter a valid owner email.';
    if (form.ssn && onlyDigits(form.ssn).length !== 9) nextErrors.ssn = 'Enter the full 9-digit SSN.';
  }

  if (step === 3) {
    requireField('requestedAmount', 'Amount requested');
    requireField('useOfFunds', 'Use of funds');
    requireField('averageMonthlySales', 'Average monthly sales');
    requireField('monthlyRevenue', 'Monthly gross revenue');
    requireField('desiredTimeline', 'Desired timeline');
    requireField('hasExistingFinancing', 'Existing financing answer');
    if (form.requestedAmount && parseMoney(form.requestedAmount) <= 0) nextErrors.requestedAmount = 'Enter a numeric amount requested.';
    if (form.averageMonthlySales && parseMoney(form.averageMonthlySales) <= 0) nextErrors.averageMonthlySales = 'Enter numeric average monthly sales.';
    if (form.monthlyRevenue && parseMoney(form.monthlyRevenue) <= 0) nextErrors.monthlyRevenue = 'Enter numeric monthly gross revenue.';
    if (form.hasExistingFinancing === 'Yes') {
      const hasCompleteRecord = form.financingRecords.some((record) =>
        record.lenderName.trim()
        && (parseMoney(record.originalAmount) > 0 || parseMoney(record.currentBalance) > 0)
        && parseMoney(record.paymentAmount) > 0
        && record.paymentFrequency
        && record.status
      );
      if (!hasCompleteRecord) nextErrors.financingRecords = 'Add at least one complete financing record.';
    }
  }

  if (step === 4) {
    documentRequirements.forEach((doc) => {
      if (doc.required && files[doc.key].length < doc.minimum) {
        nextErrors[doc.key] = doc.key === 'bankStatements' ? 'Upload at least 3 bank statements.' : `${doc.label} is required.`;
      }
    });
  }

  if (step === 5) {
    requireField('certifyConsent', 'Certification');
    requireField('creditAuthorization', 'Credit and background authorization');
    requireField('sharingAuthorization', 'Funding partner sharing authorization');
    requireField('esignConsent', 'E-sign consent');
    requireField('privacyConsent', 'Privacy, terms, and application consent');
    requireField('signedLegalName', 'Signed legal name');
    requireField('signatureDate', 'Signature date');
    if (form.honeypot) nextErrors.honeypot = 'Application could not be submitted.';
  }

  return nextErrors;
}

async function uploadDraftDocument(draftId: string, docType: string, file: File): Promise<UploadedDoc> {
  const extension = fileExtension(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 96);
  const path = `drafts/${draftId}/${docType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('application-documents').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  return {
    bucket: 'application-documents',
    path,
    fileName: safeName,
    fileSize: file.size,
    mimeType: file.type,
    docType,
  };
}

export default function Apply() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [files, setFiles] = useState<FileState>(defaultFiles);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(APPLICATION_DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<FormData>;
      setForm((prev) => ({ ...prev, ...parsed, ein: '', ssn: '', honeypot: '' }));
    }
  }, []);

  useEffect(() => {
    const safeDraft = { ...form, ein: '', ssn: '', honeypot: '' };
    localStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(safeDraft));
  }, [form]);

  const set = (key: keyof FormData) => (value: string | boolean | FinancingRecord[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const selectedFileCount = useMemo(() => Object.values(files).reduce((total, group) => total + group.length, 0), [files]);
  const completedSteps = useMemo(() => steps.filter((_, index) => Object.keys(buildStepErrors(form, files, index)).length === 0).length, [form, files]);
  const progressPercent = Math.round((completedSteps / steps.length) * 100);
  const visibleErrors = Object.values(fieldErrors);

  function validateStep(step = currentStep) {
    const nextErrors = buildStepErrors(form, files, step);
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function chooseFiles(key: DocumentKey, fileList: FileList | null, multiple: boolean) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const rejected = incoming.filter((file) => file.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(fileExtension(file)));
    if (rejected.length) {
      setFieldErrors({ [key]: `Files must be PDF, JPG, or PNG and 15MB or smaller. Rejected: ${rejected.map((file) => file.name).join(', ')}` });
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: multiple ? [...prev[key], ...incoming] : incoming.slice(0, 1) }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateFinancingRecord(index: number, key: keyof FinancingRecord, value: string) {
    const next = form.financingRecords.map((record, i) => (i === index ? { ...record, [key]: value } : record));
    set('financingRecords')(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');

    const allErrors = steps.reduce<FieldErrors>((acc, _, index) => ({ ...acc, ...buildStepErrors(form, files, index) }), {});
    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      const firstInvalidStep = steps.findIndex((_, index) => Object.keys(buildStepErrors(form, files, index)).length > 0);
      if (firstInvalidStep >= 0) setCurrentStep(firstInvalidStep);
      return;
    }

    setSubmitting(true);
    try {
      assertSupabaseConfigured();
      const draftId = crypto.randomUUID();
      const uploadedDocuments: UploadedDoc[] = [];

      for (const requirement of documentRequirements) {
        for (const file of files[requirement.key]) {
          uploadedDocuments.push(await uploadDraftDocument(draftId, requirement.type, file));
        }
      }

      const { data, error } = await supabase.functions.invoke('submit-application', {
        body: {
          ...form,
          documents: uploadedDocuments,
          userAgent: navigator.userAgent,
          consentVersion: CONSENT_VERSION,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(Array.isArray(data?.errors) ? data.errors.join(' ') : 'Application submission failed validation.');

      localStorage.removeItem(APPLICATION_DRAFT_KEY);
      setConfirmationId(data.confirmationId || 'RECEIVED');
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Application submission is temporarily unavailable. Please contact info@elitefundingsolution.com.');
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
          <p className="text-slate-600 leading-relaxed mb-6">Thank you, {form.ownerFirstName || 'there'}. Your Elite Funding Solutions funding application has been submitted for private review. A funding specialist will contact you after your application and documents are reviewed.</p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-left text-[13px] text-blue-800 mb-7"><strong>Next step:</strong> Monitor your email and phone for document requests or available funding options. Submission does not guarantee approval or funding.</div>
          <Link to="/" className="btn-primary w-full">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-16 lg:pt-[72px] min-h-screen bg-slate-50 overflow-x-hidden">
      <section className="bg-[#07152B] text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,140,255,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-accent-300 text-[12px] font-bold uppercase tracking-[0.18em] mb-4">Secure funding intake</p>
            <h1 className="text-[36px] sm:text-[44px] lg:text-[58px] leading-[1.05] font-extrabold mb-5">Apply securely for business funding.</h1>
            <p className="text-slate-300 text-[17px] leading-relaxed max-w-2xl">Complete file review usually starts after required business data, owner authorization, and documents are submitted. Full SSN and EIN are validated here but only last four are sent until encrypted storage is implemented.</p>
          </div>
        </div>
      </section>

      <section className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-10 pb-14">
        <div className="card p-4 mb-6 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => (
              <button key={step.label} type="button" onClick={() => index < currentStep && setCurrentStep(index)} className={`flex items-center gap-2 min-w-max px-3 py-2 rounded-lg text-[13px] font-semibold ${index === currentStep ? 'bg-accent-50 text-accent-700' : index < currentStep ? 'bg-green-50 text-green-700' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${index < currentStep ? 'bg-green-500 text-white' : index === currentStep ? 'bg-accent-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{index < currentStep ? <Check size={13} /> : index + 1}</span>
                {step.label}
              </button>
            ))}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-accent-600 transition-all" style={{ width: `${progressPercent}%` }} /></div>
          <p className="mt-2 text-[12px] text-slate-500">{progressPercent}% complete based on valid completed sections.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 lg:p-8" noValidate>
          {visibleErrors.length > 0 && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700" role="alert" aria-live="polite"><div className="flex gap-2 font-semibold mb-1"><AlertCircle size={16} /> Please review</div><ul className="list-disc pl-5 space-y-1">{visibleErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

          {currentStep === 0 && (
            <div>
              <SectionHeader icon={Building2} eyebrow="Business information" title="Tell us about the business" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field id="legalName" label="Business legal name" required error={fieldErrors.legalName}><Input id="legalName" name="legalName" value={form.legalName} onChange={(e) => set('legalName')(e.target.value)} autoComplete="organization" error={fieldErrors.legalName} /></Field>
                <Field id="dba" label="DBA"><Input id="dba" name="dba" value={form.dba} onChange={(e) => set('dba')(e.target.value)} autoComplete="organization" /></Field>
                <Field id="entityType" label="Entity type" required error={fieldErrors.entityType}><Select id="entityType" name="entityType" value={form.entityType} onChange={set('entityType')} options={entityTypes} error={fieldErrors.entityType} /></Field>
                <Field id="ein" label="Full EIN" required hint="Validated in-session. Only last four are submitted until encrypted storage is available." error={fieldErrors.ein}><Input id="ein" name="ein" type="password" inputMode="numeric" maxLength={11} value={form.ein} onChange={(e) => set('ein')(onlyDigits(e.target.value).slice(0, 9))} autoComplete="off" error={fieldErrors.ein} /></Field>
                <Field id="merchantType" label="Merchant type" required error={fieldErrors.merchantType}><Select id="merchantType" name="merchantType" value={form.merchantType} onChange={set('merchantType')} options={merchantTypes} error={fieldErrors.merchantType} /></Field>
                <Field id="startDate" label="Date business started" required error={fieldErrors.startDate}><Input id="startDate" name="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate')(e.target.value)} error={fieldErrors.startDate} /></Field>
                <Field id="businessAddress" label="Business location" required error={fieldErrors.businessAddress}><Input id="businessAddress" name="businessAddress" value={form.businessAddress} onChange={(e) => set('businessAddress')(e.target.value)} autoComplete="address-line1" error={fieldErrors.businessAddress} /></Field>
                <Field id="businessCity" label="City" required error={fieldErrors.businessCity}><Input id="businessCity" name="businessCity" value={form.businessCity} onChange={(e) => set('businessCity')(e.target.value)} autoComplete="address-level2" error={fieldErrors.businessCity} /></Field>
                <Field id="businessState" label="State" required error={fieldErrors.businessState}><Input id="businessState" name="businessState" value={form.businessState} onChange={(e) => set('businessState')(e.target.value)} autoComplete="address-level1" error={fieldErrors.businessState} /></Field>
                <Field id="businessZip" label="ZIP" required error={fieldErrors.businessZip}><Input id="businessZip" name="businessZip" value={form.businessZip} onChange={(e) => set('businessZip')(e.target.value)} autoComplete="postal-code" error={fieldErrors.businessZip} /></Field>
                <Field id="businessPhone" label="Business phone" required error={fieldErrors.businessPhone}><Input id="businessPhone" name="businessPhone" type="tel" value={form.businessPhone} onChange={(e) => set('businessPhone')(e.target.value)} autoComplete="tel" error={fieldErrors.businessPhone} /></Field>
                <Field id="businessEmail" label="Business email" required error={fieldErrors.businessEmail}><Input id="businessEmail" name="businessEmail" type="email" value={form.businessEmail} onChange={(e) => set('businessEmail')(e.target.value)} autoComplete="email" error={fieldErrors.businessEmail} /></Field>
                <Field id="website" label="Website"><Input id="website" name="website" value={form.website} onChange={(e) => set('website')(e.target.value)} autoComplete="url" /></Field>
                <Field id="industry" label="Industry" required error={fieldErrors.industry}><Select id="industry" name="industry" value={form.industry} onChange={set('industry')} options={industries} error={fieldErrors.industry} /></Field>
                <div className="md:col-span-2"><Field id="productsSold" label="Products or services sold" required error={fieldErrors.productsSold}><Textarea id="productsSold" name="productsSold" value={form.productsSold} onChange={(e) => set('productsSold')(e.target.value)} error={fieldErrors.productsSold} /></Field></div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <SectionHeader icon={WalletCards} eyebrow="Bank reference" title="Business bank reference" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field id="bankName" label="Bank name" required error={fieldErrors.bankName}><Input id="bankName" name="bankName" value={form.bankName} onChange={(e) => set('bankName')(e.target.value)} error={fieldErrors.bankName} /></Field>
                <Field id="accountType" label="Account type"><Select id="accountType" name="accountType" value={form.accountType} onChange={set('accountType')} options={accountTypes} /></Field>
              </div>
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[13px] leading-relaxed text-blue-800">
                Routing and account numbers are not collected during website prequalification. If a funding partner requires them later, they should be collected through a controlled secure workflow.
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <SectionHeader icon={User} eyebrow="Owner or principal" title="Primary owner information" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field id="ownerFirstName" label="Owner first name" required error={fieldErrors.ownerFirstName}><Input id="ownerFirstName" name="ownerFirstName" value={form.ownerFirstName} onChange={(e) => set('ownerFirstName')(e.target.value)} autoComplete="given-name" error={fieldErrors.ownerFirstName} /></Field>
                <Field id="ownerLastName" label="Owner last name" required error={fieldErrors.ownerLastName}><Input id="ownerLastName" name="ownerLastName" value={form.ownerLastName} onChange={(e) => set('ownerLastName')(e.target.value)} autoComplete="family-name" error={fieldErrors.ownerLastName} /></Field>
                <Field id="ownershipPercentage" label="Ownership percentage" required error={fieldErrors.ownershipPercentage}><Input id="ownershipPercentage" name="ownershipPercentage" type="number" min={1} max={100} value={form.ownershipPercentage} onChange={(e) => set('ownershipPercentage')(e.target.value)} error={fieldErrors.ownershipPercentage} /></Field>
                <Field id="dateOfBirth" label="Date of birth" required error={fieldErrors.dateOfBirth}><Input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} error={fieldErrors.dateOfBirth} /></Field>
                <Field id="ssn" label="Full SSN" required hint="Validated in-session. Only last four are submitted until encrypted storage is available." error={fieldErrors.ssn}><Input id="ssn" name="ssn" type="password" inputMode="numeric" maxLength={11} value={form.ssn} onChange={(e) => set('ssn')(onlyDigits(e.target.value).slice(0, 9))} autoComplete="off" error={fieldErrors.ssn} /></Field>
                <Field id="ownerPhone" label="Owner phone or mobile" required error={fieldErrors.ownerPhone}><Input id="ownerPhone" name="ownerPhone" type="tel" value={form.ownerPhone} onChange={(e) => set('ownerPhone')(e.target.value)} autoComplete="tel" error={fieldErrors.ownerPhone} /></Field>
                <Field id="ownerEmail" label="Owner email" required error={fieldErrors.ownerEmail}><Input id="ownerEmail" name="ownerEmail" type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail')(e.target.value)} autoComplete="email" error={fieldErrors.ownerEmail} /></Field>
                <Field id="creditScoreRange" label="Credit score range"><Select id="creditScoreRange" name="creditScoreRange" value={form.creditScoreRange} onChange={set('creditScoreRange')} options={creditScoreRanges} /></Field>
                <Field id="homeAddress" label="Home address" required error={fieldErrors.homeAddress}><Input id="homeAddress" name="homeAddress" value={form.homeAddress} onChange={(e) => set('homeAddress')(e.target.value)} autoComplete="address-line1" error={fieldErrors.homeAddress} /></Field>
                <Field id="homeCity" label="City" required error={fieldErrors.homeCity}><Input id="homeCity" name="homeCity" value={form.homeCity} onChange={(e) => set('homeCity')(e.target.value)} autoComplete="address-level2" error={fieldErrors.homeCity} /></Field>
                <Field id="homeState" label="State" required error={fieldErrors.homeState}><Input id="homeState" name="homeState" value={form.homeState} onChange={(e) => set('homeState')(e.target.value)} autoComplete="address-level1" error={fieldErrors.homeState} /></Field>
                <Field id="homeZip" label="ZIP" required error={fieldErrors.homeZip}><Input id="homeZip" name="homeZip" value={form.homeZip} onChange={(e) => set('homeZip')(e.target.value)} autoComplete="postal-code" error={fieldErrors.homeZip} /></Field>
              </div>
              <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
                <input id="smsOptIn" name="smsOptIn" type="checkbox" checked={form.smsOptIn} onChange={(e) => set('smsOptIn')(e.target.checked)} className="mt-1" />
                <span>I agree to receive SMS updates about my funding application. Consent is not required for funding. Message and data rates may apply. Reply STOP to opt out.</span>
              </label>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <SectionHeader icon={WalletCards} eyebrow="Funding request" title="Capital request and revenue profile" />
              <div className="grid md:grid-cols-2 gap-5">
                <Field id="requestedAmount" label="Amount requested" required error={fieldErrors.requestedAmount}><Input id="requestedAmount" name="requestedAmount" inputMode="numeric" value={form.requestedAmount} onChange={(e) => set('requestedAmount')(formatMoneyInput(e.target.value))} error={fieldErrors.requestedAmount} /></Field>
                <Field id="useOfFunds" label="Use of funds" required error={fieldErrors.useOfFunds}><Select id="useOfFunds" name="useOfFunds" value={form.useOfFunds} onChange={set('useOfFunds')} options={useOfFunds} error={fieldErrors.useOfFunds} /></Field>
                <Field id="averageMonthlySales" label="Average monthly sales" required error={fieldErrors.averageMonthlySales}><Input id="averageMonthlySales" name="averageMonthlySales" inputMode="numeric" value={form.averageMonthlySales} onChange={(e) => set('averageMonthlySales')(formatMoneyInput(e.target.value))} error={fieldErrors.averageMonthlySales} /></Field>
                <Field id="monthlyRevenue" label="Monthly gross revenue" required error={fieldErrors.monthlyRevenue}><Input id="monthlyRevenue" name="monthlyRevenue" inputMode="numeric" value={form.monthlyRevenue} onChange={(e) => set('monthlyRevenue')(formatMoneyInput(e.target.value))} error={fieldErrors.monthlyRevenue} /></Field>
                <Field id="desiredTimeline" label="Desired timeline" required error={fieldErrors.desiredTimeline}><Select id="desiredTimeline" name="desiredTimeline" value={form.desiredTimeline} onChange={set('desiredTimeline')} options={timelines} error={fieldErrors.desiredTimeline} /></Field>
                <Field id="hasExistingFinancing" label="Active or recent revenue-based financing?" required error={fieldErrors.hasExistingFinancing}><Select id="hasExistingFinancing" name="hasExistingFinancing" value={form.hasExistingFinancing} onChange={set('hasExistingFinancing')} options={['Yes', 'No']} error={fieldErrors.hasExistingFinancing} /></Field>
              </div>

              {form.hasExistingFinancing === 'Yes' && (
                <div className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-[16px] font-bold text-navy-900">Existing financing records</h3>
                      <p className="text-[13px] text-slate-500">At least one complete record is required.</p>
                    </div>
                    <button type="button" className="btn-secondary h-10 px-4 text-[13px]" onClick={() => set('financingRecords')([...form.financingRecords, { ...emptyFinancingRecord }])}>Add record</button>
                  </div>
                  {fieldErrors.financingRecords && <p className="mb-3 text-[12px] font-medium text-red-600">{fieldErrors.financingRecords}</p>}
                  <div className="space-y-4">
                    {form.financingRecords.map((record, index) => (
                      <div key={index} className="grid md:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
                        <Input id={`financing-lender-${index}`} name={`financing_lender_${index}`} value={record.lenderName} onChange={(e) => updateFinancingRecord(index, 'lenderName', e.target.value)} placeholder="Funder name" />
                        <Input id={`financing-original-${index}`} name={`financing_original_${index}`} inputMode="numeric" value={record.originalAmount} onChange={(e) => updateFinancingRecord(index, 'originalAmount', formatMoneyInput(e.target.value))} placeholder="Original amount" />
                        <Input id={`financing-balance-${index}`} name={`financing_balance_${index}`} inputMode="numeric" value={record.currentBalance} onChange={(e) => updateFinancingRecord(index, 'currentBalance', formatMoneyInput(e.target.value))} placeholder="Current balance" />
                        <Input id={`financing-payment-${index}`} name={`financing_payment_${index}`} inputMode="numeric" value={record.paymentAmount} onChange={(e) => updateFinancingRecord(index, 'paymentAmount', formatMoneyInput(e.target.value))} placeholder="Payment amount" />
                        <Select id={`financing-frequency-${index}`} name={`financing_frequency_${index}`} value={record.paymentFrequency} onChange={(value) => updateFinancingRecord(index, 'paymentFrequency', value)} options={frequencies} placeholder="Frequency" />
                        <Select id={`financing-status-${index}`} name={`financing_status_${index}`} value={record.status} onChange={(value) => updateFinancingRecord(index, 'status', value)} options={financingStatuses} placeholder="Status" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <SectionHeader icon={FileText} eyebrow="Secure documents" title="Upload required documents" />
              {!isSupabaseConfigured && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Supabase environment variables are required before production uploads can be accepted.</div>}
              <div className="space-y-4">
                {documentRequirements.map((doc) => (
                  <div key={doc.key} className="rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-accent-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-900">{doc.label} {doc.required && <span className="text-red-500">*</span>}</p>
                        <p className="text-[13px] text-slate-500 mt-1">PDF, JPG, or PNG. 15MB maximum per file. {doc.minimum > 1 ? `Minimum ${doc.minimum} files.` : 'Stored in a private bucket.'}</p>
                        {fieldErrors[doc.key] && <p className="mt-2 text-[12px] font-medium text-red-600">{fieldErrors[doc.key]}</p>}
                      </div>
                      <label className="btn-secondary cursor-pointer h-10 max-w-full whitespace-nowrap"><Upload size={15} /> Choose file<input id={`${doc.key}-file`} name={doc.key} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple={doc.multiple} className="hidden" onChange={(e) => chooseFiles(doc.key, e.target.files, doc.multiple)} /></label>
                    </div>
                    {files[doc.key].length > 0 && <div className="mt-4 flex flex-wrap gap-2">{files[doc.key].map((file) => <span key={`${doc.key}-${file.name}-${file.size}`} className="badge-brand max-w-full normal-case tracking-normal break-all">{file.name} uploaded</span>)}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-[13px] text-blue-800"><LockKeyhole size={17} className="mt-0.5 flex-shrink-0" /> Uploaded files are private. CRM users must have an active authorized role before viewing applicant documents.</div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <SectionHeader icon={Shield} eyebrow="Authorization and review" title="Confirm and submit" />
              <div className="grid md:grid-cols-2 gap-5 mb-6">
                {[['Business', form.legalName], ['Owner', `${form.ownerFirstName} ${form.ownerLastName}`.trim()], ['Requested', form.requestedAmount ? `$${form.requestedAmount}` : '-'], ['Monthly revenue', form.monthlyRevenue ? `$${form.monthlyRevenue}` : '-'], ['Use of funds', form.useOfFunds], ['Documents selected', String(selectedFileCount)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-4"><p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</p><p className="mt-1 font-semibold text-slate-800 break-words">{value}</p></div>)}
              </div>
              <input id="bot_field" name="bot_field" className="hidden" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => set('honeypot')(e.target.value)} aria-hidden="true" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[14px] text-slate-600 leading-relaxed mb-5">
                <p>{CONSENT_TEXT}</p>
                <p className="mt-3">Sensitive identifiers are masked to last four digits before submission. Full SSN/EIN encrypted storage remains a backend compliance blocker before those values can be retained.</p>
              </div>
              <div className="space-y-3">
                {[
                  ['certifyConsent', 'I certify the information provided is accurate and complete.'],
                  ['creditAuthorization', 'I authorize credit, background, business, and public-record review as needed for commercial funding underwriting.'],
                  ['sharingAuthorization', 'I authorize Elite Funding Solutions to share this application and documents with funding partners for review.'],
                  ['esignConsent', 'I consent to receive and sign records electronically.'],
                  ['privacyConsent', 'I acknowledge the application consent, Terms of Use, Privacy Policy, and Funding Disclosure.'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-3 text-[14px] text-slate-700">
                    <input id={key} name={key} type="checkbox" checked={Boolean(form[key as keyof FormData])} onChange={(e) => set(key as keyof FormData)(e.target.checked)} className="mt-1" />
                    <span>{label} {key === 'privacyConsent' && <><Link className="text-accent-700 hover:underline" to="/terms" target="_blank">Terms</Link>, <Link className="text-accent-700 hover:underline" to="/privacy" target="_blank">Privacy</Link>, and <Link className="text-accent-700 hover:underline" to="/disclosure" target="_blank">Disclosure</Link>.</>}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 grid md:grid-cols-2 gap-5">
                <Field id="signedLegalName" label="Signed legal name" required error={fieldErrors.signedLegalName}><Input id="signedLegalName" name="signedLegalName" value={form.signedLegalName} onChange={(e) => set('signedLegalName')(e.target.value)} autoComplete="name" error={fieldErrors.signedLegalName} /></Field>
                <Field id="signatureDate" label="Signature date" required error={fieldErrors.signatureDate}><Input id="signatureDate" name="signatureDate" type="date" value={form.signatureDate} onChange={(e) => set('signatureDate')(e.target.value)} error={fieldErrors.signatureDate} /></Field>
              </div>
            </div>
          )}

          {submitError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700" role="alert">{submitError}</div>}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))} disabled={currentStep === 0 || submitting} className="btn-secondary disabled:opacity-40"><ArrowLeft size={16} /> Previous</button>
            {currentStep < steps.length - 1 ? <button type="button" onClick={nextStep} className="btn-primary">Continue <ArrowRight size={16} /></button> : <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit application'} <ArrowRight size={16} /></button>}
          </div>
          <p className="mt-5 text-center text-[12px] text-slate-400">Commercial funding marketplace, not a bank. Subject to review and approval.</p>
        </form>
      </section>
    </main>
  );
}
