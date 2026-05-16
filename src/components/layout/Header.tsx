import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Factory,
  FileText,
  LineChart,
  Menu,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Logo from '../brand/Logo';

type FundingProduct = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const fundingProducts: FundingProduct[] = [
  {
    label: 'Working Capital',
    description: 'Flexible capital to support payroll, inventory, marketing, and day-to-day operations.',
    href: '/solutions',
    icon: Briefcase,
  },
  {
    label: 'Revenue-Based Funding',
    description: 'Funding options structured around your business revenue and cash flow.',
    href: '/solutions',
    icon: LineChart,
  },
  {
    label: 'Term Funding',
    description: 'Fixed-term capital for planned investments, expansion, equipment, or growth.',
    href: '/solutions',
    icon: ClipboardCheck,
  },
  {
    label: 'Business Line of Credit',
    description: 'Revolving access to capital for ongoing business expenses and unexpected needs.',
    href: '/solutions',
    icon: CreditCard,
  },
  {
    label: 'Equipment Financing',
    description: 'Capital options for purchasing, leasing, or upgrading business equipment.',
    href: '/solutions',
    icon: Factory,
  },
  {
    label: 'Invoice Factoring',
    description: 'Turn unpaid invoices into working capital to improve cash flow.',
    href: '/solutions',
    icon: ReceiptText,
  },
  {
    label: 'Commercial Real Estate',
    description: 'Financing support for purchasing, improving, or refinancing business property.',
    href: '/solutions',
    icon: Building2,
  },
  {
    label: 'SBA Loan Guidance',
    description: 'Guidance for business owners exploring longer-term government-backed funding options.',
    href: '/solutions',
    icon: ShieldCheck,
  },
  {
    label: 'Ecommerce Funding',
    description: 'Capital solutions for online sellers, ecommerce brands, and digital operators.',
    href: '/solutions',
    icon: ShoppingCart,
  },
  {
    label: 'Contractor & Gig Funding',
    description: 'Funding options for contractors, independent operators, and project-based businesses.',
    href: '/solutions',
    icon: PackageCheck,
  },
];

