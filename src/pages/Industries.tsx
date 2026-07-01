import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const industries = [
  {
    name: 'Restaurants & Food Service',
    emoji: '🍽',
    tagline: 'Keep your kitchen and crew running.',
    description: 'Restaurants face tight margins, seasonal fluctuations, and unpredictable costs. Working capital can help cover food inventory, equipment repairs, payroll during slow periods, or marketing to drive foot traffic.',
    commonUses: ['Inventory and supply restocking', 'Kitchen equipment repair or replacement', 'Hiring and payroll coverage', 'POS system upgrades', 'Marketing and promotional campaigns'],
    challenge: 'Thin margins and variable revenue make traditional lending difficult.',
  },
  {
    name: 'Trucking & Transportation',
    emoji: '🚛',
    tagline: 'Keep your fleet on the road.',
    description: 'Fuel costs, maintenance, compliance requirements, and equipment purchases create ongoing capital needs for trucking companies. Explore funding options designed around your revenue cycle.',
    commonUses: ['Fleet maintenance and repairs', 'Fuel and operating expenses', 'New vehicle acquisition', 'DOT compliance costs', 'Dispatch and technology upgrades'],
    challenge: 'Long invoice payment cycles create working capital gaps.',
  },
  {
    name: 'Construction & Contractors',
    emoji: '🏗',
    tagline: 'Fund your projects from day one.',
    description: 'Construction businesses often wait 30–90 days for project payments. Working capital can bridge that gap, cover materials, or fund new project startups before receivables come in.',
    commonUses: ['Materials and supplies purchasing', 'Equipment acquisition or rental', 'Payroll for project crews', 'Bid bonding and insurance', 'New project startup costs'],
    challenge: 'Project-based income creates significant cash flow gaps.',
  },
  {
    name: 'Retail & Wholesale',
    emoji: '🛍',
    tagline: 'Stock up for every season.',
    description: 'Retail businesses need capital for inventory, especially before peak seasons. Revenue-based funding tied to your sales performance can align repayment with your revenue cycles.',
    commonUses: ['Seasonal inventory purchases', 'Store renovations and upgrades', 'E-commerce platform development', 'Marketing and advertising', 'Expansion to new locations'],
    challenge: 'Seasonal demand spikes require capital well before revenue arrives.',
  },
  {
    name: 'Medical & Healthcare Practices',
    emoji: '🏥',
    tagline: 'Focus on patients, not cash flow.',
    description: 'Healthcare practices deal with delayed insurance reimbursements, expensive equipment needs, and staffing costs. Explore funding options that work with your practice revenue profile.',
    commonUses: ['Medical equipment purchases', 'Staff hiring and training', 'Office expansion or renovation', 'EHR and technology upgrades', 'Insurance billing systems'],
    challenge: 'Insurance reimbursement delays create persistent cash flow pressure.',
  },
  {
    name: 'E-commerce Businesses',
    emoji: '💻',
    tagline: 'Scale your online business.',
    description: 'E-commerce businesses grow fast — and need capital to keep pace. From inventory to advertising, explore funding options based on your online revenue performance.',
    commonUses: ['Inventory scaling for growth', 'Digital marketing and advertising', 'Platform and technology upgrades', 'Shipping and fulfillment improvements', 'Product development and launches'],
    challenge: 'Fast growth requires capital that scales with revenue.',
  },
  {
    name: 'Auto Repair & Dealerships',
    emoji: '🔧',
    tagline: 'Grow your shop with working capital.',
    description: 'Auto repair shops and dealerships have ongoing equipment costs, parts inventory needs, and staffing requirements. Access capital to expand your bay capacity or maintain inventory.',
    commonUses: ['Diagnostic equipment upgrades', 'Parts inventory stocking', 'Shop expansion or renovation', 'Staff hiring and training', 'Marketing and customer acquisition'],
    challenge: 'Equipment-heavy operations require consistent capital access.',
  },
  {
    name: 'Beauty & Wellness',
    emoji: '💅',
    tagline: 'Invest in your space and services.',
    description: 'Salons, spas, and wellness studios can use working capital to upgrade equipment, renovate spaces, hire staff, or build out new service offerings to grow their client base.',
    commonUses: ['Salon or spa equipment upgrades', 'Interior renovation and build-out', 'Product and supply inventory', 'Staff expansion and training', 'Marketing and loyalty programs'],
    challenge: 'Appointment-based revenue can create unpredictable monthly income.',
  },
  {
    name: 'Professional Services',
    emoji: '💼',
    tagline: 'Grow your firm with strategic capital.',
    description: 'Law firms, accounting practices, consulting agencies, and other professional service businesses may need capital for staff growth, technology, or office expansion.',
    commonUses: ['Technology and software upgrades', 'Office expansion or relocation', 'Hiring and team growth', 'Marketing and business development', 'Continuing education and certifications'],
    challenge: 'Project billing cycles can create income gaps in service businesses.',
  },
];

