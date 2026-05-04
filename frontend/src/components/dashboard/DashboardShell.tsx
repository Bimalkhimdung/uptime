'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

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
      <Sidebar />
      <main className="pl-72 relative z-10">{children}</main>
    </div>
  );
}
