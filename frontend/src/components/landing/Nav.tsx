'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type SubItem = {
  label: string;
  href: string;
  description?: string;
};

type NavSection = {
  label: string;
  items: SubItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Monitoring',
    items: [
      { label: 'HTTP/S checks', href: '#monitoring', description: 'Watch endpoints every minute.' },
      { label: 'SSL certificates', href: '#monitoring', description: 'Track expiry and chain validity.' },
      { label: 'Domain expiry', href: '#monitoring', description: 'WHOIS-based renewal reminders.' },
      { label: 'Status pages', href: '#monitoring', description: 'Public uptime dashboards.' },
    ],
  },
  {
    label: 'Products',
    items: [
      { label: 'Uptime monitoring', href: '#products', description: 'Real-time site health.' },
      { label: 'Incident manager', href: '#products', description: 'Open / resolve with full timeline.' },
      { label: 'SEO insights', href: '#products', description: 'Lighthouse + GA4 in one view.' },
      { label: 'Team & API access', href: '#products', description: 'Integrations and tokens.' },
    ],
  },
  {
    label: 'Features',
    items: [
      { label: 'Smart retry alerts', href: '#features', description: 'No noise from flaky networks.' },
      { label: 'Multi-channel notifications', href: '#features', description: 'Email, Slack, webhooks.' },
      { label: 'Response-time charts', href: '#features', description: 'Per-region, per-window.' },
      { label: 'JWT-secured dashboard', href: '#features', description: 'Per-user monitor isolation.' },
    ],
  },
  {
    label: 'Free tools',
    items: [
      { label: 'Domain name check', href: '/tools/domain', description: 'WHOIS lookup, registrar, expiry.' },
      { label: 'SSL certificate check', href: '/tools/ssl', description: 'Chain, issuer, days left.' },
      { label: 'DNS lookup', href: '/tools/dns', description: 'A / AAAA / MX / TXT records.' },
      { label: 'HTTP status check', href: '/tools/http', description: 'One-shot endpoint test.' },
    ],
  },
];

export function Nav() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onEsc);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a1110]/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          <span className="font-bold text-lg tracking-tight text-white/90">Uptime</span>
        </Link>

        {/* Desktop dropdown nav */}
        <div ref={wrapperRef} className="hidden lg:flex items-center gap-1 relative">
          {NAV_SECTIONS.map((section) => {
            const isOpen = openMenu === section.label;
            return (
              <div key={section.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(isOpen ? null : section.label)}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isOpen
                      ? 'text-white bg-white/[0.06]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {section.label}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-2 w-72 bg-[#0f1816] border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-2"
                  >
                    {section.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpenMenu(null)}
                        className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                      >
                        <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="hidden sm:inline-flex bg-white text-black hover:bg-white/90 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Get started free
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-slate-200 hover:bg-white/[0.04]"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[110]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm bg-[#0b1411] border-l border-white/10 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-lg tracking-tight text-white/90">Uptime</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-slate-300 hover:bg-white/[0.04]"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 px-3 py-3 space-y-1">
              {NAV_SECTIONS.map((section) => {
                const isOpen = mobileSection === section.label;
                return (
                  <div key={section.label}>
                    <button
                      type="button"
                      onClick={() =>
                        setMobileSection(isOpen ? null : section.label)
                      }
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-semibold text-white hover:bg-white/[0.04] transition-colors"
                    >
                      {section.label}
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="pl-3 pb-2 space-y-0.5">
                        {section.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 pb-6 pt-4 border-t border-white/5 space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center text-sm font-medium text-slate-300 hover:text-white py-2.5 rounded-lg border border-white/10 hover:bg-white/[0.04] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-white text-black hover:bg-white/90 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
