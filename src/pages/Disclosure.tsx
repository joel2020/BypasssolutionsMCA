import { Link } from 'react-router-dom';
import { AlertTriangle, Shield, FileText } from 'lucide-react';

export default function Disclosure() {
  return (
    <div className="pt-16 lg:pt-[72px]">
      <section className="bg-[#0B1426] py-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-accent-400 mb-3">Legal</p>
          <h1 className="text-[38px] font-bold text-white tracking-tight mb-2">Funding Disclosure</h1>
          <p className="text-slate-400 text-[15px]">Important information about business funding options offered through our platform</p>
        </div>
      </section>

      <section className="section-gap bg-white">
        <div className="max-w-[860px] mx-auto px-6 lg:px-8">

          {/* Warning box */}
          <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-lg p-6 mb-10">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[15px] font-semibold text-amber-800 mb-1">Important Notice</p>
              <p className="text-[14px] text-amber-700 leading-relaxed">
                All funding products available through Bypass Solution are subject to review and approval by individual funding partners. Not all applicants will qualify. Review all funding terms carefully before accepting any offer. This disclosure does not constitute an offer to provide funding.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-8">

            <div className="card p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center">
                  <Shield size={18} className="text-accent-600" />
                </div>
                <h2 className="text-[18px] font-bold text-navy-900">About Bypass Solution</h2>
              </div>
              <p className="text-[15px] text-slate-600 leading-relaxed">
                Bypass Solution is a business funding marketplace, not a lender. We connect small business owners with a network of funding partners who may offer various business financing products, including merchant cash advances, revenue-based financing, working capital, business lines of credit, and equipment financing.
              </p>
              <p className="text-[15px] text-slate-600 leading-relaxed mt-3">
                Bypass Solution does not make lending decisions. All funding decisions are made exclusively by individual funding partners based on their own underwriting criteria. Bypass Solution may receive compensation from funding partners when a business owner accepts a funding offer.
              </p>
            </div>

            <div className="card p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-accent-50 flex items-center justify-center">
                  <FileText size={18} className="text-accent-600" />
                </div>
                <h2 className="text-[18px] font-bold text-navy-900">Merchant Cash Advance Disclosure</h2>
              </div>
              <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                A merchant cash advance (MCA) is not a loan. It is a purchase of a portion of your future business revenue at a discount. Key characteristics include:
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Repayment is structured as a percentage of daily or weekly revenue, not fixed monthly payments.',
                  'The total amount repaid (payback amount) is determined by a factor rate, not an interest rate.',
                  'The effective cost of capital can be significantly higher than traditional bank financing.',
                  'MCA agreements are typically not subject to usury laws applicable to traditional loans.',
                  'Early repayment does not reduce the total payback amount in most cases.',
                  'Funding amounts and factor rates vary based on your business profile and the funding partner.',
                  'Subject to approval. Terms are estimated only and not guaranteed.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-7">
              <h2 className="text-[18px] font-bold text-navy-900 mb-4">Revenue-Based Financing Disclosure</h2>
              <p className="text-[15px] text-slate-600 leading-relaxed mb-3">
                Revenue-based financing (RBF) involves receiving capital in exchange for a percentage of future revenue until a predetermined amount is repaid. Key disclosures:
              </p>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Repayment is tied to a fixed percentage of your monthly revenue.',
                  'Repayment period varies with business performance — longer if revenue declines, shorter if revenue grows.',
                  'Factor rates and caps are determined by individual funding partners.',
                  'Estimated terms are provided for illustration purposes only.',
                  'Subject to review and approval. Not all applicants qualify.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-7">
              <h2 className="text-[18px] font-bold text-navy-900 mb-4">General Funding Disclosures</h2>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'No Guarantee of Funding', desc: 'Submitting an application does not guarantee that you will receive a funding offer. All funding is subject to review and approval.' },
                  { label: 'Funding Amounts May Vary', desc: 'The funding amount you receive may differ from what you requested based on your business profile and funder criteria.' },
                  { label: 'Estimated Terms', desc: 'Any terms, rates, or amounts shown on our website or discussed with a specialist are estimates only and not binding commitments.' },
                  { label: 'Credit Impact', desc: 'Some funding partners may perform hard credit inquiries, which can affect your credit score. You will be informed before any hard pull is conducted.' },
                  { label: 'Multiple Offers', desc: 'You may receive offers from more than one funding partner. You are not obligated to accept any offer.' },
                  { label: 'Review All Terms', desc: 'You are strongly encouraged to review all funding terms, contracts, and agreements with a qualified advisor before accepting any offer.' },
                  { label: 'Prepayment', desc: 'Prepayment terms vary by funding product and partner. Review prepayment provisions carefully in any contract.' },
                ].map((item) => (
                  <div key={item.label} className="border-b border-slate-100 last:border-none pb-3 last:pb-0">
                    <p className="text-[14px] font-semibold text-navy-900 mb-1">{item.label}</p>
                    <p className="text-[14px] text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-7">
              <h2 className="text-[18px] font-bold text-navy-900 mb-3">Questions</h2>
              <p className="text-[15px] text-slate-600 leading-relaxed mb-4">
                If you have questions about any funding product, its terms, or its implications for your business, please contact us before submitting an application or accepting an offer.
              </p>
              <Link to="/contact" className="btn-secondary">
                Contact a Funding Specialist
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
