'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Missing token. Please try signing in again.');
      return;
    }
    localStorage.setItem('uptime_token', token);
    api.auth
      .me()
      .then(() => {
        // Full reload so AuthProvider re-runs its bootstrap with the new token.
        window.location.replace('/dashboard');
      })
      .catch(() => {
        localStorage.removeItem('uptime_token');
        setError('Sign-in failed. Please try again.');
      });
  }, [params, router]);

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-violet-400 hover:text-violet-300 text-sm font-semibold"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm">Signing you in…</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030303] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
