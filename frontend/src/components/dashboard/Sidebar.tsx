'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  MonitoringIcon,
  IncidentsIcon,
  StatusPagesIcon,
  MaintenanceIcon,
  TeamIcon,
  IntegrationsIcon,
  SeoIcon,
} from './icons';
import type { ComponentType, SVGProps } from 'react';

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  matches?: string[];
};

const NAV: NavItem[] = [
  { label: 'Monitoring', href: '/dashboard', icon: MonitoringIcon, matches: ['/dashboard', '/monitors'] },
  { label: 'Incidents', href: '/incidents', icon: IncidentsIcon },
  { label: 'SEO', href: '/seo', icon: SeoIcon },
  { label: 'Status pages', href: '#', icon: StatusPagesIcon },
  { label: 'Maintenance', href: '#', icon: MaintenanceIcon },
  { label: 'Team members', href: '#', icon: TeamIcon },
  { label: 'Integrations & API', href: '#', icon: IntegrationsIcon },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'User management', href: '/users', icon: TeamIcon },
];

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() || 'U';

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const isActive = (item: NavItem) => {
    const candidates = item.matches ?? [item.href];
    return candidates.some((p) => pathname === p || pathname.startsWith(p + '/'));
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden
      />

    <aside
      className={`fixed left-0 top-0 h-screen w-72 max-w-[85%] bg-[#0b1411] border-r border-white/5 flex flex-col z-50 transition-transform duration-200 ease-out md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="px-7 pt-8 pb-10 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-baseline gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 translate-y-[-2px]" />
          <span className="font-black text-2xl text-white tracking-tight">Uptime</span>
        </Link>
        <button
          type="button"
          onClick={onMobileClose}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 -mr-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04]"
          aria-label="Close navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onMobileClose}
              className={
                active
                  ? 'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold bg-white/[0.04] text-white border border-white/[0.06]'
                  : 'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors border border-transparent'
              }
            >
              <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
              {item.label}
            </Link>
          );
        })}

        {user?.isSuperuser && (
          <>
            <div className="px-4 pt-6 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Admin
            </div>
            {ADMIN_NAV.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    active
                      ? 'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold bg-white/[0.04] text-white border border-white/[0.06]'
                      : 'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors border border-transparent'
                  }
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors ${
            menuOpen ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
          }`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initial}
            <span className="text-emerald-400">.</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold text-white truncate text-sm">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-500 flex-shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-4 right-4 mb-2 bg-[#0f1816] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.04] hover:text-red-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
