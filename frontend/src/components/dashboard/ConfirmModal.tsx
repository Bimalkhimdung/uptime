'use client';
import { useState } from 'react';

type Intent = 'danger' | 'warning';

interface Props {
  intent?: Intent;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel?: string;
  target?: { name: string; url: string };
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

const palette: Record<
  Intent,
  { iconBg: string; iconBorder: string; iconStroke: string; button: string }
> = {
  danger: {
    iconBg: 'bg-red-500/10',
    iconBorder: 'border-red-500/20',
    iconStroke: '#f87171',
    button: 'bg-red-600 hover:bg-red-500',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/20',
    iconStroke: '#fbbf24',
    button: 'bg-amber-600 hover:bg-amber-500',
  },
};

export function ConfirmModal({
  intent = 'danger',
  title,
  description,
  confirmLabel,
  loadingLabel,
  target,
  onCancel,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const colors = palette[intent];

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || 'Action failed');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4 overflow-y-auto py-0 sm:py-6"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-[#111118] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-full ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center flex-shrink-0`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.iconStroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white text-lg leading-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
        </div>

        {target && (
          <div className="mx-6 my-4 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p
              className="text-sm font-semibold text-white truncate"
              title={target.name}
            >
              {target.name}
            </p>
            <p className="text-xs text-slate-500 truncate" title={target.url}>
              {target.url}
            </p>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-50 transition-colors py-2.5 rounded-xl text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 ${colors.button} disabled:opacity-50 transition-all text-white font-semibold py-2.5 rounded-xl text-sm`}
          >
            {loading ? loadingLabel || `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
