import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FileText, LockKeyhole, Shield } from 'lucide-react';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '../lib/supabase';

const DRAFT_KEY = 'bypass-application-lite-draft-v1';
const CONSENT_TEXT = 'By submitting this application, you authorize Bypass Solution and its funding partners to review the information provided, contact you regarding funding options, and request additional documentation as needed. Submission does not guarantee approval or funding.';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);

const industries = ['Restaurants', 'Retail', 'Construction', 'Healthcare', 'Transportation', 'Automotive', 'Professional Services', 'E-commerce', 'Beauty and Wellness', 'Home Services', 'Manufacturing', 'Other'];
const entityTypes = ['LLC', 'Corporation', 'S-Corp', 'Partnership', 'Sole Proprietorship', 'Nonprofit', 'Other'];
const useOfFundsOptions = ['Cash flow gaps', 'Payroll', 'Inventory', 'Equipment', 'Expansion', 'Marketing', 'Emergency business expenses', 'Seasonal working capital', 'Debt consolidation', 'Other'];
const yesNo = ['Yes', 'No'];

type FileBucket = 'bankStatements' | 'governmentId' | 'voidedCheck' | 'merchantStatements' | 'existingStatements';

type FormState = {
  legalName: string;
  dba: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  website: string;
  einLastFour: string;
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
  ssnLastFour: string;
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
  einLastFour: '',
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
  ssnLastFour: '',
  ownerPhone: '',
  ownerEmail: '',
  homeAddress: '',
  consent: false,
  smsOptIn: false,
  honeypot: '',
};

