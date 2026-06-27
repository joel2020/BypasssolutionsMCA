import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Shield } from 'lucide-react';

const useOfFundsOptions = [
  'Cash flow gaps',
  'Payroll',
  'Inventory',
  'Equipment',
  'Expansion',
  'Marketing',
  'Emergency business expenses',
  'Seasonal working capital',
  'Debt consolidation',
  'Other',
];

interface LeanForm {
  legalName: string;
  ownerName: string;
  email: string;
  phone: string;
  requestedAmount: string;
  useOfFunds: string;
  consent: boolean;
  smsOptIn: boolean;
  honeypot: string;
}

const emptyForm: LeanForm = {
  legalName: '',
  ownerName: '',
  email: '',
  phone: '',
  requestedAmount: '',
  useOfFunds: '',
  consent: false,
  smsOptIn: false,
  honeypot: '',
};

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ApplyStart() {
  const [form, setForm] = useState<LeanForm>(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const set =
    <K extends keyof LeanForm>(key: K) =>
    (value: LeanForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  function validate() {
    const next: string[] = [];
    if (!form.legalName.trim()) next.push('Business legal name is required.');
    if (!form.ownerName.trim()) next.push('Your name is required.');
    if (!isEmail(form.email.trim())) next.push('A valid email is required.');
    if (!form.phone.trim()) next.push('Phone number is required.');
    if (!form.requestedAmount.trim()) next.push('Amount requested is required.');
    if (!form.useOfFunds) next.push('Use of funds is required.');
    if (!form.consent) next.push('You must agree to be contacted to continue.');
    setErrors(next);
    return next.length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/start-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'We could not submit your request. Please try again.');
      setConfirmationId(data.confirmationId || 'RECEIVED');
      setEmailSent(data.signing === 'sent');
      setSubmitted(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Submission is temporarily unavailable. Please call us.']);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="pt-16 lg:pt-[72px] min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
        <section className="max-w-xl w-full card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6">
            <Check size={30} className="text-green-600" />
          </div>
          <p className="section-label mb-2">Confirmation {confirmationId}</p>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] text-navy-900 mb-3">Request received</h1>
          <p className="text-slate-600 leading-relaxed mb-6">
            Thank you, {form.ownerName.split(' ')[0] || 'there'}.
            {emailSent
              ? ' We just emailed your funding application to ' +
                form.email +
                ' for electronic signature. Please check your inbox (and spam) to complete and sign it.'
              : ' A funding specialist will reach out shortly with your application and next steps.'}
          </p>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-left text-[13px] text-blue-800 mb-7">
            <strong>Next step:</strong>{' '}
            {emailSent
              ? 'Open the signNow email and sign your application. Submission does not guarantee approval or funding.'
              : 'Watch your email and phone for your application link. Submission does not guarantee approval or funding.'}
          </div>
          <Link to="/" className="btn-primary w-full">
            Return home
          </Link>
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
            <p className="text-accent-300 text-[12px] font-bold uppercase tracking-[0.18em] mb-4">Start your application</p>
            <h1 className="text-[36px] sm:text-[44px] lg:text-[58px] leading-[1.05] font-extrabold mb-5">
              Apply in under a minute.
            </h1>
            <p className="text-slate-300 text-[17px] leading-relaxed max-w-2xl">
              Tell us a few basics and we will email your funding application for secure electronic signature. No long
              forms to fill out here.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-[680px] mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-10 pb-14">
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 lg:p-8" noValidate>
          {errors.length > 0 && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700" role="alert" aria-live="polite">
              <div className="flex gap-2 font-semibold mb-1">
                <AlertCircle size={16} /> Please review
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="legalName" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Business legal name
              </label>
              <input
                id="legalName"
                name="legalName"
                value={form.legalName}
                onChange={(e) => set('legalName')(e.target.value)}
                autoComplete="organization"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>

            <div>
              <label htmlFor="ownerName" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Your name
              </label>
              <input
                id="ownerName"
                name="ownerName"
                value={form.ownerName}
                onChange={(e) => set('ownerName')(e.target.value)}
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone')(e.target.value)}
                autoComplete="tel"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>

            <div>
              <label htmlFor="requestedAmount" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Amount requested
              </label>
              <input
                id="requestedAmount"
                name="requestedAmount"
                inputMode="numeric"
                value={form.requestedAmount}
                onChange={(e) => set('requestedAmount')(formatMoneyInput(e.target.value))}
                placeholder="$50,000"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              />
            </div>

            <div>
              <label htmlFor="useOfFunds" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Use of funds
              </label>
              <select
                id="useOfFunds"
                name="useOfFunds"
                value={form.useOfFunds}
                onChange={(e) => set('useOfFunds')(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 bg-white"
              >
                <option value="">Select...</option>
                {useOfFundsOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Honeypot: hidden from users, catches bots. */}
          <input
            type="text"
            name="honeypot"
            value={form.honeypot}
            onChange={(e) => set('honeypot')(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => set('consent')(e.target.checked)}
              className="mt-1"
            />
            <span>
              I authorize Bypass Solution and its funding partners to contact me about funding options and to send a
              funding application for my electronic signature. Submission does not guarantee approval or funding.
            </span>
          </label>

          <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={form.smsOptIn}
              onChange={(e) => set('smsOptIn')(e.target.checked)}
              className="mt-1"
            />
            <span>
              Optional: I agree to receive SMS updates about my application. Consent is not required for funding. Message
              and data rates may apply. Reply STOP to opt out.
            </span>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
            {submitting ? 'Submitting...' : 'Start my application'}
            {!submitting && <ArrowRight size={18} />}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-slate-400">
            <Shield size={14} /> Your information is transmitted securely.
          </p>
        </form>
      </section>
    </main>
  );
}
