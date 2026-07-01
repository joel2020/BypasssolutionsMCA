import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  TrendingUp,
  Users,
  FileText,
  Zap,
  Star,
  Building2,
  Briefcase,
  ClipboardCheck,
  CreditCard,
  Factory,
  Landmark,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wrench,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

const stats = [
  { label: 'Funding Options', value: '$10K–$2M', sub: 'in available working capital' },
  { label: 'Average Review', value: '24–48 hrs', sub: 'from submission to decision' },
  { label: 'Industries Served', value: '50+', sub: 'across the United States' },
  { label: 'Application', value: '5 min', sub: 'simple online process' },
];

const trustBrands = [
  'Restaurants', 'Retail', 'Trucking', 'Construction',
  'Medical Practices', 'E-commerce', 'Auto Repair', 'Beauty & Wellness',
];

const howItWorks = [
  {
    step: '01',
    title: 'Submit Your Application',
    desc: 'Complete our simple online application in about five minutes. Tell us about your business and what you need.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Upload Bank Statements',
    desc: 'Securely upload 3–6 months of business bank statements. No personal financial documents required at this stage.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Review Your Offers',
    desc: 'Our funding specialists review your application and present available funding options tailored to your business.',
    icon: TrendingUp,
  },
  {
    step: '04',
    title: 'Accept Terms & Receive Funding',
    desc: 'Review all terms carefully before accepting. Once approved and contracts are signed, funds are disbursed quickly.',
    icon: Zap,
  },
];

const solutions = [
  {
    icon: ShieldCheck,
    title: 'SBA Loan Guidance',
    desc: 'Guidance for owners exploring longer-term, government-backed business funding options.',
  },
  {
    icon: Building2,
    title: 'Commercial Real Estate',
    desc: 'Support for purchasing, improving, or refinancing business properties.',
  },
  {
    icon: ClipboardCheck,
    title: 'Term Funding',
    desc: 'Fixed-term capital options for planned growth, larger purchases, and expansion needs.',
  },
  {
    icon: Factory,
    title: 'Equipment Financing',
    desc: 'Capital options for purchasing, leasing, or upgrading essential business equipment.',
  },
  {
    icon: CreditCard,
    title: 'Business Line of Credit',
    desc: 'Revolving access to capital for ongoing expenses, projects, and unexpected needs.',
  },
  {
    icon: ReceiptText,
    title: 'Invoice Factoring',
    desc: 'Convert eligible unpaid invoices into working capital to help stabilize cash flow.',
  },
  {
    icon: Briefcase,
    title: 'Working Capital',
    desc: 'Fast, flexible funding for payroll, inventory, suppliers, marketing, and daily operations.',
  },
  {
    icon: ShoppingCart,
    title: 'Ecommerce Funding',
    desc: 'Capital solutions for online sellers, digital brands, and retail operators scaling sales.',
  },
  {
    icon: PackageCheck,
    title: 'Contractor & Gig Funding',
    desc: 'Funding options for contractors, independent operators, and project-based businesses.',
  },
  {
    icon: Landmark,
    title: 'View All Solutions',
    desc: 'Transparent, guided funding reviews to help you compare available business capital options.',
  },
];

const industries = [
  { name: 'Restaurants & Food Service', icon: Star },
  { name: 'Trucking & Transportation', icon: Truck },
  { name: 'Construction & Contractors', icon: Wrench },
  { name: 'Retail & Wholesale', icon: ShoppingBag },
  { name: 'Medical Practices', icon: Users },
  { name: 'E-commerce', icon: TrendingUp },
];

const whyUs = [
  {
    title: 'Fast Review Process',
    desc: 'Most completed applications receive a fast funding review, often within 24–48 business hours.',
  },
  {
    title: 'Multiple Funding Options',
    desc: 'We help owners compare working capital options, revenue-based funding, and flexible capital solutions through funding partners.',
  },
  {
    title: 'Dedicated Specialists',
    desc: 'A real funding specialist reviews your application and walks you through available options.',
  },
  {
    title: 'Transparent Terms',
    desc: 'We encourage business owners to review all terms carefully before accepting any offer.',
  },
  {
    title: 'No Industry Bias',
    desc: 'We work with businesses across 50+ industries, including those underserved by traditional banks.',
  },
  {
    title: 'Secure & Confidential',
    desc: 'Your business and personal information is protected with industry-standard security measures.',
  },
];

