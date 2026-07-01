import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Zap, TrendingUp, Building2, Shield, Package, Clock } from 'lucide-react';

const solutions = [
  {
    icon: Zap,
    title: 'Working Capital',
    tag: 'Cash Flow',
    tagColor: 'badge-brand',
    range: '$5,000 – $1,000,000',
    bestFor: 'Businesses managing inventory, payroll, suppliers, or seasonal cash-flow timing',
    useCase: 'Inventory purchases, equipment repairs, hiring staff, covering slow seasons, marketing campaigns, or unexpected operational expenses.',
    qualifying: [
      'Minimum 3 months in business',
      'At least $10,000/month in business revenue',
      '3 months business bank statements',
      'Government-issued ID',
    ],
    description: 'Working capital options help owners access flexible business funding based on cash flow, deposits, and operating history. Structures and repayment schedules vary by funding partner, and every offer should be reviewed carefully before acceptance.',
    note: 'Subject to review and approval. Pricing and terms vary. Review all terms before accepting.',
  },
  {
    icon: TrendingUp,
    title: 'Revenue-Based Funding',
    tag: 'Flexible Repayment',
    tagColor: 'badge-success',
    range: '$10,000 – $2,000,000',
    bestFor: 'Growing businesses with strong monthly revenue',
    useCase: 'Business expansion, new location buildout, equipment acquisition, hiring, technology investments, or scaling operations.',
    qualifying: [
      'Minimum 6 months in business',
      'At least $15,000/month in revenue',
      '6 months business bank statements',
      'Business license and EIN',
    ],
    description: 'Revenue-based funding provides capital with repayment structures aligned to business revenue and performance. It can be useful for operators who want flexible capital options reviewed around real sales activity and cash flow.',
    note: 'Estimated terms only. Not all applicants qualify. Funding options may vary based on business performance.',
  },
  {
    icon: Building2,
    title: 'Business Funding',
    tag: 'Operator Capital',
    tagColor: 'badge-warning',
    range: '$5,000 – $500,000',
    bestFor: 'Owners and operators needing flexible capital for day-to-day operations or growth',
    useCase: 'Payroll, rent, utilities, supplier payments, bridging receivables gaps, tax obligations, or managing seasonal cash flow.',
    qualifying: [
      'Minimum 3 months in business',
      'At least $8,000/month in deposits',
      '3 months bank statements',
      'Valid business documentation',
    ],
    description: 'Business funding options are designed to support the everyday operational needs of growing companies. The review focuses on business performance, cash flow, and documentation so owners can compare available options clearly.',
    note: 'Subject to approval. Terms and amounts vary. Estimated funding timeline is not guaranteed.',
  },
  {
    icon: Shield,
    title: 'Fast Funding Review',
    tag: 'Guided Review',
    tagColor: 'badge-navy',
    range: '$10,000 – $500,000',
    bestFor: 'Established businesses wanting a clear path to compare available capital options',
    useCase: 'Seasonal fluctuations, unexpected expenses, growth projects, inventory timing, or ongoing project financing.',
    qualifying: [
      'Minimum 6 months in business preferred',
      'Recent business revenue activity',
      '3–6 months bank statements',
      'Personal and business credit review may apply',
    ],
    description: 'A guided funding review helps business owners understand available options, documentation needs, and next steps before accepting any offer. Terms vary by funding partner and business profile.',
    note: 'Subject to review and approval. Not all applicants qualify. Available options and terms vary.',
  },
  {
    icon: Package,
    title: 'Equipment & Expansion Capital',
    tag: 'Asset-Backed',
    tagColor: 'badge-default',
    range: '$5,000 – $1,000,000',
    bestFor: 'Businesses needing to purchase or lease equipment',
    useCase: 'Commercial vehicles, kitchen equipment, medical devices, construction machinery, manufacturing equipment, or technology systems.',
    qualifying: [
      'Equipment quote or invoice required',
      'Minimum 6 months in business',
      'Business bank statements',
      'Equipment type and value assessment',
    ],
    description: 'Equipment and expansion capital helps businesses acquire tools, vehicles, technology, or buildout resources without depleting working capital. The equipment itself often serves as collateral, which may enable more favorable terms compared to unsecured options.',
    note: 'Equipment must meet funder requirements. Subject to review. Terms and approval not guaranteed.',
  },
  {
    icon: Clock,
    title: 'Short-Term Business Funding',
    tag: '3–18 Month Terms',
    tagColor: 'badge-brand',
    range: '$5,000 – $250,000',
    bestFor: 'Businesses needing a defined repayment structure',
    useCase: 'Specific projects, marketing campaigns, seasonal inventory buildup, or bridge financing while waiting for longer-term options.',
    qualifying: [
      'Minimum 3 months in business',
      'Monthly revenue requirements vary',
      '3–6 months bank statements',
      'Basic business documentation',
    ],
    description: 'Short-term business funding provides a lump sum with defined repayment terms, typically ranging from 3 to 18 months. Fixed daily or weekly payments make cash flow planning straightforward.',
    note: 'Funding amounts and terms subject to approval. Estimated terms only. Not a guarantee of funding.',
  },
];

