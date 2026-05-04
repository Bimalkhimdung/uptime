'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  MonitoringIcon,
  IncidentsIcon,
  StatusPagesIcon,
  MaintenanceIcon,
  TeamIcon,
  IntegrationsIcon,
  ChevronLeftIcon,
  MoreIcon,
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
  { label: 'Status pages', href: '#', icon: StatusPagesIcon },
  { label: 'Maintenance', href: '#', icon: MaintenanceIcon },
  { label: 'Team members', href: '#', icon: TeamIcon },
  { label: 'Integrations & API', href: '#', icon: IntegrationsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const isActive = (item: NavItem) => {
    const candidates = item.matches ?? [item.href];
    return candidates.some((p) => pathname === p || pathname.startsWith(p + '/'));
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-[#0b1411] border-r border-white/5 flex flex-col z-40">
      <div className="px-7 pt-8 pb-10">
        <Link href="/dashboard" className="flex items-baseline gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 translate-y-[-2px]" />
          <span className="font-black text-2xl text-white tracking-tight">Uptime</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        {NAV.map((item) => {
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
      </nav>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initial}
            <span className="text-emerald-400">.</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate text-sm">{displayName}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors flex-shrink-0"
          >
            <MoreIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Collapse"
            className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-4 py-3 rounded-2xl text-sm transition-colors"
          >
            Upgrade now
          </button>
        </div>
      </div>
    </aside>
  );
}
