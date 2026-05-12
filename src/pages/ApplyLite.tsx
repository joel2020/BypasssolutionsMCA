import { useEffect, useState } from 'react';
import { AlertCircle, Check, FileText, LockKeyhole, Shield } from 'lucide-react';

const DRAFT_KEY = 'bypass-application-lite-draft-v2';
const CONSENT_TEXT = 'By submitting this application, you authorize Bypass Solution and its funding partners to review the information provided, contact you regarding funding options, and request additional documentation as needed. Submission does not guarantee approval or funding.';

const industries = ['Restaurants', 'Retail', 'Construction', 'Healthcare', 'Transportation', 'Automotive', 'Professional Services', 'E-commerce', 'Beauty and Wellness', 'Home Services', 'Manufacturing', 'Other'];
const entityTypes = ['LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietorship', 'Nonprofit', 'Other'];
const useOfFundsOptions = ['Cash flow gaps', 'Payroll', 'Inventory', 'Equipment', 'Expansion', 'Marketing', 'Emergency business expenses', 'Seasonal working capital', 'Debt consolidation', 'Other'];
const yesNo = ['Yes', 'No'];

type FormState = {
  legalName: string;
  dba: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  website: string;
  einFull: string;
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
  ownerName: string;
  ownerTitle: string;
  ownershipPercentage: string;
  dateOfBirth: string;
  ssnFull: string;
  ownerPhone: string;
  ownerEmail: string;
  homeAddress: string;
  consent: boolean;
  smsOptIn: boolean;
  honeypot: string;
};

const defaultForm: FormState = {
  legalName: '',
  dba: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  website: '',
  einFull: '',
  startDate: '',
  entityType: '',
  industry: '',
  requestedAmount: '',
  useOfFunds: '',
  monthlyRevenue: '',
  annualRevenue: '',
  averageDailyBalance: '',
  currentAdvances: '',
  currentBank: '',
  nsfsLast90Days: '',
  ownerName: '',
  ownerTitle: '',
  ownershipPercentage: '',
  dateOfBirth: '',
  ssnFull: '',
  ownerPhone: '',
  ownerEmail: '',
  homeAddress: '',
  consent: false,
  smsOptIn: false,
  honeypot: '',
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function formatMoney(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString() : '';
}

function fieldClass(extra = '') {
  return `w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${extra}`;
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-slate-500">{hint}</span>}
    </label>
  );
}

