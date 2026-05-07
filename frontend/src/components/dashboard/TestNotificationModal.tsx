'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Phase = 'confirm' | 'sending' | 'success' | 'error';

type Props = {
  monitorId: string;
  monitorName: string;
  userEmail: string;
  onClose: () => void;
};

export function TestNotificationModal({
  monitorId,
  monitorName,
  userEmail,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'sending') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const send = async () => {
    setPhase('sending');
    setErrorMsg(null);
    try {
      const res = await api.monitors.testNotification(monitorId);
      setSentTo(res.to);
      setPhase('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send test notification.');
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-md bg-[#0f1115] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-7 max-h-[95vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {phase === 'confirm' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                  <path d="M22 6l-10 7L2 6" />
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                </svg>
              </span>
              <div>
                <h2 className="text-white font-bold text-lg">Send test notification?</h2>
                <p className="text-slate-500 text-xs">
                  For monitor <span className="text-slate-300">{monitorName}</span>
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-2">
              We&apos;ll send the current status of this monitor — uptime, response time, SSL and domain info — to:
            </p>
            <p className="text-emerald-400 text-sm font-semibold mb-6 break-all">{userEmail}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={send}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
              >
                Send test
              </button>
            </div>
          </>
        )}

        {phase === 'sending' && (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-slate-300 text-sm">Sending test notification…</p>
          </div>
        )}

        {phase === 'success' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <h2 className="text-white font-bold text-lg">Email sent</h2>
            </div>
            <p className="text-slate-300 text-sm mb-1">Check your inbox at:</p>
            <p className="text-emerald-400 text-sm font-semibold mb-6 break-all">{sentTo}</p>
            <p className="text-slate-500 text-xs mb-6">Delivery can take a few seconds. If it doesn&apos;t arrive, check spam.</p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/90 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </span>
              <h2 className="text-white font-bold text-lg">Couldn&apos;t send</h2>
            </div>
            <p className="text-red-400 text-sm mb-6 break-words">{errorMsg}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                Close
              </button>
              <button
                onClick={send}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