export default function Industries() {
  return (
    <div className="pt-16 lg:pt-[72px]">
      {/* Header */}
      <section className="bg-[#0B1426] py-20">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-4">
            Industries We Serve
          </p>
          <h1 className="text-[42px] font-bold text-white leading-tight tracking-tight mb-4 max-w-[600px]">
            Funding Options for Small Businesses in Every Sector
          </h1>
          <p className="text-[17px] text-slate-400 max-w-[520px] leading-relaxed mb-8">
            Traditional banks often overlook small businesses in specialized industries. We work with funding partners who understand your sector and can review your unique profile.
          </p>
          <Link to="/apply" className="btn-primary">
            Check Eligibility
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Industries grid intro */}
      <section className="bg-slate-50 border-b border-slate-200 py-8">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {industries.map((ind) => (
              <a
                key={ind.name}
                href={`#${ind.name.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-md text-[13px] font-medium text-slate-700 hover:border-accent-300 hover:text-accent-700 transition-colors"
              >
                {ind.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Industry cards */}
      <section className="section-gap bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-8">
            {industries.map((ind) => (
              <div
                key={ind.name}
                id={ind.name.toLowerCase().replace(/[^a-z]+/g, '-')}
                className="card p-8 lg:p-10"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{ind.emoji}</span>
                      <div>
                        <h2 className="text-[22px] font-bold text-navy-900">{ind.name}</h2>
                        <p className="text-[14px] text-accent-600 font-medium">{ind.tagline}</p>
                      </div>
                    </div>
                    <p className="text-[15px] text-slate-600 leading-relaxed mb-4">
                      {ind.description}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                      <p className="text-[13px] text-amber-700 font-medium">
                        Common Challenge: {ind.challenge}
                      </p>
                    </div>
                  </div>

                  <div className="border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
                    <p className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-4">
                      Common Uses for Funding
                    </p>
                    <ul className="flex flex-col gap-2.5 mb-8">
                      {ind.commonUses.map((use) => (
                        <li key={use} className="flex items-start gap-2 text-[14px] text-slate-600">
                          <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                          {use}
                        </li>
                      ))}
                    </ul>
                    <Link to="/apply" className="btn-primary w-full justify-center text-[14px]">
                      Explore Options
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer + CTA */}
      <section className="bg-[#0B1426]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-20 text-center">
          <h2 className="text-[30px] font-bold text-white mb-3 tracking-tight">
            Don't See Your Industry?
          </h2>
          <p className="text-[17px] text-slate-400 mb-8 max-w-lg mx-auto">
            We work with businesses across dozens of industries. Speak with a funding specialist to discuss your specific situation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/apply" className="btn-primary">
              Start Your Application
              <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-white/10 text-white text-[15px] font-semibold border border-white/20 rounded-md hover:bg-white/15 transition-all">
              Contact Us
            </Link>
          </div>
          <p className="text-[12px] text-slate-500 mt-6">
            Subject to review and approval. Not all applicants qualify. Funding options may vary by industry.
          </p>
        </div>
      </section>
    </div>
  );
}
