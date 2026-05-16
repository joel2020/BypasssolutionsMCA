import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';

const stats = [
  { label: 'Funding Range', value: '$10K-$5M', sub: 'across partner options' },
  { label: 'Review Window', value: '24-72 hrs', sub: 'after a complete file' },
  { label: 'Industries Served', value: '50+', sub: 'across the United States' },
  { label: 'First Step', value: '2 min', sub: 'low-friction fit check' },
];

const industriesServed = [
  'Restaurants', 'Retail', 'Trucking', 'Construction',
  'Medical Practices', 'E-commerce', 'Auto Repair', 'Beauty & Wellness',
];

const howItWorks = [
  {
    step: '01',
    title: 'Check Funding Fit',
    desc: 'Start with a light advisor review that does not ask for SSN, EIN, bank statements, routing numbers, or account numbers.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Apply Securely',
    desc: 'When ready, complete the secure application and upload at least three business bank statements for underwriting.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Review Your Options',
    desc: 'An advisor reviews your file and helps compare eligible working capital, revenue-based, credit, SBA, equipment, invoice, or real estate options.',
    icon: TrendingUp,
  },
  {
    step: '04',
    title: 'Accept Terms Carefully',
    desc: 'Review all terms before accepting. Funding is subject to partner approval, signed agreements, and final verification.',
    icon: Zap,
  },
];

const solutions = [
  {
    icon: Zap,
    title: 'Working Capital',
    desc: 'Capital for inventory, payroll, supplier payments, marketing, or seasonal timing gaps.',
    tag: 'Cash Flow',
  },
  {
    icon: TrendingUp,
    title: 'Revenue-Based Financing',
    desc: 'Flexible funding options reviewed around deposits, revenue trends, and business performance.',
    tag: 'MCA/RBF',
  },
  {
    icon: Building2,
    title: 'Lines, SBA, and CRE',
    desc: 'Advisor-led comparison for credit lines, SBA options, and commercial real estate funding.',
    tag: 'Structured',
  },
  {
    icon: Shield,
    title: 'Equipment and Expansion',
    desc: 'Funding for equipment, buildouts, additional locations, and growth projects.',
    tag: 'Growth',
  },
];

const industryCards = [
  { name: 'Restaurants & Food Service', icon: Star },
  { name: 'Trucking & Transportation', icon: Truck },
  { name: 'Construction & Contractors', icon: Wrench },
  { name: 'Retail & Wholesale', icon: ShoppingBag },
  { name: 'Medical Practices', icon: Users },
  { name: 'E-commerce', icon: TrendingUp },
];

const trustItems = [
  {
    title: 'Secure application',
    desc: 'Sensitive identifiers are masked before submission until encrypted full-identifier storage is implemented.',
  },
  {
    title: 'No obligation',
    desc: 'Checking fit or submitting an application does not require accepting any offer.',
  },
  {
    title: 'Advisor-led review',
    desc: 'A funding advisor reviews the file and helps compare products by use case, timeline, and cost.',
  },
  {
    title: 'Complete-file review',
    desc: 'Most complete files are reviewed within 24-72 business hours, subject to partner workflow.',
  },
  {
    title: 'Required documents',
    desc: 'Full review requires at least three bank statements plus identity verification documentation.',
  },
  {
    title: 'Commercial marketplace',
    desc: 'Elite Funding Solutions is not a bank or direct lender. Funding partners make approval decisions.',
  },
];

