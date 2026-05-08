import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import Logo from '../brand/Logo';

const navLinks = [
  {
    label: 'Solutions',
    href: '/solutions',
    children: [
      { label: 'Merchant Cash Advance', href: '/solutions' },
      { label: 'Revenue-Based Financing', href: '/solutions' },
      { label: 'Working Capital', href: '/solutions' },
      { label: 'Business Line of Credit', href: '/solutions' },
      { label: 'Equipment Funding', href: '/solutions' },
    ],
  },
  { label: 'Industries', href: '/industries' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSolutionsOpen(false);
  }, [location]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-slate-200 shadow-nav' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Bypass Solution home">
            <Logo size="md" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="relative">
                  <button
                    onClick={() => setSolutionsOpen((v) => !v)}
                    onBlur={() => setTimeout(() => setSolutionsOpen(false), 150)}
                    className="flex items-center gap-1 px-4 py-2 text-[15px] font-medium text-slate-700 hover:text-navy-900 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    {link.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${solutionsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {solutionsOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 animate-fade-in">
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="block px-4 py-2.5 text-[14px] text-slate-700 hover:text-navy-900 hover:bg-slate-50 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
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
            <Link to="/contact" className="text-[15px] font-medium text-slate-600 hover:text-navy-900 transition-colors px-3 py-2">
              Contact
            </Link>
            <Link to="/apply" className="btn-primary h-10 text-[14px]">
              Apply Now
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-slate-600 hover:text-navy-900 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg animate-slide-in">
          <nav className="flex flex-col px-6 py-4 gap-1">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label}>
                  <div className="px-3 py-2.5 text-[15px] font-semibold text-slate-500 uppercase tracking-wider text-[12px]">
                    {link.label}
                  </div>
                  {link.children.map((child) => (
                    <Link
                      key={child.label}
                      to={child.href}
                      className="block px-3 py-2 text-[15px] text-slate-700 hover:text-navy-900 rounded-md hover:bg-slate-50"
                    >
                      {child.label}
                    </Link>
                  ))}
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
              <Link to="/apply" className="btn-primary w-full justify-center">
                Apply Now
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