const navLinks = [
  { label: 'Funding Solutions', href: '/solutions', children: fundingProducts },
  { label: 'Industries', href: '/industries' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const solutionsMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setSolutionsOpen(false);
    setMobileSolutionsOpen(false);
  }, [location]);

  const isActive = (href: string) => location.pathname === href;
  const openSolutions = () => setSolutionsOpen(true);
  const closeSolutions = () => setSolutionsOpen(false);

  const handleSolutionsBlur = () => {
    window.setTimeout(() => {
      if (!solutionsMenuRef.current?.contains(document.activeElement)) {
        setSolutionsOpen(false);
      }
    }, 0);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Elite Funding Solutions home">
            <Logo size="md" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map((link) =>
              link.children ? (
                <div
                  key={link.label}
                  ref={solutionsMenuRef}
                  className="relative"
                  onMouseEnter={openSolutions}
                  onMouseLeave={closeSolutions}
                  onBlur={handleSolutionsBlur}
                >
                  <button
                    type="button"
                    onClick={() => setSolutionsOpen((v) => !v)}
                    onFocus={openSolutions}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setSolutionsOpen(false);
                      }
                    }}
                    aria-expanded={solutionsOpen}
                    aria-haspopup="true"
                    className={`flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold rounded-md transition-colors ${
                      solutionsOpen || isActive(link.href)
                        ? 'text-navy-900 bg-slate-50'
                        : 'text-slate-700 hover:text-navy-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${solutionsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {solutionsOpen && (
                    <div className="absolute left-1/2 top-full w-[760px] -translate-x-1/2 pt-4 animate-fade-in">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/5">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-navy-50/60 px-6 py-5">
                          <div className="flex items-center justify-between gap-6">
                            <div>
                              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-700">
                                Working Capital. Smarter. Faster.
                              </p>
                              <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-navy-900">
                                Funding Solutions
                              </p>
                            </div>
                            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 xl:flex">
                              <Zap size={14} className="text-accent-600" /> Fast, guided review
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-4">
                          {link.children.map((product) => {
                            const Icon = product.icon;

                            return (
                              <Link
                                key={product.label}
                                to={product.href}
                                className="group flex gap-3 rounded-xl border border-transparent p-3.5 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:ring-offset-2"
                              >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-900 ring-1 ring-navy-100 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                                  <Icon size={18} />
                                </span>
                                <span>
                                  <span className="block text-[14px] font-bold leading-5 text-navy-900">
                                    {product.label}
                                  </span>
                                  <span className="mt-1 block text-[12.5px] leading-5 text-slate-600">
                                    {product.description}
                                  </span>
                                </span>
                              </Link>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-5 border-t border-slate-100 bg-slate-50/80 px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-navy-900 ring-1 ring-slate-200">
                              <CircleDollarSign size={18} />
                            </span>
                            <div>
                              <p className="text-[14px] font-bold text-navy-900">Not sure what fits?</p>
                              <p className="mt-0.5 max-w-[420px] text-[13px] leading-5 text-slate-600">
                                Check fit first and we&apos;ll help match your business with the right option.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-3">
                            <Link to="/solutions" className="text-[13px] font-bold text-slate-600 transition-colors hover:text-navy-900">
                              View All Funding Solutions
                            </Link>
                            <Link to="/funding-fit-check" className="btn-primary h-10 px-4 text-[13px]">
                              Check Funding Fit <ArrowRight size={15} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={closeSolutions}
                  className={`px-4 py-2 text-[15px] font-medium rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'text-navy-900 bg-slate-50'
                      : 'text-slate-700 hover:text-navy-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/contact" onClick={closeSolutions} className="text-[15px] font-medium text-slate-600 hover:text-navy-900 transition-colors px-3 py-2">
              Contact
            </Link>
            <Link to="/funding-fit-check" onClick={closeSolutions} className="btn-primary h-10 text-[14px]">
              Check Funding Fit
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-slate-600 hover:text-navy-900 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg animate-slide-in">
          <nav className="flex max-h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto px-5 py-4" aria-label="Mobile navigation">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2">
                  <button
                    type="button"
                    onClick={() => setMobileSolutionsOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] font-bold text-navy-900"
                    aria-expanded={mobileSolutionsOpen}
                  >
                    {link.label}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {mobileSolutionsOpen && (
                    <div className="mt-1 grid grid-cols-1 gap-1">
                      {link.children.map((product) => {
                        const Icon = product.icon;

                        return (
                          <Link
                            key={product.label}
                            to={product.href}
                            className="flex gap-3 rounded-lg bg-white px-3 py-3 text-slate-700 ring-1 ring-slate-100 hover:text-navy-900"
                          >
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-900">
                              <Icon size={17} />
                            </span>
                            <span>
                              <span className="block text-[14px] font-bold text-navy-900">{product.label}</span>
                              <span className="mt-0.5 block text-[12px] leading-5 text-slate-600">{product.description}</span>
                            </span>
                          </Link>
                        );
                      })}

                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="mb-3 flex gap-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-700">
                            <FileText size={17} />
                          </span>
                          <div>
                            <p className="text-[14px] font-bold text-navy-900">Not sure what fits?</p>
                            <p className="mt-0.5 text-[12px] leading-5 text-slate-600">
                              Check fit first and we&apos;ll help match your business with the right option.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link to="/funding-fit-check" className="btn-primary w-full justify-center text-[14px]">
                            Check Funding Fit
                          </Link>
                          <Link to="/solutions" className="text-center text-[13px] font-bold text-slate-600 hover:text-navy-900">
                            View All Funding Solutions
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="block px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:text-navy-900 rounded-md hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              )
            )}
            <Link to="/contact" className="block px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:text-navy-900 rounded-md hover:bg-slate-50">
              Contact
            </Link>
            <div className="pt-2 border-t border-slate-100 mt-2">
              <Link to="/funding-fit-check" className="btn-primary w-full justify-center">
                Check Funding Fit
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