const faqs = [
  {
    q: 'How much funding can my business qualify for?',
    a: 'Funding options generally range from $10,000 to $2,000,000 depending on your monthly revenue, time in business, and other factors. Not all applicants will qualify, and terms may vary. Review all funding offers carefully before accepting.',
  },
  {
    q: 'What are the requirements to apply?',
    a: 'Most funding options require at least 3–6 months in business, a minimum monthly revenue (typically $10,000+), and 3–6 months of business bank statements. Requirements vary by funding type and partner. Subject to review and approval.',
  },
  {
    q: 'Does applying affect my credit score?',
    a: 'Our initial application process typically involves a soft inquiry, which does not affect your credit score. Some funding partners may perform a hard inquiry as part of their underwriting process. This will be disclosed before any hard pull occurs.',
  },
  {
    q: 'How long does funding take?',
    a: 'After submitting your application and required documents, most businesses receive a decision within 24–48 business hours. Funding timelines vary by product and funding partner. Estimated terms only — not a guarantee.',
  },
  {
    q: 'Is Bypass Solution a direct lender?',
    a: 'Bypass Solution is not a lender. We connect business owners with funding options through our network of funding partners. We do not guarantee approval or specific funding amounts. All funding is subject to review and approval by individual funding partners.',
  },
  {
    q: 'What documents will I need to submit?',
    a: 'Typically required documents include 3–6 months of business bank statements, a voided business check, a government-issued ID, and basic business documentation. Additional documents may be requested depending on the funding option.',
  },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-none">
      <button
        className="flex items-center justify-between w-full py-5 text-left gap-4"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[16px] font-semibold text-slate-900">{q}</span>
        {open ? (
          <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-[15px] text-slate-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="pt-0">
      {/* Hero */}
      <section className="relative bg-[#0B1426] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-[#0B1C3F] to-[#0a1520]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-accent-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent-500/5 blur-[80px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-28">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-2 bg-white/10 text-accent-300 text-[13px] font-medium px-4 py-2 rounded-full mb-8 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400"></span>
              Business Funding Specialists — Subject to Approval
            </div>

            <h1 className="text-[44px] lg:text-[60px] font-bold text-white leading-[1.1] tracking-tight mb-6">
              Working Capital Built for{' '}
              <span className="text-accent-400">Business Owners</span>{' '}
              Who Move Fast.
            </h1>

            <p className="text-[18px] text-slate-300 leading-relaxed mb-10 max-w-[580px]">
              Bypass Solution helps small businesses explore fast, flexible funding options without waiting weeks for traditional bank approvals. Subject to review and approval.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/apply" className="btn-primary text-[16px] h-12 px-8">
                Check Eligibility
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white/10 text-white text-[16px] font-semibold border border-white/20 rounded-md hover:bg-white/15 transition-all"
              >
                Speak With a Specialist
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-5 mt-10 text-[13px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-green-400" />
                No obligation to accept
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-green-400" />
                Secure 256-bit encrypted application
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-green-400" />
                Review all terms before accepting
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`py-7 px-4 lg:px-8 ${i > 0 ? 'border-l border-white/10' : ''}`}
                >
                  <div className="text-[26px] lg:text-[30px] font-bold text-white mb-0.5">
                    {stat.value}
                  </div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-accent-400 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-[13px] text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-slate-50 border-b border-slate-200 py-5">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              Industries We Serve
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {trustBrands.map((b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[13px] font-medium text-slate-600"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Simple Process</p>
            <h2 className="text-h2 text-navy-900 mb-4">
              Four Steps to Explore Your Options
            </h2>
            <p className="text-[17px] text-slate-500 max-w-xl mx-auto">
              We've simplified the process so you can focus on running your business, not filling out paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={step.step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%+12px)] w-[calc(100%-24px)] h-px bg-slate-200 z-0" />
                )}
                <div className="card p-7 h-full relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-md bg-accent-50 flex items-center justify-center">
                      <step.icon size={20} className="text-accent-600" />
                    </div>
                    <span className="text-[13px] font-bold text-slate-200">{step.step}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-navy-900 mb-2">{step.title}</h3>
                  <p className="text-[14px] text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <Link to="/how-it-works" className="btn-secondary">
              Learn More About the Process
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Funding Solutions */}
      <section className="section-gap bg-slate-50">
        <div className="page-container">
          <div className="mx-auto max-w-[1040px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-accent-50/60 px-6 py-7 lg:px-9">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="section-label mb-3">Funding Solutions</p>
                  <h2 className="text-h2 text-navy-900 mb-3">
                    Funding Options Built for Bypass Solution Clients
                  </h2>
                  <p className="max-w-[680px] text-[16px] leading-relaxed text-slate-500">
                    Compare practical capital options for growth, cash flow, equipment, invoices, and online sales with guidance from a Bypass Solution funding specialist.
                  </p>
                </div>
                <Link to="/apply" className="btn-primary w-fit flex-shrink-0">
                  Start Funding Review
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-2 p-5 md:grid-cols-2 lg:p-8">
              {solutions.map((solution) => {
                const Icon = solution.icon;

                return (
                  <Link
                    key={solution.title}
                    to="/solutions"
                    className="group flex gap-4 rounded-2xl border border-transparent p-4 transition-all hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2"
                  >
                    <span className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-900 ring-1 ring-navy-100 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                      <Icon size={19} />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 text-[16px] font-bold text-navy-900">
                        {solution.title}
                        <ArrowRight size={14} className="opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                      </span>
                      <span className="mt-1 block text-[14px] leading-relaxed text-slate-500">
                        {solution.desc}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-9">
              <p className="max-w-[620px] text-[14px] leading-relaxed text-slate-600">
                Not sure which option fits? We review your business profile and help you understand available funding paths. Funding is subject to approval and terms may vary.
              </p>
              <Link to="/solutions" className="btn-secondary w-fit flex-shrink-0">
                View All Solutions
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-label mb-3">Industries Served</p>
              <h2 className="text-h2 text-navy-900 mb-5">
                Capital for Businesses Across Every Sector
              </h2>
              <p className="text-[17px] text-slate-500 leading-relaxed mb-8">
                Traditional banks often turn away small businesses. We work with funding partners who understand the nuances of different industries and can review your application accordingly.
              </p>
              <Link to="/industries" className="btn-primary">
                See All Industries
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {industries.map((ind) => (
                <div key={ind.name} className="card-hover p-5 cursor-pointer">
                  <div className="w-9 h-9 rounded-md bg-accent-50 flex items-center justify-center mb-3">
                    <ind.icon size={17} className="text-accent-600" />
                  </div>
                  <p className="text-[14px] font-semibold text-navy-900">{ind.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Bypass Solution */}
      <section className="section-gap bg-[#0B1426]">
        <div className="page-container">
          <div className="text-center mb-14">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-3">
              Why Choose Us
            </p>
            <h2 className="text-h2 text-white mb-4">
              Why Business Owners Work With Bypass Solution
            </h2>
            <p className="text-[17px] text-slate-400 max-w-xl mx-auto">
              We're not a bank. We're funding specialists who work for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyUs.map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-lg p-7 hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 rounded-sm bg-accent-600/20 flex items-center justify-center mb-4">
                  <CheckCircle2 size={16} className="text-accent-400" />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-[14px] text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-[22px] font-bold text-white mb-1">
                Ready to explore your options?
              </h3>
              <p className="text-slate-400 text-[15px]">
                Complete a simple application in minutes. No obligation to accept any offer.
              </p>
            </div>
            <Link to="/apply" className="btn-primary flex-shrink-0 text-[15px]">
              Check Eligibility Now
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="max-w-[720px] mx-auto">
            <div className="text-center mb-12">
              <p className="section-label mb-3">Common Questions</p>
              <h2 className="text-h2 text-navy-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-[17px] text-slate-500">
                Transparent answers to questions we hear most from business owners.
              </p>
            </div>

            <div>
              {faqs.map((faq) => (
                <FAQ key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-20 text-center">
          <p className="section-label mb-3">Get Started Today</p>
          <h2 className="text-[36px] font-bold text-navy-900 mb-4 tracking-tight">
            Your Business Funding Specialists
          </h2>
          <p className="text-[17px] text-slate-500 max-w-lg mx-auto mb-8">
            Complete a simple application and our team will review your business profile and present available funding options. Subject to review and approval.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/apply" className="btn-primary text-[15px] h-12 px-8">
              Start Your Application
              <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn-secondary h-12 px-8 text-[15px]">
              Speak With a Specialist
            </Link>
          </div>
          <p className="text-[13px] text-slate-400 mt-5">
            Subject to review and approval. Not all applicants qualify. Review all funding terms before accepting an offer.
          </p>
        </div>
      </section>
    </div>
  );
}
