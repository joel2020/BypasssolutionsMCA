import { useState } from 'react';
import { Check, Upload, ArrowRight, ArrowLeft, Building2, User, DollarSign, FileText, Shield } from 'lucide-react';
import { assertSupabaseConfigured, supabase } from '../lib/supabase';
import { getAttribution, normalizePhone, sanitizeText } from '../lib/tracking';

const steps = [
  { label: 'Business Info', icon: Building2 },
  { label: 'Owner Info', icon: User },
  { label: 'Funding Details', icon: DollarSign },
  { label: 'Documents', icon: FileText },
  { label: 'Review & Submit', icon: Shield },
];

const industries = [
  'Restaurants & Food Service', 'Trucking & Transportation', 'Construction & Contractors',
  'Retail & Wholesale', 'Medical & Healthcare', 'E-commerce', 'Auto Repair',
  'Beauty & Wellness', 'Professional Services', 'Manufacturing', 'Real Estate',
  'Other',
];

const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

const timeInBusiness = [
  '0–3 months', '3–6 months', '6–12 months', '1–2 years', '2–5 years', '5+ years',
];

const creditRanges = [
  '500–549', '550–599', '600–649', '650–699', '700–749', '750+', 'Unsure',
];

const fundingAmounts = [
  '$5,000 – $25,000', '$25,001 – $50,000', '$50,001 – $100,000',
  '$100,001 – $250,000', '$250,001 – $500,000', '$500,001 – $1,000,000', '$1,000,000+',
];

const useOfFunds = [
  'Working Capital', 'Inventory Purchase', 'Equipment', 'Payroll',
  'Marketing & Advertising', 'Expansion', 'Renovation', 'Debt Consolidation',
  'Tax Obligations', 'Other',
];

const urgencyOptions = [
  'Within 24–48 hours', 'This week', 'Within 2 weeks', 'This month', 'Just exploring options',
];

interface FormData {
  businessName: string;
  dba: string;
  industry: string;
  website: string;
  state: string;
  timeInBusiness: string;
  monthlyRevenue: string;
  fundingAmount: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  creditScore: string;
  ownershipPct: string;
  useOfFunds: string;
  existingAdvances: string;
  monthlyDeposits: string;
  avgDailyBalance: string;
  urgency: string;
  bankStatements: File[];
  voidedCheck: File | null;
  driversLicense: File | null;
  businessDocs: File[];
  consent: boolean;
  honeypot: string;
}

