import { useState } from 'react';
import { ArrowRight, Check, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { assertSupabaseConfigured, supabase } from '../lib/supabase';
import { getAttribution, normalizePhone, sanitizeText } from '../lib/tracking';

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  type: '',
  consent: false,
  website: '',
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setConsent = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, consent: e.target.checked }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (form.website) {
      setSubmitted(true);
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setSubmitError('Please complete your name, email address, and message.');
      return;
    }

    if (!isValidEmail(form.email)) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    if (!form.consent) {
      setSubmitError('Please confirm that Elite Funding Solutions may contact you about your inquiry.');
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

      const { data, error } = await supabase.functions.invoke('submit-contact', {
        body: {
          bot_field: form.website,
          name: sanitizeText(form.name, 120),
          email: sanitizeText(form.email, 180).toLowerCase(),
          phone: normalizePhone(form.phone),
          company: sanitizeText(form.company, 180),
          inquiry_type: sanitizeText(form.type, 120),
          message: `${sanitizeText(form.message, 2000)}${attributionNote ? `\n\nAttribution: ${attributionNote}` : ''}`,
        },
      });

      if (error || !data?.ok) {
        setSubmitError(Array.isArray(data?.errors) ? data.errors.join(' ') : 'There was a problem sending your message. Please try again or call +1 (813) 648-4272.');
        return;
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Message submission is temporarily unavailable. Please call +1 (813) 648-4272.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-16 lg:pt-[72px] overflow-x-hidden">
      <section className="bg-[#0B1426] py-20">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">Contact Us</p>
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight mb-4 max-w-[520px]">Speak With a Funding Specialist</h1>
          <p className="text-[17px] text-slate-400 max-w-[480px] leading-relaxed">Have questions about your options? Our team is here to help. All conversations are confidential.</p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div>
              <h2 className="text-[20px] font-bold text-navy-900 mb-6">Get in Touch</h2>

              <div className="flex flex-col gap-6">
                {[
                  { icon: Phone, label: 'Phone', value: '+1 (813) 648-4272', href: 'tel:+18136484272', note: 'Direct line' },
                  { icon: Mail, label: 'Email', value: 'info@elitefundingsolution.com', href: 'mailto:info@elitefundingsolution.com', note: 'We respond within 1 business day' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-accent-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-navy-900">{item.label}</p>
                      <a href={item.href} className="text-[15px] text-accent-600 hover:text-accent-700 transition-colors break-all">{item.value}</a>
                      <p className="text-[13px] text-slate-400 mt-0.5">{item.note}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">Business Hours</p>
                    <p className="text-[15px] text-slate-600">Mon-Fri: 9:00 AM-6:00 PM EST</p>
                    <p className="text-[13px] text-slate-400 mt-0.5">Closed weekends and major holidays</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">Location</p>
                    <p className="text-[15px] text-slate-600">United States</p>
                    <p className="text-[13px] text-slate-400 mt-0.5">Serving businesses nationwide</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <p className="text-[14px] font-semibold text-navy-900 mb-3">Ready to Start?</p>
                <p className="text-[14px] text-slate-500 mb-4 leading-relaxed">Start with the low-friction funding fit check before submitting sensitive application data.</p>
                <Link to="/funding-fit-check" className="btn-primary w-full justify-center text-[14px]">
                  Check Funding Fit
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              {submitted ? (
                <div className="card p-8 sm:p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-[22px] font-bold text-navy-900 mb-2">Message Received</h2>
                  <p className="text-[15px] text-slate-500">Message received. An Elite Funding Solutions advisor will follow up shortly.</p>
                </div>
              ) : (
                <div className="card p-5 sm:p-8">
                  <h2 className="text-[20px] font-bold text-navy-900 mb-6">Send Us a Message</h2>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="company-website">Company website</label>
                      <input id="company-website" name="bot_field" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-name" className="block text-[14px] font-medium text-slate-700 mb-1.5">Your Name <span className="text-red-500">*</span></label>
                        <input id="contact-name" name="name" className="input-field" value={form.name} onChange={set('name')} autoComplete="name" required />
                      </div>
                      <div>
                        <label htmlFor="contact-company" className="block text-[14px] font-medium text-slate-700 mb-1.5">Business Name</label>
                        <input id="contact-company" name="company" className="input-field" value={form.company} onChange={set('company')} autoComplete="organization" />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-[14px] font-medium text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                        <input id="contact-email" name="email" className="input-field" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
                      </div>
                      <div>
                        <label htmlFor="contact-phone" className="block text-[14px] font-medium text-slate-700 mb-1.5">Phone Number</label>
                        <input id="contact-phone" name="phone" className="input-field" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-interest" className="block text-[14px] font-medium text-slate-700 mb-1.5">I'm Interested In</label>
                      <select id="contact-interest" name="interest" className="select-field" value={form.type} onChange={set('type')}>
                        <option value="">Select an option</option>
                        <option>Learning about funding options</option>
                        <option>Checking application status</option>
                        <option>Discussing an existing offer</option>
                        <option>General question</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-[14px] font-medium text-slate-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                      <textarea id="contact-message" name="message" className="input-field h-32 py-3 resize-none" value={form.message} onChange={set('message')} required />
                    </div>

                    <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600">
                      <input id="contact-consent" name="consent" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500" checked={form.consent} onChange={setConsent} required />
                      <span>I consent to be contacted by Elite Funding Solutions by phone, email, or text regarding this inquiry and potential business funding options. Consent is not a condition of funding. Message/data rates may apply.</span>
                    </label>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2.5" role="alert" aria-live="polite">
                        <p className="text-[13px] text-red-600">{submitError}</p>
                      </div>
                    )}

                    <button type="submit" className="btn-primary self-start" disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Message'}
                      <ArrowRight size={16} />
                    </button>

                    <p className="text-[12px] text-slate-400">Elite Funding Solutions is not a lender. Funding options are subject to review and approval by funding partners; not all applicants qualify and terms vary.</p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