export default function Solutions() {
  return (
    <div className="pt-16 lg:pt-[72px]">
      {/* Page header */}
      <section className="bg-[#0B1426] py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">
            Funding Solutions
          </p>
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight mb-4 max-w-[580px]">
            Business Funding Options for Every Need
          </h1>
          <p className="text-[17px] text-slate-400 max-w-[520px] leading-relaxed mb-8">
            We work with a network of funding partners to explore options that may fit your business profile. All funding is subject to review and approval.
          </p>
          <Link to="/apply" className="btn-primary">
            Check Eligibility
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Funding Solutions */}
      <section className="section-gap bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-10">
            {solutions.map((sol, i) => (
              <div key={sol.title} className={`card p-8 lg:p-10 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left col */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-md bg-navy-900 flex items-center justify-center">
                        <sol.icon size={22} className="text-accent-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-[22px] font-bold text-navy-900">{sol.title}</h2>
                          <span className={`${sol.tagColor}`}>{sol.tag}</span>
                        </div>
                        <p className="text-[14px] text-slate-500 mt-0.5">Estimated range: {sol.range}</p>
                      </div>
                    </div>

                    <p className="text-[15px] text-slate-600 leading-relaxed mb-5">{sol.description}</p>

                    <div className="mb-5">
                      <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Best For
                      </p>
                      <p className="text-[14px] text-slate-600">{sol.bestFor}</p>
                    </div>

                    <div className="mb-5">
                      <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Common Use Cases
                      </p>
                      <p className="text-[14px] text-slate-600">{sol.useCase}</p>
                    </div>

                    <p className="text-[12px] text-slate-400 italic">{sol.note}</p>
                  </div>

                  {/* Right col */}
                  <div className="lg:border-l lg:border-slate-200 lg:pl-8">
                    <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-4">
                      General Qualifications
                    </p>
                    <ul className="flex flex-col gap-3 mb-8">
                      {sol.qualifying.map((q) => (
                        <li key={q} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                          <CheckCircle2 size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                    <Link to="/apply" className="btn-primary w-full justify-center text-[14px]">
                      Apply for This Option
                      <ArrowRight size={14} />
                    </Link>
                    <p className="text-[11px] text-slate-400 text-center mt-3">
                      Subject to review and approval
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-20 text-center">
          <h2 className="text-[32px] font-bold text-navy-900 mb-3 tracking-tight">
            Not Sure Which Option Fits?
          </h2>
          <p className="text-[17px] text-slate-500 mb-8 max-w-lg mx-auto">
            Speak with one of our funding specialists. We'll review your business profile and help you understand what options may be available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/apply" className="btn-primary">
              Start Your Application
              <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn-secondary">
              Talk to a Specialist
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