const faqs = [
  {
    q: 'How much funding can my business qualify for?',
    a: 'Funding options generally range from $10,000 to $5,000,000 depending on monthly revenue, time in business, product fit, and underwriting factors. Not all applicants qualify.',
  },
  {
    q: 'What are the requirements to apply?',
    a: 'Most funding options require operating history, monthly revenue, business bank statements, ownership information, and signed authorization. Requirements vary by product and partner.',
  },
  {
    q: 'Does the fit check collect sensitive information?',
    a: 'No. The Funding Fit Check does not collect SSN, EIN, bank statements, routing number, or account number.',
  },
  {
    q: 'How long does review take?',
    a: 'After submitting a complete application and required documents, many businesses receive review feedback within 24-72 business hours. Timelines vary by product and funding partner.',
  },
  {
    q: 'Is Elite Funding Solutions a direct lender?',
    a: 'No. Elite Funding Solutions is a commercial funding marketplace that connects business owners with funding partners. Approval, amounts, terms, and rates are not guaranteed.',
  },
  {
    q: 'What documents will I need?',
    a: 'Full application review typically requires at least three business bank statements and a government-issued ID. Additional documents may be requested by product or partner.',
  },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-none">
      <button className="flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="text-[16px] font-semibold text-slate-900">{q}</span>
        {open ? <ChevronUp size={18} className="flex-shrink-0 text-slate-400" /> : <ChevronDown size={18} className="flex-shrink-0 text-slate-400" />}
      </button>
      {open && <p className="pb-5 text-[15px] leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className="pt-0 overflow-x-hidden">
      <section className="relative overflow-hidden bg-[#0B1426]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-[#0B1C3F] to-[#0a1520]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-5 pt-32 pb-16 sm:px-6 lg:px-8 lg:pt-40 lg:pb-24">
          <div className="max-w-[760px]">
            <div className="mb-8 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[13px] font-medium text-accent-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Fast, flexible capital for serious operators
            </div>

            <h1 className="mb-6 text-[42px] font-bold leading-[1.1] tracking-tight text-white sm:text-[50px] lg:text-[60px]">
              Business Funding From $10K to $5M
            </h1>

            <p className="mb-10 max-w-[680px] text-[18px] leading-relaxed text-slate-300">
              Compare working capital, revenue-based financing, lines of credit, equipment financing, SBA options, invoice factoring, and commercial real estate funding through a secure advisor-led process.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/funding-fit-check" className="btn-primary h-12 px-8 text-[16px]">
                Check Funding Fit
                <ArrowRight size={18} />
              </Link>
              <Link to="/apply" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-8 text-[16px] font-semibold text-white transition-all hover:bg-white/15">
                Apply Securely
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-5 text-[13px] text-slate-400">
              {['No obligation', 'Secure application', 'Advisor-led review', 'Commercial marketplace, not a bank'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <div key={stat.label} className={`min-w-0 py-7 px-3 sm:px-4 lg:px-8 ${i > 0 ? 'border-l border-white/10' : ''}`}>
                  <div className="mb-0.5 text-[24px] font-bold text-white lg:text-[30px]">{stat.value}</div>
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-accent-400">{stat.label}</div>
                  <div className="text-[13px] text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-5">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Industries Served</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {industriesServed.map((industry) => (
                <span key={industry} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600">{industry}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Simple Process</p>
            <h2 className="text-h2 mb-4 text-navy-900">Start light. Submit a complete file when ready.</h2>
            <p className="mx-auto max-w-xl text-[17px] text-slate-500">The fit check keeps friction low. The secure application collects the documents and authorizations needed for a serious funding review.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step) => (
              <div key={step.step} className="card p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-50">
                    <step.icon size={20} className="text-accent-600" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-200">{step.step}</span>
                </div>
                <h3 className="mb-2 text-[16px] font-semibold text-navy-900">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-gap bg-slate-50">
        <div className="page-container">
          <div className="mb-14 text-center">
            <p className="section-label mb-3">Funding Options</p>
            <h2 className="text-h2 mb-4 text-navy-900">Funding products matched to the use case</h2>
            <p className="mx-auto max-w-xl text-[17px] text-slate-500">A business owner should not be forced into one product. Compare the options that fit revenue, timing, collateral, and documentation.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {solutions.map((solution) => (
              <div key={solution.title} className="card-hover p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-navy-900">
                    <solution.icon size={20} className="text-accent-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="text-[17px] font-semibold text-navy-900">{solution.title}</h3>
                      <span className="badge-brand text-[11px]">{solution.tag}</span>
                    </div>
                    <p className="text-[14px] leading-relaxed text-slate-500">{solution.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="section-label mb-3">Trust and Compliance</p>
              <h2 className="text-h2 mb-5 text-navy-900">Built for business owners submitting sensitive funding information</h2>
              <p className="mb-8 text-[17px] leading-relaxed text-slate-500">Clear requirements, visible contact options, commercial funding disclosures, and a document checklist reduce uncertainty before a business owner commits to a full application.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/funding-fit-check" className="btn-primary">Check Funding Fit <ArrowRight size={16} /></Link>
                <Link to="/disclosure" className="btn-secondary">Read Disclosures</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-200 p-5">
                  <CheckCircle2 size={18} className="mb-3 text-accent-600" />
                  <h3 className="mb-2 text-[15px] font-bold text-navy-900">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-gap bg-[#0B1426]">
        <div className="page-container">
          <div className="mb-14 text-center">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400">Industries Served</p>
            <h2 className="text-h2 mb-4 text-white">Capital for operators across major sectors</h2>
            <p className="mx-auto max-w-xl text-[17px] text-slate-400">Revenue cycles, margins, and documentation look different by industry. The advisor-led process accounts for that context.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {industryCards.map((industry) => (
              <div key={industry.name} className="rounded-lg border border-white/10 bg-white/5 p-6">
                <industry.icon size={19} className="mb-4 text-accent-400" />
                <h3 className="text-[16px] font-semibold text-white">{industry.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="page-container">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-12 text-center">
              <p className="section-label mb-3">Common Questions</p>
              <h2 className="text-h2 mb-4 text-navy-900">What business owners ask first</h2>
              <p className="text-[17px] text-slate-500">Transparent answers before a business owner shares sensitive documents.</p>
            </div>

            <div>
              {faqs.map((faq) => <FAQ key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1200px] px-5 py-20 text-center sm:px-6 lg:px-8">
          <p className="section-label mb-3">Get Started Today</p>
          <h2 className="mb-4 text-[36px] font-bold tracking-tight text-navy-900">Start with the right funding path</h2>
          <p className="mx-auto mb-8 max-w-lg text-[17px] text-slate-500">Check fit first, or submit a secure application with required documents when you are ready for full review.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/funding-fit-check" className="btn-primary h-12 px-8 text-[15px]">Check Funding Fit <ArrowRight size={16} /></Link>
            <Link to="/apply" className="btn-secondary h-12 px-8 text-[15px]">Apply Securely</Link>
          </div>
          <p className="mt-5 text-[13px] text-slate-400">Subject to review and approval. Not all applicants qualify. Review all funding terms before accepting an offer.</p>
        </div>
      </section>
    </div>
  );
}