export default function ApplyLite() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<FormState>;
      setForm((current) => ({ ...current, ...parsed, ssnFull: '', einFull: '' }));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const safeDraft = { ...form, ssnFull: '', einFull: '' };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
  }, [form]);

  const set = (key: keyof FormState) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  function validate() {
    const nextErrors: string[] = [];
    const required: Array<[string, string | boolean]> = [
      ['Legal business name', form.legalName],
      ['Business address', form.businessAddress],
      ['Business phone', form.businessPhone],
      ['Business email', form.businessEmail],
      ['Federal Tax ID (EIN)', form.einFull],
      ['Business start date', form.startDate],
      ['Entity type', form.entityType],
      ['Industry', form.industry],
      ['Requested funding amount', form.requestedAmount],
      ['Use of funds', form.useOfFunds],
      ['Average monthly revenue', form.monthlyRevenue],
      ['Annual revenue', form.annualRevenue],
      ['Average daily bank balance', form.averageDailyBalance],
      ['Current outstanding loans / advances', form.currentAdvances],
      ['Current bank', form.currentBank],
      ['NSFs in last 90 days', form.nsfsLast90Days],
      ['Owner name', form.ownerName],
      ['Owner title', form.ownerTitle],
      ['Ownership percentage', form.ownershipPercentage],
      ['Date of birth', form.dateOfBirth],
      ['Social Security Number', form.ssnFull],
      ['Owner phone', form.ownerPhone],
      ['Owner email', form.ownerEmail],
      ['Home address', form.homeAddress],
      ['Consent authorization', form.consent],
    ];

    required.forEach(([label, value]) => {
      if (value === '' || value === false) nextErrors.push(`${label} is required.`);
    });

    if (form.ssnFull && digitsOnly(form.ssnFull).length !== 9) nextErrors.push('Social Security Number must be exactly 9 digits.');
    if (form.einFull && digitsOnly(form.einFull).length !== 9) nextErrors.push('Federal Tax ID (EIN) must be exactly 9 digits.');
    if (Number(form.ownershipPercentage) <= 0 || Number(form.ownershipPercentage) > 100) nextErrors.push('Ownership percentage must be between 1 and 100.');
    if (Number(form.nsfsLast90Days) < 0) nextErrors.push('NSFs cannot be negative.');
    if (form.honeypot) nextErrors.push('Application could not be submitted.');

    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          einFull: digitsOnly(form.einFull),
          ssnFull: digitsOnly(form.ssnFull),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Application submission is temporarily unavailable.');
      }

      localStorage.removeItem(DRAFT_KEY);
      setConfirmationId(result.confirmationId || 'RECEIVED');
      setForm((current) => ({ ...current, einFull: '', ssnFull: '' }));
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Application submission is temporarily unavailable.';
      setSubmitError(`${message} Please contact info@bypasssolution.com if this continues.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-20">
        <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-green-100 bg-green-50">
            <Check className="text-green-600" size={30} />
          </div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-blue-700">Confirmation {confirmationId}</p>
          <h1 className="mb-3 text-[32px] font-bold tracking-[-0.03em] text-slate-950">Application received securely</h1>
          <p className="mb-5 leading-relaxed text-slate-600">Thank you, {form.ownerName || 'there'}. Your Bypass Solution funding application has been submitted for review.</p>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left text-[13px] text-blue-800">A funding specialist will follow up if additional documents are needed.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[#07152B] px-6 py-14 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,140,255,0.3),transparent_34%)]" />
        <div className="relative mx-auto max-w-[1100px]">
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.18em] text-blue-200">Secure funding intake</p>
          <h1 className="mb-5 max-w-3xl text-[38px] font-extrabold leading-[1.05] tracking-[-0.045em] lg:text-[58px]">Apply for working capital with confidence.</h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-slate-300">Submit your business funding request. Bypass Solution will request documents after reviewing the application.</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-[980px] px-6 pb-16">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 lg:p-8">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-blue-200"><Shield size={22} /></div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-blue-700">Bypass Solution</p>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-slate-950">Business Funding Application</h2>
              <p className="mt-1 text-sm text-slate-500">Fields marked with * are required.</p>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
              <div className="mb-1 flex gap-2 font-semibold"><AlertCircle size={16} /> Please review</div>
              <ul className="list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}

          {submitError && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{submitError}</div>}
          <input type="text" value={form.honeypot} onChange={(event) => set('honeypot')(event.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Legal business name" required><input className={fieldClass()} value={form.legalName} onChange={(event) => set('legalName')(event.target.value)} /></Field>
            <Field label="DBA"><input className={fieldClass()} value={form.dba} onChange={(event) => set('dba')(event.target.value)} /></Field>
            <Field label="Business address" required><input className={fieldClass()} value={form.businessAddress} onChange={(event) => set('businessAddress')(event.target.value)} /></Field>
            <Field label="Business phone" required><input className={fieldClass()} value={form.businessPhone} onChange={(event) => set('businessPhone')(event.target.value)} /></Field>
            <Field label="Business email" required><input type="email" className={fieldClass()} value={form.businessEmail} onChange={(event) => set('businessEmail')(event.target.value)} /></Field>
            <Field label="Website"><input className={fieldClass()} value={form.website} onChange={(event) => set('website')(event.target.value)} /></Field>
            <Field label="Federal Tax ID (EIN)" required hint="Enter 9 digits. We encrypt the full EIN and store only the last four for display."><input className={fieldClass()} value={form.einFull} maxLength={9} inputMode="numeric" autoComplete="off" onChange={(event) => set('einFull')(digitsOnly(event.target.value).slice(0, 9))} /></Field>
            <Field label="Business start date" required><input type="date" className={fieldClass()} value={form.startDate} onChange={(event) => set('startDate')(event.target.value)} /></Field>
            <Field label="Entity type" required><select className={fieldClass()} value={form.entityType} onChange={(event) => set('entityType')(event.target.value)}><option value="">Select</option>{entityTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Industry" required><select className={fieldClass()} value={form.industry} onChange={(event) => set('industry')(event.target.value)}><option value="">Select</option>{industries.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Requested funding amount" required><input className={fieldClass()} value={form.requestedAmount} inputMode="numeric" onChange={(event) => set('requestedAmount')(formatMoney(event.target.value))} /></Field>
            <Field label="Use of funds" required><select className={fieldClass()} value={form.useOfFunds} onChange={(event) => set('useOfFunds')(event.target.value)}><option value="">Select</option>{useOfFundsOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Average monthly revenue" required><input className={fieldClass()} value={form.monthlyRevenue} inputMode="numeric" onChange={(event) => set('monthlyRevenue')(formatMoney(event.target.value))} /></Field>
            <Field label="Annual revenue" required><input className={fieldClass()} value={form.annualRevenue} inputMode="numeric" onChange={(event) => set('annualRevenue')(formatMoney(event.target.value))} /></Field>
            <Field label="Average daily bank balance" required><input className={fieldClass()} value={form.averageDailyBalance} inputMode="numeric" onChange={(event) => set('averageDailyBalance')(formatMoney(event.target.value))} /></Field>
            <Field label="Current outstanding loans / advances" required><select className={fieldClass()} value={form.currentAdvances} onChange={(event) => set('currentAdvances')(event.target.value)}><option value="">Select</option>{yesNo.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Current bank" required><input className={fieldClass()} value={form.currentBank} onChange={(event) => set('currentBank')(event.target.value)} /></Field>
            <Field label="NSFs in last 90 days" required><input type="number" min={0} className={fieldClass()} value={form.nsfsLast90Days} onChange={(event) => set('nsfsLast90Days')(event.target.value)} /></Field>
            <Field label="Owner name" required><input className={fieldClass()} value={form.ownerName} onChange={(event) => set('ownerName')(event.target.value)} /></Field>
            <Field label="Owner title" required><input className={fieldClass()} value={form.ownerTitle} onChange={(event) => set('ownerTitle')(event.target.value)} /></Field>
            <Field label="Ownership percentage" required><input type="number" min={1} max={100} className={fieldClass()} value={form.ownershipPercentage} onChange={(event) => set('ownershipPercentage')(event.target.value)} /></Field>
            <Field label="Date of birth" required><input type="date" className={fieldClass()} value={form.dateOfBirth} onChange={(event) => set('dateOfBirth')(event.target.value)} /></Field>
            <Field label="Social Security Number" required hint="Enter 9 digits. We encrypt the full SSN and store only the last four for display."><input type="password" className={fieldClass()} value={form.ssnFull} maxLength={9} inputMode="numeric" autoComplete="off" onChange={(event) => set('ssnFull')(digitsOnly(event.target.value).slice(0, 9))} /></Field>
            <Field label="Owner phone" required><input className={fieldClass()} value={form.ownerPhone} onChange={(event) => set('ownerPhone')(event.target.value)} /></Field>
            <Field label="Owner email" required><input type="email" className={fieldClass()} value={form.ownerEmail} onChange={(event) => set('ownerEmail')(event.target.value)} /></Field>
            <Field label="Home address" required><input className={fieldClass()} value={form.homeAddress} onChange={(event) => set('homeAddress')(event.target.value)} /></Field>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={18} /> Documents</div>
            <p className="text-sm text-slate-500">After you submit, Bypass Solution will request bank statements, ID, and other documents needed for underwriting.</p>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
            <input type="checkbox" checked={form.smsOptIn} onChange={(event) => set('smsOptIn')(event.target.checked)} className="mt-1" />
            I agree to receive SMS updates about my funding application. Message and data rates may apply. Reply STOP to opt out.
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-[13px] text-blue-900">
            <input type="checkbox" checked={form.consent} onChange={(event) => set('consent')(event.target.checked)} className="mt-1" />
            <span>{CONSENT_TEXT}</span>
          </label>

          <button type="submit" disabled={submitting} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit secure application'} <LockKeyhole size={16} />
          </button>
        </form>
      </section>
    </main>
  );
}
