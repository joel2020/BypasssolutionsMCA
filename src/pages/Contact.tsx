import { useState } from 'react';
import { ArrowRight, Mail, Phone, Clock, MapPin, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', type: '' });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const { error } = await supabase.from('contact_submissions').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      inquiry_type: form.type,
      message: form.message,
    });

    if (error) {
      setSubmitError('There was a problem sending your message. Please try again.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="pt-16 lg:pt-[72px]">
      {/* Header */}
      <section className="bg-[#0B1426] py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">Contact Us</p>
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight mb-4 max-w-[520px]">
            Speak With a Funding Specialist
          </h1>
          <p className="text-[17px] text-slate-400 max-w-[480px] leading-relaxed">
            Have questions about your options? Our team is here to help. All conversations are confidential.
          </p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact info */}
            <div>
              <h2 className="text-[20px] font-bold text-navy-900 mb-6">Get in Touch</h2>

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">Phone</p>
                    <a href="tel:+18005551234" className="text-[15px] text-accent-600 hover:text-accent-700 transition-colors">
                      (800) 555-1234
                    </a>
                    <p className="text-[13px] text-slate-400 mt-0.5">Toll-free</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">Email</p>
                    <a href="mailto:info@bypasssolution.com" className="text-[15px] text-accent-600 hover:text-accent-700 transition-colors">
                      info@bypasssolution.com
                    </a>
                    <p className="text-[13px] text-slate-400 mt-0.5">We respond within 1 business day</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-navy-900">Business Hours</p>
                    <p className="text-[15px] text-slate-600">Mon – Fri: 9:00 AM – 6:00 PM EST</p>
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
                <p className="text-[14px] font-semibold text-navy-900 mb-3">Ready to Apply?</p>
                <p className="text-[14px] text-slate-500 mb-4 leading-relaxed">
                  If you're ready to explore funding options, start with our simple online application.
                </p>
                <Link to="/apply" className="btn-primary w-full justify-center text-[14px]">
                  Start Application
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="card p-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-[22px] font-bold text-navy-900 mb-2">Message Received</h2>
                  <p className="text-[15px] text-slate-500">
                    Thank you for reaching out. A member of our team will respond within 1 business day.
                  </p>
                </div>
              ) : (
                <div className="card p-8">
                  <h2 className="text-[20px] font-bold text-navy-900 mb-6">Send Us a Message</h2>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Your Name <span className="text-red-500">*</span></label>
                        <input className="input-field" placeholder="John Smith" value={form.name} onChange={set('name')} required />
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Business Name</label>
                        <input className="input-field" placeholder="Your Company LLC" value={form.company} onChange={set('company')} />
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                        <input className="input-field" type="email" placeholder="john@company.com" value={form.email} onChange={set('email')} required />
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Phone Number</label>
                        <input className="input-field" type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[14px] font-medium text-slate-700 mb-1.5">I'm Interested In</label>
                      <div className="relative">
                        <select className="select-field pr-10" value={form.type} onChange={set('type')}>
                          <option value="">Select an option</option>
                          <option>Learning about funding options</option>
                          <option>Checking application status</option>
                          <option>Discussing an existing offer</option>
                          <option>General question</option>
                          <option>Other</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5L7 9L11 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                      <textarea
                        className="input-field h-32 py-3 resize-none"
                        placeholder="Tell us about your business and what you're looking for..."
                        value={form.message}
                        onChange={set('message')}
                        required
                      />
                    </div>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2.5">
                        <p className="text-[13px] text-red-600">{submitError}</p>
                      </div>
                    )}

                    <button type="submit" className="btn-primary self-start">
                      Send Message
                      <ArrowRight size={16} />
                    </button>

                    <p className="text-[12px] text-slate-400">
                      By submitting this form, you consent to being contacted by Bypass Solution regarding business funding options. We do not sell your information to third parties.
                    </p>
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
