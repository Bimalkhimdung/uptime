'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Incident = {
  id: string;
  resolved: boolean;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  errorMessage: string | null;
  monitor: { id: string; name: string; url: string };
};

type SortKey = 'started_desc' | 'started_asc' | 'duration_desc' | 'duration_asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'started_desc', label: 'Started - Newest first' },
  { value: 'started_asc', label: 'Started - Oldest first' },
  { value: 'duration_desc', label: 'Duration - Longest first' },
  { value: 'duration_asc', label: 'Duration - Shortest first' },
];

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || (!days && !hours)) parts.push(`${mins}m`);
  return parts.join(' ');
}

function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tzMatch = d.toString().match(/GMT([+-]\d{2})(\d{2})/);
  const tz = tzMatch ? `GMT${tzMatch[1]}:${tzMatch[2]}` : '';
  return `${date}, ${time}${tz ? ' ' + tz : ''}`;
}

type RootCause = { label: string; tag: string; tone: 'red' | 'amber' | 'violet' | 'slate' };

function classifyRootCause(err: string | null): RootCause {
  if (!err) return { label: 'Unknown', tag: 'ERR', tone: 'slate' };
  const e = err.toLowerCase();
  if (/timeout|timed out|etimedout/.test(e)) return { label: 'Connection Timeout', tag: 'T/O', tone: 'red' };
  if (/enotfound|eai_again|getaddrinfo|dns/.test(e)) return { label: 'DNS Failure', tag: 'DNS', tone: 'amber' };
  if (/econnrefused/.test(e)) return { label: 'Connection Refused', tag: 'REF', tone: 'red' };
  if (/cert|ssl|tls|self.signed/.test(e)) return { label: 'SSL Error', tag: 'SSL', tone: 'violet' };
  const httpMatch = err.match(/(?:HTTP\s*|status\s*)?(\d{3})/i);
  if (httpMatch) {
    const code = httpMatch[1];
    return {
      label: `HTTP ${code}`,
      tag: code,
      tone: code.startsWith('5') ? 'red' : code.startsWith('4') ? 'amber' : 'slate',
    };
  }
  if (/socket hang up|econnreset|network/.test(e)) return { label: 'Network Error', tag: 'NET', tone: 'red' };
  return { label: 'Error', tag: 'ERR', tone: 'slate' };
}

