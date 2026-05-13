'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Footer } from '@/components/landing/Footer';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileNavOpen]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a1110] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1110] text-slate-300 selection:bg-emerald-400/30">
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 75% 50%, rgba(34,197,94,0.08), transparent 70%)',
        }}
      />

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#0a1110]/90 backdrop-blur border-b border-white/5">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-slate-200 hover:bg-white/[0.04]"
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-baseline gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 translate-y-[-1px]" />
          <span className="font-black text-lg text-white tracking-tight">Uptime</span>
        </div>
        <div className="w-10" aria-hidden />
      </div>

      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main className="md:pl-72 relative z-10">
        {children}
        <Footer />
      </main>
    </div>
  );
}
