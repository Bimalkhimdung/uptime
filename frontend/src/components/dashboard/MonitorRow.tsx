import Link from 'next/link';

type Monitor = {
  id: string;
  name: string;
  url: string;
  status: 'UP' | 'DOWN' | 'PENDING';
  isActive: boolean;
  lastResponseTime?: number | null;
  uptimePercent?: number;
};

type Props = {
  monitor: Monitor;
  onToggle: (m: Monitor) => void;
  onDelete: (id: string) => void;
};

export function MonitorRow({ monitor: m, onToggle, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 sm:py-5 rounded-2xl hover:bg-white/[0.02] transition-colors group">
      <StatusDot status={m.status} paused={!m.isActive} />

      <div className="flex-1 min-w-0">
        <Link
          href={`/monitors/detail?id=${m.id}`}
          className="font-semibold text-white hover:text-emerald-400 transition-colors block truncate"
        >
          {m.name}
        </Link>
        <p className="text-slate-500 text-sm truncate">{m.url}</p>
      </div>

      <div className="hidden md:block text-right">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Response</p>
        <p className="text-sm font-semibold text-white">
          {m.lastResponseTime ? `${m.lastResponseTime}ms` : '—'}
        </p>
      </div>

      <div className="hidden md:block text-right w-24">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Uptime</p>
        <p className="text-sm font-semibold text-emerald-400">
          {(m.uptimePercent ?? 100).toFixed(1)}%
        </p>
      </div>

      <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggle(m)}
          title={m.isActive ? 'Pause' : 'Resume'}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          {m.isActive ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => onDelete(m.id)}
          title="Delete"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status, paused }: { status: string; paused: boolean }) {
  if (paused) {
    return (
      <span
        className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        title="Paused"
      >
        ‖
      </span>
    );
  }
  switch (status) {
    case 'UP':
      return (
        <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs flex-shrink-0" title="Up">▲</span>
      );
    case 'DOWN':
      return (
        <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs flex-shrink-0 animate-pulse" title="Down">▼</span>
      );
    default:
      return (
        <span className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs flex-shrink-0" title="Pending">·</span>
      );
  }
}
