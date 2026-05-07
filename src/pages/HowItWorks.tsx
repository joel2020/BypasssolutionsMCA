import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Upload, CheckSquare, DollarSign, Clock, Shield, Users, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: FileText,
    title: 'Apply Online',
    time: 'Takes about 5 minutes',
    description: 'Complete our secure online application with basic information about your business. You\'ll provide details about your business type, monthly revenue, time in business, and the funding amount you\'re looking to explore.',
    details: [
      'Business name, type, and industry',
      'Monthly revenue and time in business',
      'Requested funding amount and use of funds',
      'Owner contact and personal information',
    ],
    note: 'Your application is reviewed by a real funding specialist — not just an algorithm.',
  },
  {
    step: '02',
    icon: Upload,
    title: 'Upload Bank Statements',
    time: 'Secure document portal',
    description: 'Upload 3–6 months of your business bank statements through our secure document portal. This gives our funding partners visibility into your business cash flow and helps identify the options that may be available to you.',
    details: [
      '3–6 months business bank statements',
      'Voided business check',
      'Government-issued ID',
      'Additional business documents as requested',
    ],
    note: 'All documents are encrypted and handled with strict confidentiality.',
  },
  {
    step: '03',
    icon: CheckSquare,
    title: 'Review Available Offers',
    time: 'Typically 24–48 business hours',
    description: 'Your application is reviewed by our funding specialists and submitted to relevant funding partners in our network. When offers are available, your specialist will walk you through each option — explaining terms, rates, and repayment structure.',
    details: [
      'Multiple funding offers when available',
      'Clear explanation of all terms and rates',
      'Side-by-side comparison of options',
      'No obligation to accept any offer',
    ],
    note: 'Estimated review timeline. Not all applicants will receive offers. Funding options may vary.',
  },
  {
    step: '04',
    icon: DollarSign,
    title: 'Accept Terms & Receive Funding',
    time: 'After contract execution',
    description: 'Once you\'ve reviewed all terms and decided to move forward, you\'ll complete the contract signing process. After contracts are executed and any final requirements are met, funds are disbursed according to the funding partner\'s timeline.',
    details: [
      'Review all contract terms carefully',
      'Electronic signature process',
      'Final document verification',
      'Funds disbursed per funder timeline',
    ],
    note: 'Always review all terms before accepting. Estimated terms only. Not a guarantee of funding.',
  },
];

const requirements = [
  {
    icon: Clock,
    title: 'Time in Business',
    desc: 'Most funding options require at least 3–6 months of active business operations.',
  },
  {
    icon: DollarSign,
    title: 'Monthly Revenue',
    desc: 'Minimum monthly revenue requirements typically range from $8,000–$20,000 depending on the product.',
  },
  {
    icon: FileText,
    title: 'Bank Statements',
    desc: '3–6 months of business bank statements are required to verify revenue and cash flow.',
  },
  {
    icon: Shield,
    title: 'Valid Documentation',
    desc: 'A government-issued ID, voided business check, and basic business documentation are standard requirements.',
  },
  {
    icon: Users,
    title: 'Active Business',
    desc: 'Your business must be actively operating and generating revenue. Startups are generally not eligible.',
  },
  {
    icon: CheckSquare,
    title: 'Credit Review',
    desc: 'A credit review may be part of the underwriting process. Requirements vary by funding option.',
  },
];

export default function HowItWorks() {
  return (
    <div className="pt-16 lg:pt-[72px]">
      {/* Header */}
      <section className="bg-[#0B1426] py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">
            Simple Process
          </p>
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight mb-4 max-w-[580px]">
            How Bypass Solution Works
          </h1>
          <p className="text-[17px] text-slate-400 max-w-[520px] leading-relaxed mb-8">
            A straightforward, transparent process designed to get you from application to funding decision as efficiently as possible.
          </p>
          <Link to="/apply" className="btn-primary">
            Start Your Application
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="section-gap bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-8">
            {steps.map((step, i) => (
              <div key={step.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[55px] top-full h-8 w-px bg-slate-200 z-0 hidden lg:block" />
                )}
                <div className="card p-8 lg:p-10">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-[52px] h-[52px] rounded-full bg-navy-900 flex items-center justify-center flex-shrink-0">
                          <step.icon size={22} className="text-accent-400" />
                        </div>
                        <div>
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                            Step {step.step}
                          </span>
                          <h2 className="text-[22px] font-bold text-navy-900">{step.title}</h2>
                        </div>
                        <span className="ml-auto badge-default text-[11px] hidden sm:inline-flex">
                          {step.time}
                        </span>
                      </div>

                      <p className="text-[15px] text-slate-600 leading-relaxed mb-5">
                        {step.description}
                      </p>

                      <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
                        <p className="text-[12px] text-slate-500 italic">{step.note}</p>
                      </div>
                    </div>

                    <div className="lg:border-l lg:border-slate-200 lg:pl-8">
                      <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-3">
                        What's Needed
                      </p>
                      <ul className="flex flex-col gap-2.5">
                        {step.details.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-[14px] text-slate-600">
                            <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <Link to="/apply" className="btn-primary text-[15px] h-12 px-8">
              Start Your Application
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* General requirements */}
      <section className="section-gap bg-slate-50">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-3">General Requirements</p>
            <h2 className="text-h2 text-navy-900 mb-4">
              What Most Funding Options Require
            </h2>
            <p className="text-[17px] text-slate-500 max-w-xl mx-auto">
              Requirements vary by funding type and partner. These are general guidelines — not all applicants will qualify.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {requirements.map((req) => (
              <div key={req.title} className="card p-6">
                <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center mb-4">
                  <req.icon size={18} className="text-accent-600" />
                </div>
                <h3 className="text-[15px] font-semibold text-navy-900 mb-1.5">{req.title}</h3>
                <p className="text-[14px] text-slate-500 leading-relaxed">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ teaser / CTA */}
      <section className="bg-[#0B1426]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-[32px] font-bold text-white mb-4 tracking-tight">
                Ready to Explore Your Funding Options?
              </h2>
              <p className="text-[16px] text-slate-400 leading-relaxed mb-6">
                Complete our simple application in about 5 minutes. A funding specialist will review your information and reach out to discuss available options. No obligation to accept any offer.
              </p>
              <div className="flex items-center gap-4">
                <Link to="/apply" className="btn-primary">
                  Check Eligibility
                  <ArrowRight size={16} />
                </Link>
                <Link to="/contact" className="text-accent-400 hover:text-accent-300 text-[15px] font-medium transition-colors">
                  Ask a Question
                </Link>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-7">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Important Disclosures
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  'All funding is subject to review and approval.',
                  'Not all applicants will qualify for funding.',
                  'Funding amounts and terms may vary.',
                  'Review all terms carefully before accepting any offer.',
                  'Bypass Solution is not a lender.',
                  'Estimated timelines are not guarantees.',
                ].map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-[14px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-2 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
