'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Status = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

export function GoogleConnectCard({
  banner,
  onChange,
}: {
  banner?: { kind: 'success' | 'error'; message: string } | null;
  onChange?: () => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const s = await api.google.status();
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { url } = await api.google.connect();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to start Google connect');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Google Analytics account?')) return;
    setBusy(true);
    try {
      await api.google.disconnect();
      await load();
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6 mb-6">
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            banner.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32z" fill="#4285f4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34a853" />
            <path d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z" fill="#fbbc04" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#ea4335" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white mb-1">
            Google Analytics<span className="text-emerald-400">.</span>
          </h3>
          {!status?.configured ? (
            <p className="text-sm text-amber-300">
              Server is missing <code className="font-mono text-xs">GOOGLE_OAUTH_CLIENT_ID</code> /{' '}
              <code className="font-mono text-xs">GOOGLE_OAUTH_CLIENT_SECRET</code>. Configure them in{' '}
              <code className="font-mono text-xs">backend/.env</code> and restart.
            </p>
          ) : status.connected ? (
            <p className="text-sm text-slate-400">
              Connected as{' '}
              <span className="text-slate-200 font-medium">{status.email || 'your Google account'}</span>
              . Per-site GA4 properties are picked in the site&apos;s Edit dialog.
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Connect your Google account to pull active users, new users, and traffic from your GA4
              properties.
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          {status?.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="px-4 py-2 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={busy || !status?.configured}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
            >
              {busy ? 'Redirecting…' : 'Connect Google'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
