import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { assertSupabaseConfigured, supabase } from '../lib/supabase';
import { getAttribution, normalizePhone, sanitizeText } from '../lib/tracking';

const revenueRanges = ['$10K-$25K', '$25K-$50K', '$50K-$100K', '$100K-$250K', '$250K+'];
const timeInBusiness = ['Less than 6 months', '6-12 months', '1-2 years', '2+ years'];
const fundingNeeds = ['Working capital', 'Revenue-based financing', 'Line of credit', 'Equipment financing', 'SBA options', 'Invoice factoring', 'Commercial real estate', 'Not sure'];

interface FitForm {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  monthlyRevenue: string;
  timeInBusiness: string;
  fundingNeed: string;
  amountRequested: string;
  message: string;
  consent: boolean;
  botField: string;
}

const defaultForm: FitForm = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  monthlyRevenue: '',
  timeInBusiness: '',
  fundingNeed: '',
  amountRequested: '',
  message: '',
  consent: false,
  botField: '',
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-field ${props.className || ''}`} />;
}

function Select({ id, name, value, onChange, options, label }: { id: string; name: string; value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return (
    <select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)} className="select-field" aria-label={label}>
      <option value="">Select an option</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export default function FundingFitCheck() {
  const [form, setForm] = useState<FitForm>(defaultForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof FitForm) => (value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  function validate() {
    const nextErrors: string[] = [];
    if (!form.name.trim()) nextErrors.push('Name is required.');
    if (!form.businessName.trim()) nextErrors.push('Business name is required.');
    if (!form.email.trim()) nextErrors.push('Email is required.');
    if (form.email && !isEmail(form.email)) nextErrors.push('Enter a valid email address.');
    if (!form.phone.trim()) nextErrors.push('Phone is required.');
    if (!form.monthlyRevenue) nextErrors.push('Monthly revenue range is required.');
    if (!form.timeInBusiness) nextErrors.push('Time in business is required.');
    if (!form.fundingNeed) nextErrors.push('Funding need is required.');
    if (!form.consent) nextErrors.push('Contact consent is required.');
    if (form.botField) nextErrors.push('Submission could not be accepted.');
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    if (form.botField) {
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

      const message = [
        'Funding fit check submission',
        `Monthly revenue: ${form.monthlyRevenue}`,
        `Time in business: ${form.timeInBusiness}`,
        `Funding need: ${form.fundingNeed}`,
        form.amountRequested ? `Amount requested: ${form.amountRequested}` : '',
        form.message ? `Notes: ${sanitizeText(form.message, 1000)}` : '',
        attributionNote ? `Attribution: ${attributionNote}` : '',
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('submit-contact', {
        body: {
          bot_field: form.botField,
          name: sanitizeText(form.name, 120),
          email: sanitizeText(form.email, 180).toLowerCase(),
          phone: normalizePhone(form.phone),
          company: sanitizeText(form.businessName, 180),
          inquiry_type: 'Funding fit check',
          message,
        },
      });

      if (error || !data?.ok) {
        setSubmitError(Array.isArray(data?.errors) ? data.errors.join(' ') : 'There was a problem sending your fit check. Please try again or call +1 (813) 648-4272.');
        return;
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Funding fit check is temporarily unavailable. Please call +1 (813) 648-4272.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pt-16 lg:pt-[72px] overflow-x-hidden">
      <section className="bg-[#0B1426] py-16 text-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">Fast, flexible capital for serious operators</p>
          <h1 className="max-w-3xl text-[38px] sm:text-[48px] lg:text-[58px] font-bold leading-tight">Check your funding fit without sensitive documents.</h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-300">Answer a few business questions before deciding whether to complete the secure application. No SSN, EIN, bank statements, routing number, or account number required.</p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
            <div className="space-y-5">
              {[
                ['No obligation', 'Use this as a first-pass advisor review before submitting a full file.'],
                ['Commercial marketplace', 'Elite Funding Solutions is not a bank or direct lender. Funding partners make approval decisions.'],
                ['Clear next step', 'If the profile fits, continue to the secure application when ready.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-slate-200 p-5">
                  <div className="mb-3 flex items-center gap-2 text-navy-900">
                    <ShieldCheck size={18} className="text-accent-600" />
                    <h2 className="text-[16px] font-bold">{title}</h2>
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-600">{body}</p>
                </div>
              ))}
            </div>

            <div className="card p-5 sm:p-7">
              {submitted ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 size={26} className="text-green-700" />
                  </div>
                  <h2 className="mb-2 text-[24px] font-bold text-navy-900">Funding fit check received</h2>
                  <p className="mx-auto mb-6 max-w-md text-[15px] leading-relaxed text-slate-600">An Elite Funding Solutions advisor will review your profile and follow up shortly. Ready to submit a full file now?</p>
                  <Link to="/apply" className="btn-primary w-full sm:w-auto">
                    Apply Securely
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="fit-bot-field">Leave this field empty</label>
                    <input id="fit-bot-field" name="bot_field" tabIndex={-1} autoComplete="off" value={form.botField} onChange={(event) => set('botField')(event.target.value)} />
                  </div>

                  {errors.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700" role="alert">
                      {errors.join(' ')}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="fit-name" className="mb-1.5 block text-[14px] font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
                      <Input id="fit-name" name="name" value={form.name} onChange={(event) => set('name')(event.target.value)} autoComplete="name" required />
                    </div>
                    <div>
                      <label htmlFor="fit-business-name" className="mb-1.5 block text-[14px] font-medium text-slate-700">Business name <span className="text-red-500">*</span></label>
                      <Input id="fit-business-name" name="business_name" value={form.businessName} onChange={(event) => set('businessName')(event.target.value)} autoComplete="organization" required />
                    </div>
                    <div>
                      <label htmlFor="fit-email" className="mb-1.5 block text-[14px] font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                      <Input id="fit-email" name="email" type="email" value={form.email} onChange={(event) => set('email')(event.target.value)} autoComplete="email" required />
                    </div>
                    <div>
                      <label htmlFor="fit-phone" className="mb-1.5 block text-[14px] font-medium text-slate-700">Phone <span className="text-red-500">*</span></label>
                      <Input id="fit-phone" name="phone" type="tel" value={form.phone} onChange={(event) => set('phone')(event.target.value)} autoComplete="tel" required />
                    </div>
                    <div>
                      <label htmlFor="fit-monthly-revenue" className="mb-1.5 block text-[14px] font-medium text-slate-700">Monthly revenue <span className="text-red-500">*</span></label>
                      <Select id="fit-monthly-revenue" name="monthly_revenue" label="Monthly revenue" value={form.monthlyRevenue} onChange={set('monthlyRevenue')} options={revenueRanges} />
                    </div>
                    <div>
                      <label htmlFor="fit-time-in-business" className="mb-1.5 block text-[14px] font-medium text-slate-700">Time in business <span className="text-red-500">*</span></label>
                      <Select id="fit-time-in-business" name="time_in_business" label="Time in business" value={form.timeInBusiness} onChange={set('timeInBusiness')} options={timeInBusiness} />
                    </div>
                    <div>
                      <label htmlFor="fit-funding-need" className="mb-1.5 block text-[14px] font-medium text-slate-700">Funding need <span className="text-red-500">*</span></label>
                      <Select id="fit-funding-need" name="funding_need" label="Funding need" value={form.fundingNeed} onChange={set('fundingNeed')} options={fundingNeeds} />
                    </div>
                    <div>
                      <label htmlFor="fit-amount-requested" className="mb-1.5 block text-[14px] font-medium text-slate-700">Amount requested</label>
                      <Input id="fit-amount-requested" name="amount_requested" value={form.amountRequested} onChange={(event) => set('amountRequested')(event.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="fit-message" className="mb-1.5 block text-[14px] font-medium text-slate-700">Notes</label>
                    <textarea id="fit-message" name="message" className="input-field h-28 py-3" value={form.message} onChange={(event) => set('message')(event.target.value)} />
                  </div>

                  <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600">
                    <input id="fit-consent" name="consent" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500" checked={form.consent} onChange={(event) => set('consent')(event.target.checked)} required />
                    <span>I consent to be contacted by Elite Funding Solutions by phone, email, or text about commercial funding options. Consent is not required for funding. Message/data rates may apply.</span>
                  </label>

                  {submitError && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700" role="alert">{submitError}</div>}

                  <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Check Funding Fit'}
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