const defaultFiles: Record<FileBucket, File[]> = {
  bankStatements: [],
  governmentId: [],
  voidedCheck: [],
  merchantStatements: [],
  existingStatements: [],
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function moneyToNumber(value: string) {
  return Number(digitsOnly(value)) || 0;
}

function formatMoney(value: string) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString() : '';
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
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

async function tryUploadDocument(leadId: string, docType: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 96);
  const storagePath = `${leadId}/${docType}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('application-documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) return false;

  await supabase.from('documents').insert({
    lead_id: leadId,
    file_name: safeName,
    doc_type: docType,
    document_type: docType,
    storage_path: storagePath,
    file_path: storagePath,
    file_size: file.size,
    mime_type: file.type,
    status: 'Pending',
  });

  return true;
}

export default function ApplyLite() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [files, setFiles] = useState<Record<FileBucket, File[]>>(defaultFiles);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');
  const [uploadWarning, setUploadWarning] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<FormState>;
      setForm((current) => ({ ...current, ...parsed, ssnLastFour: '', einLastFour: '' }));
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const safeDraft = { ...form, ssnLastFour: '', einLastFour: '' };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
  }, [form]);

  const set = (key: keyof FormState) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const selectedFileCount = useMemo(() => Object.values(files).reduce((total, group) => total + group.length, 0), [files]);

  function validate() {
    const nextErrors: string[] = [];
    const required: Array<[string, string | boolean]> = [
      ['Legal business name', form.legalName],
      ['Business address', form.businessAddress],
      ['Business phone', form.businessPhone],
      ['Business email', form.businessEmail],
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
      ['SSN last four', form.ssnLastFour],
      ['Owner phone', form.ownerPhone],
      ['Owner email', form.ownerEmail],
      ['Home address', form.homeAddress],
      ['Consent authorization', form.consent],
    ];

    required.forEach(([label, value]) => {
      if (value === '' || value === false) nextErrors.push(`${label} is required.`);
    });

    if (form.ssnLastFour && digitsOnly(form.ssnLastFour).length !== 4) nextErrors.push('SSN last four must be exactly 4 digits.');
    if (form.einLastFour && digitsOnly(form.einLastFour).length !== 4) nextErrors.push('EIN last four must be exactly 4 digits.');
    if (Number(form.ownershipPercentage) <= 0 || Number(form.ownershipPercentage) > 100) nextErrors.push('Ownership percentage must be between 1 and 100.');
    if (Number(form.nsfsLast90Days) < 0) nextErrors.push('NSFs cannot be negative.');
    if (form.honeypot) nextErrors.push('Application could not be submitted.');

    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function chooseFiles(key: FileBucket, fileList: FileList | null, multiple = false) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const rejected = incoming.filter((file) => file.size > MAX_FILE_SIZE || !ALLOWED_FILE_TYPES.has(file.type));
    if (rejected.length) {
      setErrors([`Files must be PDF, JPG, or PNG and 15MB or smaller. Rejected: ${rejected.map((file) => file.name).join(', ')}`]);
      return;
    }
    setFiles((current) => ({ ...current, [key]: multiple ? incoming : incoming.slice(0, 1) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    setUploadWarning('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      assertSupabaseConfigured();
      const { firstName, lastName } = splitName(form.ownerName);

      const { data, error } = await supabase.from('leads').insert({
        business_name: form.legalName.trim(),
        legal_name: form.legalName.trim(),
        dba: form.dba.trim(),
        business_address: form.businessAddress.trim(),
        business_phone: form.businessPhone.trim(),
        business_email: form.businessEmail.trim(),
        website: form.website.trim(),
        ein_last_four: digitsOnly(form.einLastFour),
        start_date: form.startDate,
        entity_type: form.entityType,
        industry: form.industry,
        state: '',
        time_in_business: '',
        monthly_revenue: moneyToNumber(form.monthlyRevenue),
        gross_monthly_revenue: moneyToNumber(form.monthlyRevenue),
        net_monthly_deposits: moneyToNumber(form.monthlyRevenue),
        annual_revenue: moneyToNumber(form.annualRevenue),
        funding_amount_requested: moneyToNumber(form.requestedAmount),
        requested_amount: moneyToNumber(form.requestedAmount),
        first_name: firstName,
        last_name: lastName,
        owner_full_name: form.ownerName.trim(),
        owner_title: form.ownerTitle.trim(),
        owner_dob: form.dateOfBirth,
        ssn_last_four: digitsOnly(form.ssnLastFour),
        owner_home_address: form.homeAddress.trim(),
        email: form.ownerEmail.trim(),
        phone: form.ownerPhone.trim(),
        ownership_pct: form.ownershipPercentage,
        use_of_funds: form.useOfFunds,
        existing_advances: form.currentAdvances === 'Yes',
        current_advances: form.currentAdvances,
        current_bank: form.currentBank.trim(),
        nsfs_last_90_days: Number(form.nsfsLast90Days) || 0,
        negative_days: 0,
        current_mca_balances: 0,
        current_daily_payments: 0,
        current_weekly_payments: 0,
        monthly_deposits: moneyToNumber(form.monthlyRevenue),
        avg_daily_balance: moneyToNumber(form.averageDailyBalance),
        number_of_deposits: 0,
        ending_balances: '',
        accepts_credit_cards: false,
        payment_processor: '',
        monthly_card_volume: 0,
        deposits_per_month: 0,
        routing_last_four: '',
        account_last_four: '',
        sms_opt_in: form.smsOptIn,
        status: 'Application Started',
        source: 'Website',
        consent: true,
        consent_text: CONSENT_TEXT,
        submitted_at: new Date().toISOString(),
      }).select('id').single();

      if (error) throw error;
      const leadId = data.id as string;

      let uploaded = 0;
      const uploadMap: Array<[FileBucket, string]> = [
        ['bankStatements', 'bank_statement'],
        ['governmentId', 'government_id'],
        ['voidedCheck', 'voided_check'],
        ['merchantStatements', 'merchant_statement'],
        ['existingStatements', 'existing_advance_statement'],
      ];

      for (const [key, docType] of uploadMap) {
        for (const file of files[key]) {
          try {
            if (await tryUploadDocument(leadId, docType, file)) uploaded += 1;
          } catch {
            // Do not block a valid lead submission because storage or document metadata policies need adjustment.
          }
        }
      }

      if (selectedFileCount > 0 && uploaded < selectedFileCount) {
        setUploadWarning('Your application was received, but one or more documents could not be uploaded. A funding specialist will request them directly.');
      }

      await supabase.from('communications').insert({
        lead_id: leadId,
        channel: 'Email',
        direction: 'outbound',
        subject: 'Application received',
        body: 'Applicant confirmation queued: Bypass Solution received the funding application for review.',
        recipient: form.ownerEmail,
        sender: 'info@bypasssolution.com',
        status: 'queued',
        related_template: 'applicant_confirmation',
      });

      await supabase.from('activity_logs').insert({
        lead_id: leadId,
        action: 'application_submitted',
        metadata: { source: 'website', selected_documents: selectedFileCount, uploaded_documents: uploaded },
      });

      localStorage.removeItem(DRAFT_KEY);
      setConfirmationId(leadId.slice(0, 8).toUpperCase());
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
          {uploadWarning && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-[13px] text-amber-800">{uploadWarning}</div>}
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
          <p className="max-w-2xl text-[17px] leading-relaxed text-slate-300">Submit your business funding request. Documents can be attached now or requested by a funding specialist after review.</p>
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
          {!isSupabaseConfigured && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Supabase environment variables are required before submissions can be accepted.</div>}

          <input type="text" value={form.honeypot} onChange={(event) => set('honeypot')(event.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Legal business name" required><input className={fieldClass()} value={form.legalName} onChange={(event) => set('legalName')(event.target.value)} /></Field>
            <Field label="DBA"><input className={fieldClass()} value={form.dba} onChange={(event) => set('dba')(event.target.value)} /></Field>
            <Field label="Business address" required><input className={fieldClass()} value={form.businessAddress} onChange={(event) => set('businessAddress')(event.target.value)} /></Field>
            <Field label="Business phone" required><input className={fieldClass()} value={form.businessPhone} onChange={(event) => set('businessPhone')(event.target.value)} /></Field>
            <Field label="Business email" required><input type="email" className={fieldClass()} value={form.businessEmail} onChange={(event) => set('businessEmail')(event.target.value)} /></Field>
            <Field label="Website"><input className={fieldClass()} value={form.website} onChange={(event) => set('website')(event.target.value)} /></Field>
            <Field label="EIN last four"><input className={fieldClass()} value={form.einLastFour} maxLength={4} inputMode="numeric" onChange={(event) => set('einLastFour')(digitsOnly(event.target.value).slice(0, 4))} /></Field>
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
            <Field label="SSN last four" required hint="Only last four digits are stored."><input className={fieldClass()} value={form.ssnLastFour} maxLength={4} inputMode="numeric" onChange={(event) => set('ssnLastFour')(digitsOnly(event.target.value).slice(0, 4))} /></Field>
            <Field label="Owner phone" required><input className={fieldClass()} value={form.ownerPhone} onChange={(event) => set('ownerPhone')(event.target.value)} /></Field>
            <Field label="Owner email" required><input type="email" className={fieldClass()} value={form.ownerEmail} onChange={(event) => set('ownerEmail')(event.target.value)} /></Field>
            <Field label="Home address" required><input className={fieldClass()} value={form.homeAddress} onChange={(event) => set('homeAddress')(event.target.value)} /></Field>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={18} /> Optional document uploads</div>
            <p className="mb-4 text-sm text-slate-500">Attach documents now, or Bypass Solution can request them after reviewing the application.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Bank statements"><input className={fieldClass('bg-white')} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => chooseFiles('bankStatements', event.target.files, true)} /></Field>
              <Field label="Government ID"><input className={fieldClass('bg-white')} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => chooseFiles('governmentId', event.target.files)} /></Field>
              <Field label="Voided check"><input className={fieldClass('bg-white')} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => chooseFiles('voidedCheck', event.target.files)} /></Field>
              <Field label="Existing funding statements"><input className={fieldClass('bg-white')} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => chooseFiles('existingStatements', event.target.files, true)} /></Field>
            </div>
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
