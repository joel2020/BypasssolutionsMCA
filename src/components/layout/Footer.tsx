import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import { Mail, Phone, MapPin } from 'lucide-react';

const footerLinks = {
  solutions: [
    { label: 'Merchant Cash Advance', href: '/solutions' },
    { label: 'Revenue-Based Financing', href: '/solutions' },
    { label: 'Working Capital', href: '/solutions' },
    { label: 'Business Line of Credit', href: '/solutions' },
    { label: 'Equipment Funding', href: '/solutions' },
    { label: 'Short-Term Funding', href: '/solutions' },
  ],
  industries: [
    { label: 'Restaurants', href: '/industries' },
    { label: 'Trucking', href: '/industries' },
    { label: 'Construction', href: '/industries' },
    { label: 'Retail', href: '/industries' },
    { label: 'Medical Practices', href: '/industries' },
    { label: 'E-commerce', href: '/industries' },
  ],
  company: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Apply Now', href: '/apply' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Funding Disclosure', href: '/disclosure' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0B1426] text-white">
      {/* Main footer */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex mb-5" aria-label="Bypass Solution home">
              <Logo size="md" inverse />
            </Link>
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-xs mb-6">
              Helping small businesses explore fast, flexible funding options. Working capital and business financing, subject to review and approval.
            </p>
            <div className="flex flex-col gap-3">
              <a href="mailto:info@bypasssolution.com" className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors text-[14px]">
                <Mail size={15} className="text-accent-400" />
                info@bypasssolution.com
              </a>
              <a href="tel:+18005551234" className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors text-[14px]">
                <Phone size={15} className="text-accent-400" />
                (800) 555-1234
              </a>
              <div className="flex items-center gap-2.5 text-slate-400 text-[14px]">
                <MapPin size={15} className="text-accent-400" />
                United States
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-4">
              Funding Solutions
            </h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.solutions.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-[14px] text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-4">
              Industries
            </h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.industries.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-[14px] text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-4">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-[14px] text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclosure */}
      <div className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-6">
          <p className="text-slate-500 text-[12px] leading-relaxed">
            Bypass Solution is not a lender. We connect business owners with funding options through our network of funding partners. All funding is subject to review and approval. Not all applicants will qualify. Funding amounts, terms, and rates may vary based on business performance, creditworthiness, and other factors. Review all funding terms before accepting any offer. This is not an offer to lend. Bypass Solution does not guarantee approval or specific funding amounts.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-5">
            <p className="text-slate-600 text-[13px]">
              © {new Date().getFullYear()} Bypass Solution. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="text-slate-600 hover:text-slate-400 text-[13px] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-slate-600 hover:text-slate-400 text-[13px] transition-colors">Terms of Use</Link>
              <Link to="/disclosure" className="text-slate-600 hover:text-slate-400 text-[13px] transition-colors">Funding Disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