const defaultForm: FormData = {
  businessName: '', dba: '', industry: '', website: '', state: '',
  timeInBusiness: '', monthlyRevenue: '', fundingAmount: '',
  firstName: '', lastName: '', email: '', phone: '', creditScore: '', ownershipPct: '',
  useOfFunds: '', existingAdvances: '', monthlyDeposits: '', avgDailyBalance: '', urgency: '',
  bankStatements: [], voidedCheck: null, driversLicense: null, businessDocs: [],
  consent: false,
  honeypot: '',
};

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[14px] font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field pr-10 cursor-pointer"
      >
        <option value="">{placeholder || 'Select an option'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5L7 9L11 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function parseMoney(value: string) {
  const numbers = value.match(/[0-9,]+/g);
  if (!numbers?.length) return 0;
  return parseFloat(numbers[numbers.length - 1].replace(/,/g, '')) || 0;
}

function validateRequired(values: Array<[string, string | boolean]>) {
  const missing = values.find(([, value]) => value === '' || value === false);
  return missing?.[0] || '';
}

export default function Apply() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormData) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileUpload = (key: 'bankStatements' | 'businessDocs', files: FileList | null) => {
    if (!files) return;
    setForm((prev) => ({ ...prev, [key]: Array.from(files) }));
  };

  const handleSingleFile = (key: 'voidedCheck' | 'driversLicense', files: FileList | null) => {
    if (!files) return;
    setForm((prev) => ({ ...prev, [key]: files[0] }));
  };

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const missing = validateRequired([
      ['Business legal name', form.businessName],
      ['Industry', form.industry],
      ['State', form.state],
      ['Time in business', form.timeInBusiness],
      ['Average monthly revenue', form.monthlyRevenue],
      ['Funding amount requested', form.fundingAmount],
      ['First name', form.firstName],
      ['Last name', form.lastName],
      ['Email address', form.email],
      ['Phone number', form.phone],
      ['Credit score range', form.creditScore],
      ['Ownership percentage', form.ownershipPct],
      ['Use of funds', form.useOfFunds],
      ['Existing advances or loans', form.existingAdvances],
      ['Current monthly bank deposits', form.monthlyDeposits],
      ['Funding timeline', form.urgency],
      ['Consent authorization', form.consent],
    ]);

    if (missing) {
      setSubmitError(`${missing} is required before submitting your application.`);
      return;
    }

    if (form.honeypot) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);

    try {
      assertSupabaseConfigured();
      const attribution = getAttribution();
      const attributionNote = Object.entries(attribution)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
      const uploadedDocumentSummary = [
        form.bankStatements.length ? `Bank statements selected: ${form.bankStatements.map((file) => file.name).join(', ')}` : '',
        form.voidedCheck ? `Voided check selected: ${form.voidedCheck.name}` : '',
        form.driversLicense ? `Driver license selected: ${form.driversLicense.name}` : '',
        form.businessDocs.length ? `Business docs selected: ${form.businessDocs.map((file) => file.name).join(', ')}` : '',
      ].filter(Boolean).join(' | ');

      const { error } = await supabase.from('leads').insert({
        business_name: sanitizeText(form.businessName, 180),
        dba: sanitizeText(form.dba, 180),
        industry: form.industry,
        website: sanitizeText(form.website, 250),
        state: form.state,
        time_in_business: form.timeInBusiness,
        monthly_revenue: parseMoney(form.monthlyRevenue),
        funding_amount_requested: parseMoney(form.fundingAmount),
        first_name: sanitizeText(form.firstName, 120),
        last_name: sanitizeText(form.lastName, 120),
        email: sanitizeText(form.email, 180).toLowerCase(),
        phone: normalizePhone(form.phone),
        credit_score_range: form.creditScore,
        ownership_pct: form.ownershipPct,
        use_of_funds: form.useOfFunds,
        existing_advances: form.existingAdvances === 'Yes',
        monthly_deposits: parseMoney(form.monthlyDeposits),
        avg_daily_balance: parseMoney(form.avgDailyBalance),
        urgency: form.urgency,
        status: 'Application Started',
        source: 'Website',
        notes: [attributionNote ? `Attribution: ${attributionNote}` : '', uploadedDocumentSummary].filter(Boolean).join('\n'),
        consent: form.consent,
      });

      if (error) {
        setSubmitError('There was a problem submitting your application. Please try again or contact info@bypasssolution.com.');
        return;
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Application submission is temporarily unavailable. Please contact info@bypasssolution.com.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-16 lg:pt-[72px] min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-green-600" />
          </div>
          <h1 className="text-[28px] font-bold text-navy-900 mb-3">Application Received</h1>
          <p className="text-[16px] text-slate-500 leading-relaxed mb-6">
            Thank you, {form.firstName}. We've received your application for {form.businessName}. A funding specialist will review your information and contact you within 1–2 business days.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-md px-5 py-4 text-left mb-8">
            <p className="text-[13px] text-amber-700">
              <strong>Important:</strong> This is not an approval. Your application will be reviewed and a specialist will discuss available options with you. Subject to review and approval. Not all applicants qualify.
            </p>
          </div>
          <a href="/" className="btn-primary w-full justify-center">
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 lg:pt-[72px] min-h-screen bg-slate-50">
      {/* Progress header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[860px] mx-auto px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[18px] font-bold text-navy-900">Business Funding Application</h1>
            <span className="text-[13px] text-slate-500">Step {currentStep + 1} of {steps.length}</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center min-w-0">
                <button
                  onClick={() => i < currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors ${
                    i === currentStep
                      ? 'bg-accent-50 text-accent-700'
                      : i < currentStep
                      ? 'text-green-600 hover:bg-green-50 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < currentStep
                      ? 'bg-green-500'
                      : i === currentStep
                      ? 'bg-accent-600'
                      : 'bg-slate-200'
                  }`}>
                    {i < currentStep ? (
                      <Check size={11} className="text-white" />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{i + 1}</span>
                    )}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px mx-1 flex-shrink-0 ${i < currentStep ? 'bg-green-300' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[860px] mx-auto px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} noValidate>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="application-website">Company website</label>
            <input id="application-website" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => set('honeypot')(e.target.value)} />
          </div>

          {/* Step 0: Business Info */}
          {currentStep === 0 && (
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-md bg-navy-900 flex items-center justify-center">
                  <Building2 size={18} className="text-accent-400" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-navy-900">Business Information</h2>
                  <p className="text-[13px] text-slate-500">Tell us about your business</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="Business Legal Name" required>
                  <input className="input-field" placeholder="ABC Company LLC" value={form.businessName}
                    onChange={(e) => set('businessName')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="DBA (Doing Business As)">
                  <input className="input-field" placeholder="If different from legal name" value={form.dba}
                    onChange={(e) => set('dba')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Industry" required>
                  <SelectField value={form.industry} onChange={set('industry')} options={industries} placeholder="Select industry" />
                </FieldGroup>

                <FieldGroup label="Business Website">
                  <input className="input-field" placeholder="https://yourbusiness.com" value={form.website}
                    onChange={(e) => set('website')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="State" required>
                  <SelectField value={form.state} onChange={set('state')} options={states} placeholder="Select state" />
                </FieldGroup>

                <FieldGroup label="Time in Business" required>
                  <SelectField value={form.timeInBusiness} onChange={set('timeInBusiness')} options={timeInBusiness} />
                </FieldGroup>

                <FieldGroup label="Average Monthly Revenue" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input className="input-field pl-7" placeholder="50,000" value={form.monthlyRevenue}
                      onChange={(e) => set('monthlyRevenue')(e.target.value)} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Funding Amount Requested" required>
                  <SelectField value={form.fundingAmount} onChange={set('fundingAmount')} options={fundingAmounts} />
                </FieldGroup>
              </div>
            </div>
          )}

          {/* Step 1: Owner Info */}
          {currentStep === 1 && (
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-md bg-navy-900 flex items-center justify-center">
                  <User size={18} className="text-accent-400" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-navy-900">Owner Information</h2>
                  <p className="text-[13px] text-slate-500">Tell us about the primary owner</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="First Name" required>
                  <input className="input-field" placeholder="John" value={form.firstName}
                    onChange={(e) => set('firstName')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Last Name" required>
                  <input className="input-field" placeholder="Smith" value={form.lastName}
                    onChange={(e) => set('lastName')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Email Address" required>
                  <input className="input-field" type="email" placeholder="john@yourbusiness.com" value={form.email}
                    onChange={(e) => set('email')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Phone Number" required>
                  <input className="input-field" type="tel" placeholder="+1 (813) 648-4272" value={form.phone}
                    onChange={(e) => set('phone')(e.target.value)} />
                </FieldGroup>

                <FieldGroup label="Credit Score Range" required>
                  <SelectField value={form.creditScore} onChange={set('creditScore')} options={creditRanges} />
                </FieldGroup>

                <FieldGroup label="Ownership Percentage" required>
                  <div className="relative">
                    <input className="input-field pr-8" placeholder="100" value={form.ownershipPct}
                      onChange={(e) => set('ownershipPct')(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </FieldGroup>
              </div>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
                <p className="text-[13px] text-slate-500">
                  Your personal information is handled with strict confidentiality. A soft credit inquiry may be performed during review, which does not affect your credit score.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Funding Details */}
          {currentStep === 2 && (
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-md bg-navy-900 flex items-center justify-center">
                  <DollarSign size={18} className="text-accent-400" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-navy-900">Funding Details</h2>
                  <p className="text-[13px] text-slate-500">Help us understand your funding needs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FieldGroup label="Primary Use of Funds" required>
                  <SelectField value={form.useOfFunds} onChange={set('useOfFunds')} options={useOfFunds} />
                </FieldGroup>

                <FieldGroup label="Do you have existing advances or loans?" required>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set('existingAdvances')(opt)}
                        className={`flex-1 h-11 border rounded-md text-[15px] font-medium transition-colors ${
                          form.existingAdvances === opt
                            ? 'border-accent-500 bg-accent-50 text-accent-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                <FieldGroup label="Current Monthly Bank Deposits" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input className="input-field pl-7" placeholder="45,000" value={form.monthlyDeposits}
                      onChange={(e) => set('monthlyDeposits')(e.target.value)} />
                  </div>
                </FieldGroup>

                <FieldGroup label="Average Daily Bank Balance">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input className="input-field pl-7" placeholder="5,000" value={form.avgDailyBalance}
                      onChange={(e) => set('avgDailyBalance')(e.target.value)} />
                  </div>
                </FieldGroup>

                <div className="md:col-span-2">
                  <FieldGroup label="How Quickly Do You Need Funding?" required>
                    <div className="flex flex-wrap gap-2">
                      {urgencyOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => set('urgency')(opt)}
                          className={`px-4 py-2.5 border rounded-md text-[14px] font-medium transition-colors ${
                            form.urgency === opt
                              ? 'border-accent-500 bg-accent-50 text-accent-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </FieldGroup>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="card p-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-md bg-navy-900 flex items-center justify-center">
                  <FileText size={18} className="text-accent-400" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-navy-900">Document Upload</h2>
                  <p className="text-[13px] text-slate-500">Securely upload your documents — all files are encrypted</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {[
                  {
                    label: 'Business Bank Statements',
                    sub: '3–6 months required — PDF or image files accepted',
                    required: true,
                    multiple: true,
                    key: 'bankStatements' as const,
                    accept: '.pdf,.jpg,.jpeg,.png',
                  },
                  {
                    label: 'Voided Business Check',
                    sub: 'Used to verify bank account information',
                    required: true,
                    multiple: false,
                    key: 'voidedCheck' as const,
                    accept: '.pdf,.jpg,.jpeg,.png',
                  },
                  {
                    label: "Owner's Driver's License",
                    sub: 'Government-issued photo ID required',
                    required: true,
                    multiple: false,
                    key: 'driversLicense' as const,
                    accept: '.pdf,.jpg,.jpeg,.png',
                  },
                  {
                    label: 'Business Documents',
                    sub: 'Business license, articles of incorporation, EIN letter (optional but recommended)',
                    required: false,
                    multiple: true,
                    key: 'businessDocs' as const,
                    accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
                  },
                ].map((doc) => (
                  <div key={doc.label} className="border border-slate-200 rounded-lg p-5 hover:border-accent-300 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-[15px] font-semibold text-navy-900">
                          {doc.label}
                          {doc.required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        <p className="text-[13px] text-slate-500 mt-0.5">{doc.sub}</p>
                      </div>
                      {(doc.multiple
                        ? (form[doc.key] as File[]).length > 0
                        : form[doc.key] !== null) && (
                        <span className="badge-success flex-shrink-0">Uploaded</span>
                      )}
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="flex items-center justify-center gap-2 h-10 px-4 bg-slate-50 border border-slate-200 rounded-md text-[14px] font-medium text-slate-600 group-hover:border-accent-300 group-hover:text-accent-700 transition-colors">
                        <Upload size={15} />
                        {doc.multiple ? 'Choose Files' : 'Choose File'}
                      </div>
                      <input
                        type="file"
                        accept={doc.accept}
                        multiple={doc.multiple}
                        className="hidden"
                        onChange={(e) => {
                          if (doc.multiple) {
                            handleFileUpload(doc.key as 'bankStatements' | 'businessDocs', e.target.files);
                          } else {
                            handleSingleFile(doc.key as 'voidedCheck' | 'driversLicense', e.target.files);
                          }
                        }}
                      />
                      <span className="text-[13px] text-slate-400">
                        {doc.multiple
                          ? `${(form[doc.key] as File[]).length} file(s) selected`
                          : form[doc.key]
                          ? (form[doc.key] as File).name
                          : 'No file chosen'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                <Shield size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-blue-700">
                  All uploaded documents are encrypted with 256-bit SSL encryption and stored securely. Your information is handled with strict confidentiality.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Consent */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-5">
              {/* Summary */}
              <div className="card p-8">
                <h2 className="text-[20px] font-bold text-navy-900 mb-6">Application Summary</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Business</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Business Name', value: form.businessName || '—' },
                        { label: 'Industry', value: form.industry || '—' },
                        { label: 'State', value: form.state || '—' },
                        { label: 'Monthly Revenue', value: form.monthlyRevenue ? `$${form.monthlyRevenue}` : '—' },
                        { label: 'Time in Business', value: form.timeInBusiness || '—' },
                        { label: 'Funding Requested', value: form.fundingAmount || '—' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-none">
                          <span className="text-[13px] text-slate-500">{item.label}</span>
                          <span className="text-[13px] font-medium text-slate-800">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Owner</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Name', value: `${form.firstName} ${form.lastName}`.trim() || '—' },
                        { label: 'Email', value: form.email || '—' },
                        { label: 'Phone', value: form.phone || '—' },
                        { label: 'Credit Score', value: form.creditScore || '—' },
                        { label: 'Ownership', value: form.ownershipPct ? `${form.ownershipPct}%` : '—' },
                        { label: 'Use of Funds', value: form.useOfFunds || '—' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-none">
                          <span className="text-[13px] text-slate-500">{item.label}</span>
                          <span className="text-[13px] font-medium text-slate-800">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="card p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-md bg-navy-900 flex items-center justify-center">
                    <Shield size={18} className="text-accent-400" />
                  </div>
                  <h2 className="text-[18px] font-bold text-navy-900">Authorization & Consent</h2>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-5 mb-5 text-[14px] text-slate-600 leading-relaxed">
                  <p>
                    By submitting this application, you acknowledge and agree that:
                  </p>
                  <ul className="list-disc pl-5 mt-3 flex flex-col gap-1.5">
                    <li>All information provided is accurate and complete to the best of your knowledge.</li>
                    <li>Bypass Solution and its funding partners may contact you regarding business funding options.</li>
                    <li>A soft credit inquiry may be performed, which does not affect your credit score.</li>
                    <li>This application is not an offer or guarantee of funding.</li>
                    <li>All funding is subject to review and approval by individual funding partners.</li>
                    <li>Not all applicants will qualify for funding options.</li>
                    <li>You agree to review all funding terms carefully before accepting any offer.</li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <span className="relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 appearance-none rounded border-2 border-slate-300 bg-white transition-colors checked:border-accent-600 checked:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                      checked={form.consent}
                      onChange={(e) => set('consent')(e.target.checked)}
                      required
                    />
                    <Check size={12} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
                  </span>
                  <p className="text-[14px] text-slate-700 leading-relaxed">
                    I confirm the information provided is accurate and authorize Bypass Solution and its funding partners to review my application, contact me regarding business funding options, verify business information, review bank statements, and obtain business credit information where permitted. Funding is subject to review and approval. Terms may vary and not all applicants qualify. I have read and agree to the{' '}
                    <a href="/terms" target="_blank" className="text-accent-600 hover:underline">Terms of Use</a> and{' '}
                    <a href="/privacy" target="_blank" className="text-accent-600 hover:underline">Privacy Policy</a>.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md px-4 py-3" role="alert" aria-live="polite">
              <p className="text-[13px] text-red-600">{submitError}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="btn-primary"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!form.consent || submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          <p className="text-[12px] text-slate-400 text-center mt-4">
            Subject to review and approval. Not all applicants qualify. This is not an offer to lend.
          </p>
        </form>
      </div>
    </div>
  );
}