const TONE_BG: Record<RootCause['tone'], string> = {
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  slate: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

type MonitorGroup = {
  id: string;
  name: string;
  url: string;
  total: number;
  active: number;
  resolved: number;
  lastStartTime: string;
};

function groupByMonitor(incidents: Incident[]): MonitorGroup[] {
  const map = new Map<string, MonitorGroup>();
  for (const inc of incidents) {
    const existing = map.get(inc.monitor.id);
    if (existing) {
      existing.total += 1;
      if (inc.resolved) existing.resolved += 1;
      else existing.active += 1;
      if (new Date(inc.startTime).getTime() > new Date(existing.lastStartTime).getTime()) {
        existing.lastStartTime = inc.startTime;
      }
    } else {
      map.set(inc.monitor.id, {
        id: inc.monitor.id,
        name: inc.monitor.name,
        url: inc.monitor.url,
        total: 1,
        active: inc.resolved ? 0 : 1,
        resolved: inc.resolved ? 1 : 0,
        lastStartTime: inc.startTime,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.active !== b.active) return b.active - a.active;
    return new Date(b.lastStartTime).getTime() - new Date(a.lastStartTime).getTime();
  });
}

function IncidentsPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const monitorId = params.get('monitor') ?? '';

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('started_desc');

  useEffect(() => {
    if (!user) return;
    api.incidents
      .list()
      .then(setIncidents)
      .finally(() => setFetching(false));
  }, [user]);

  const monitors = useMemo(() => groupByMonitor(incidents), [incidents]);

  const selectedMonitor = useMemo(
    () => (monitorId ? monitors.find((m) => m.id === monitorId) : undefined),
    [monitorId, monitors],
  );

  const monitorIncidents = useMemo(
    () => (monitorId ? incidents.filter((i) => i.monitor.id === monitorId) : []),
    [incidents, monitorId],
  );

  const visibleMonitors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monitors;
    return monitors.filter(
      (m) => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q),
    );
  }, [monitors, search]);

  const visibleIncidents = useMemo(() => {
    const sorted = [...monitorIncidents];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'started_desc':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'started_asc':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'duration_desc':
          return (b.duration ?? 0) - (a.duration ?? 0);
        case 'duration_asc':
          return (a.duration ?? Infinity) - (b.duration ?? Infinity);
      }
    });
    return sorted;
  }, [monitorIncidents, sort]);

  const isMonitorView = !!monitorId;

  return (
    <div className="px-4 sm:px-6 lg:px-12 pt-8 lg:pt-12 pb-20 w-full max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <div className="min-w-0">
          {isMonitorView && (
            <Link
              href="/incidents"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors mb-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              All monitors
            </Link>
          )}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white truncate">
            {isMonitorView && selectedMonitor
              ? selectedMonitor.name
              : 'Incidents'}
            <span className="text-emerald-400">.</span>
          </h1>
          {isMonitorView && selectedMonitor && (
            <p className="text-sm text-slate-400 mt-1 truncate" title={selectedMonitor.url}>
              {selectedMonitor.url}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isMonitorView && (
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or URL"
                className="w-full bg-[#171a21] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          )}

          {isMonitorView && (
            <>
              <SelectWithIcon
                value="all"
                onChange={() => {}}
                disabled
                leftIcon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                }
              >
                <option value="all">All tags</option>
              </SelectWithIcon>

              <SelectWithIcon
                value={sort}
                onChange={(v) => setSort(v as SortKey)}
                leftIcon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4v16M3 8l4-4 4 4" />
                    <path d="M17 20V4M21 16l-4 4-4-4" />
                  </svg>
                }
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectWithIcon>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
        {fetching ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading…</div>
        ) : isMonitorView ? (
          <IncidentTable incidents={visibleIncidents} router={router} />
        ) : (
          <MonitorList monitors={visibleMonitors} search={search} />
        )}
      </div>
    </div>
  );
}

function MonitorList({ monitors, search }: { monitors: MonitorGroup[]; search: string }) {
  if (monitors.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        {search ? 'No monitors match your search.' : 'No incidents yet.'}
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/[0.04]">
      {monitors.map((m) => (
        <Link
          key={m.id}
          href={`/incidents?monitor=${m.id}`}
          className="flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="shrink-0 min-w-[100px]">
            <StatusPill resolved={m.active === 0} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{m.name}</p>
            <p className="text-xs text-slate-500 truncate" title={m.url}>{m.url}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {m.active > 0 && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                {m.active} active
              </span>
            )}
            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/20">
              {m.total} total
            </span>
          </div>
          <div className="hidden md:block text-right shrink-0 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-0.5">Last incident</p>
            <p className="text-xs text-slate-300">{formatStamp(m.lastStartTime)}</p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-500 shrink-0"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

function IncidentTable({
  incidents,
  router,
}: {
  incidents: Incident[];
  router: ReturnType<typeof useRouter>;
}) {
  if (incidents.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 text-sm">
        No incidents for this monitor yet.
      </div>
    );
  }
  return (
    <>
      {/* Mobile / tablet card layout */}
      <div className="xl:hidden divide-y divide-white/[0.04]">
        {incidents.map((inc) => (
          <Link
            key={inc.id}
            href={`/incidents/detail?id=${inc.id}`}
            className="block hover:bg-white/[0.02] transition-colors"
          >
            <IncidentCard incident={inc} />
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden xl:table w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[24%]" />
          <col className="w-[7%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/5 text-[12px] text-slate-500">
            <th className="text-left font-normal px-6 py-4">Status</th>
            <th className="text-left font-normal px-3 py-4">Root Cause</th>
            <th className="text-left font-normal px-3 py-4">Comments</th>
            <th className="text-left font-normal px-3 py-4">Started</th>
            <th className="text-left font-normal px-3 py-4">Resolved</th>
            <th className="text-left font-normal px-3 py-4">Duration</th>
            <th className="text-left font-normal px-6 py-4">Visibility</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => {
            const cause = classifyRootCause(inc.errorMessage);
            return (
              <tr
                key={inc.id}
                onClick={() => router.push(`/incidents/detail?id=${inc.id}`)}
                className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors align-middle cursor-pointer"
              >
                <td className="px-6 py-4">
                  <StatusPill resolved={inc.resolved} />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-1 rounded border ${TONE_BG[cause.tone]}`}>
                      {cause.tag}
                    </span>
                    <span className="text-sm text-slate-200 truncate" title={inc.errorMessage ?? ''}>
                      {cause.label}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-slate-400">0</td>
                <td className="px-3 py-4 text-sm text-slate-300 leading-snug">
                  {formatStamp(inc.startTime)}
                </td>
                <td className="px-3 py-4 text-sm text-slate-300 leading-snug">
                  {formatStamp(inc.endTime)}
                </td>
                <td className="px-3 py-4 text-sm text-slate-300">{formatDuration(inc.duration)}</td>
                <td className="px-6 py-4 text-sm text-slate-300">Included</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <IncidentsPageInner />
    </Suspense>
  );
}

function SelectWithIcon({
  value,
  onChange,
  leftIcon,
  children,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  leftIcon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {leftIcon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-[#171a21] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
}

function StatusPill({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-red-400 text-sm font-semibold">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      Active
    </span>
  );
}

function IncidentCard({ incident: inc }: { incident: Incident }) {
  const cause = classifyRootCause(inc.errorMessage);
  return (
    <div className="px-4 sm:px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate" title={inc.monitor.url}>
            {inc.monitor.url || inc.monitor.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${TONE_BG[cause.tone]}`}>
              {cause.tag}
            </span>
            <span className="text-xs text-slate-300">{cause.label}</span>
          </div>
        </div>
        <StatusPill resolved={inc.resolved} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-white/[0.04]">
        <div>
          <p className="text-slate-600 uppercase tracking-widest font-bold mb-0.5">Started</p>
          <p className="text-slate-300">{formatStamp(inc.startTime)}</p>
        </div>
        <div>
          <p className="text-slate-600 uppercase tracking-widest font-bold mb-0.5">Resolved</p>
          <p className="text-slate-300">{formatStamp(inc.endTime)}</p>
        </div>
        <div>
          <p className="text-slate-600 uppercase tracking-widest font-bold mb-0.5">Duration</p>
          <p className="text-slate-300">{formatDuration(inc.duration)}</p>
        </div>
      </div>
    </div>
  );
}
