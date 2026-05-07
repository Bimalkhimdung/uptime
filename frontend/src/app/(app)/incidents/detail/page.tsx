'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Check = {
  id: string;
  status: 'UP' | 'DOWN';
  statusCode: number | null;
  responseTime: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

type IncidentDetail = {
  id: string;
  resolved: boolean;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  errorMessage: string | null;
  monitor: {
    id: string;
    name: string;
    url: string;
    serverIp: string | null;
    serverCity: string | null;
    serverCountry: string | null;
    alertContacts: { id: string; type: string; value: string }[];
    user: { name: string | null; email: string };
  };
  checks: Check[];
};

type Tone = 'red' | 'amber' | 'violet' | 'slate';
type RootCause = { label: string; tag: string; tone: Tone };

function classifyRootCause(err: string | null): RootCause {
  if (!err) return { label: 'Unknown error', tag: 'ERR', tone: 'slate' };
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

const TONE_PILL: Record<Tone, string> = {
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  slate: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

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

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function regionLabel(monitor: IncidentDetail['monitor']): string {
  if (monitor.serverCity && monitor.serverCountry) return `${monitor.serverCity}, ${monitor.serverCountry}`;
  if (monitor.serverCountry) return monitor.serverCountry;
  return 'Local';
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // no-op
        }
      }}
      className={`inline-flex items-center justify-center rounded-md w-7 h-7 text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors ${className}`}
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function StatusCircle({ resolved }: { resolved: boolean }) {
  if (resolved) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
        <span className="h-5 w-5 rounded-full bg-emerald-400" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
      <span className="relative flex h-5 w-5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex h-5 w-5 rounded-full bg-red-500" />
      </span>
    </div>
  );
}

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-[#0f1217] border border-white/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            value === o.value
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckTimelineCard({ checks }: { checks: Check[] }) {
  const total = checks.length;
  const down = checks.filter((c) => c.status === 'DOWN').length;
  const upChecks = checks.filter((c) => c.status === 'UP' && c.responseTime != null);
  const avgUp =
    upChecks.length > 0
      ? Math.round(
          upChecks.reduce((sum, c) => sum + (c.responseTime ?? 0), 0) / upChecks.length,
        )
      : null;
  const failureRate = total > 0 ? Math.round((down / total) * 100) : 0;

  // Cap dot count so the row stays compact even on long incidents.
  const MAX_DOTS = 60;
  let timeline = checks;
  if (checks.length > MAX_DOTS) {
    const step = checks.length / MAX_DOTS;
    timeline = Array.from({ length: MAX_DOTS }, (_, i) =>
      checks[Math.min(checks.length - 1, Math.floor(i * step))],
    );
  }

  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-slate-500">Check timeline</p>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            failureRate >= 50
              ? 'bg-red-500/15 text-red-400 border-red-500/30'
              : failureRate > 0
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {failureRate}% failed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-base font-bold text-white leading-tight">{total}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Checks</p>
        </div>
        <div>
          <p className="text-base font-bold text-red-400 leading-tight">{down}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Down</p>
        </div>
        <div>
          <p className="text-base font-bold text-emerald-400 leading-tight">
            {avgUp != null ? `${avgUp}ms` : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Avg up</p>
        </div>
      </div>

      {timeline.length > 0 ? (
        <div className="flex items-center gap-[3px]">
          {timeline.map((c, i) => (
            <span
              key={`${c.id}-${i}`}
              className={`flex-1 h-6 rounded-sm ${
                c.status === 'UP' ? 'bg-emerald-500/70' : 'bg-red-500/70'
              }`}
              title={`${new Date(c.checkedAt).toLocaleTimeString()} · ${
                c.status === 'UP' ? `UP ${c.responseTime ?? '?'}ms` : `DOWN ${c.errorMessage ?? ''}`
              }`}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No checks recorded in the window.</p>
      )}

      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-600">
        <span>Start</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500/70" /> Up
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-red-500/70" /> Down
          </span>
        </span>
        <span>Now</span>
      </div>
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <div className="relative bg-[#0c0e13] border border-white/[0.04] rounded-xl px-3 py-2.5 pr-9">
      <pre className="text-[12.5px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-all">
{value}
      </pre>
      <div className="absolute top-1.5 right-1.5">
        <CopyButton text={value} />
      </div>
    </div>
  );
}

type ActivityItem = {
  key: string;
  kind: 'detected' | 'confirmed' | 'resolved' | 'email-down' | 'email-up';
  at: string;
  cause?: RootCause;
  ip?: string | null;
  recipient?: string;
};

function buildActivityLog(incident: IncidentDetail): ActivityItem[] {
  const cause = classifyRootCause(incident.errorMessage);
  const recipientName =
    incident.monitor.user.name ||
    incident.monitor.user.email.split('@')[0] ||
    'you';
  const items: ActivityItem[] = [];

  // Down checks during the window — the first DOWN is "detected", the rest
  // are retry "confirmed" entries. The backend already constrains checks to
  // the incident window; if the incident is resolved we still drop anything
  // strictly after endTime.
  const endCutoff = incident.endTime ? new Date(incident.endTime).getTime() + 1000 : Infinity;
  const downChecks = incident.checks
    .filter((c) => c.status === 'DOWN' && new Date(c.checkedAt).getTime() <= endCutoff)
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());

  if (downChecks.length === 0) {
    items.push({
      key: `detected-${incident.id}`,
      kind: 'detected',
      at: incident.startTime,
      cause,
      ip: incident.monitor.serverIp,
    });
  } else {
    downChecks.forEach((c, idx) => {
      items.push({
        key: c.id,
        kind: idx === 0 ? 'detected' : 'confirmed',
        at: c.checkedAt,
        cause: classifyRootCause(c.errorMessage ?? incident.errorMessage),
        ip: incident.monitor.serverIp,
      });
    });
  }

  // Email sent on incident open (we always fire alerts when an incident
  // is created, so reflect that in the log).
  if (incident.monitor.alertContacts.length > 0) {
    items.push({
      key: `email-down-${incident.id}`,
      kind: 'email-down',
      at: incident.startTime,
      recipient: recipientName,
    });
  }

  if (incident.resolved && incident.endTime) {
    items.push({
      key: `resolved-${incident.id}`,
      kind: 'resolved',
      at: incident.endTime,
    });
    if (incident.monitor.alertContacts.length > 0) {
      items.push({
        key: `email-up-${incident.id}`,
        kind: 'email-up',
        at: incident.endTime,
        recipient: recipientName,
      });
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function ActivityRow({ item, region }: { item: ActivityItem; region: string }) {
  const stamp = formatStamp(item.at);
  switch (item.kind) {
    case 'detected':
    case 'confirmed': {
      const c = item.cause!;
      return (
        <div className="flex items-start gap-3 py-2.5">
          <span className={`mt-0.5 inline-flex items-center justify-center text-[10px] font-bold px-1.5 h-5 min-w-[28px] rounded border ${TONE_PILL[c.tone]}`}>
            {c.tag}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200">
              {c.label} {item.kind === 'detected' ? 'detected' : 'confirmed'} by {region}
              {item.ip ? <span className="text-slate-400">: {item.ip}</span> : null}
            </p>
          </div>
          <p className="text-xs text-slate-500 shrink-0">{stamp}</p>
        </div>
      );
    }
    case 'resolved':
      return (
        <div className="flex items-start gap-3 py-2.5">
          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <p className="flex-1 text-sm text-slate-200">Incident resolved by {region}</p>
          <p className="text-xs text-slate-500 shrink-0">{stamp}</p>
        </div>
      );
    case 'email-down':
    case 'email-up':
      return (
        <div className="flex items-start gap-3 py-2.5">
          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-500/20 text-slate-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
              <polyline points="22 7 12 13 2 7" />
            </svg>
          </span>
          <div className="flex-1 flex items-center gap-2">
            <p className="text-sm text-slate-200">Email sent to {item.recipient}</p>
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20 uppercase tracking-wide">
              Success
            </span>
          </div>
          <p className="text-xs text-slate-500 shrink-0">{stamp}</p>
        </div>
      );
  }
}

function IncidentDetailInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const id = params.get('id') ?? '';

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [requestTab, setRequestTab] = useState<'url' | 'headers'>('url');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('headers');
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activityPage, setActivityPage] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (incident?.resolved) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [incident?.resolved]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    api.incidents
      .get(id)
      .then((data) => {
        if (cancelled) return;
        setIncident(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const region = useMemo(
    () => (incident ? regionLabel(incident.monitor) : 'Local'),
    [incident],
  );

  const activity = useMemo(
    () => (incident ? buildActivityLog(incident) : []),
    [incident],
  );

  const ACTIVITY_PAGE_SIZE = 10;
  const activityPageCount = Math.max(1, Math.ceil(activity.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, activityPageCount - 1);
  const activitySlice = activity.slice(
    safeActivityPage * ACTIVITY_PAGE_SIZE,
    safeActivityPage * ACTIVITY_PAGE_SIZE + ACTIVITY_PAGE_SIZE,
  );

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !incident) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 pt-12">
        <p className="text-slate-400">Incident not found.</p>
        <Link href="/incidents" className="text-emerald-400 hover:underline text-sm">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  const cause = classifyRootCause(incident.errorMessage);
  const host = hostFromUrl(incident.monitor.url);
  const requestUrl = `GET ${incident.monitor.url}`;
  const requestHeaders = `User-Agent: UptimeMonitor/1.0\nHost: ${host}\nAccept: */*`;
  const responseBody = '';
  const responseHeaders = '{}';

  const elapsed =
    incident.duration ??
    Math.max(0, Math.floor((now - new Date(incident.startTime).getTime()) / 1000));

  return (
    <div className="px-4 sm:px-6 pt-6 pb-20 w-full max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start gap-4 mb-5">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <StatusCircle resolved={incident.resolved} />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {incident.resolved ? 'Resolved' : 'Active'} incident on {host}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              HTTP/S monitor for{' '}
              <a
                href={incident.monitor.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-200 underline-offset-4 hover:underline"
              >
                {incident.monitor.url}
              </a>
            </p>
            <span className="inline-flex items-center text-[11px] font-semibold mt-2 px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20">
              Included
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/monitors/detail?id=${incident.monitor.id}`}
            className="inline-flex items-center gap-2 bg-[#171a21] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 hover:bg-[#1f232c] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Go to monitor
          </Link>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify(incident, null, 2)],
                { type: 'application/json' },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `incident-${incident.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 bg-violet-600/90 hover:bg-violet-600 border border-violet-500/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download response
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center bg-[#171a21] border border-white/10 rounded-xl w-11 h-11 text-slate-300 hover:bg-[#1f232c] transition-colors"
              aria-label="More actions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#171a21] shadow-lg shadow-black/40 py-1 z-10">
                <Link
                  href="/incidents"
                  className="block px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  Back to incidents
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                    } catch {
                      // no-op
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3">
        {/* Left column */}
        <div className="space-y-3 min-w-0">
          {/* Root cause */}
          <div className="relative bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3 pr-11">
            <p className="text-[11px] text-slate-500 mb-0.5">Root cause</p>
            <p className="text-lg sm:text-xl font-semibold text-white leading-tight">
              <span className={cause.tone === 'red' ? 'text-red-400' : cause.tone === 'amber' ? 'text-amber-400' : cause.tone === 'violet' ? 'text-violet-400' : 'text-slate-200'}>
                {cause.label}
              </span>{' '}
              <span className="text-slate-400 font-normal">in {region}</span>
            </p>
            {incident.errorMessage && (
              <p className="text-xs text-slate-500 mt-1 truncate" title={incident.errorMessage}>
                {incident.errorMessage}
              </p>
            )}
            <div className="absolute top-2 right-2">
              <CopyButton text={`${cause.label} — ${incident.errorMessage ?? ''}`} />
            </div>
          </div>

          {/* Status + Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-0.5">Status</p>
              <p className={`text-lg font-bold ${incident.resolved ? 'text-emerald-400' : 'text-red-400'}`}>
                {incident.resolved ? 'Resolved' : 'Active'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Started at {formatStamp(incident.startTime)}
              </p>
            </div>
            <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
              <p className="text-[11px] text-slate-500 mb-0.5">Duration</p>
              <p className="text-lg font-bold text-white">{formatDuration(elapsed)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {incident.resolved
                  ? `Resolved at ${formatStamp(incident.endTime)}`
                  : 'Ongoing'}
              </p>
            </div>
          </div>

          {/* Regions */}
          <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-3">
            <p className="text-[11px] text-slate-500 shrink-0">Regions</p>
            <div className="inline-flex items-center gap-2 bg-[#0f1217] border border-white/[0.04] rounded-lg px-2.5 py-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-slate-200">{region}</span>
            </div>
          </div>

          {/* Check timeline */}
          <CheckTimelineCard checks={incident.checks} />
        </div>

        {/* Right column */}
        <div className="space-y-3 min-w-0">
          {/* Request */}
          <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white">
                Request<span className="text-emerald-400">.</span>
              </h3>
              <Tabs
                value={requestTab}
                onChange={setRequestTab}
                options={[
                  { value: 'url', label: 'URL' },
                  { value: 'headers', label: 'Headers' },
                ]}
              />
            </div>
            <CodeBlock value={requestTab === 'url' ? requestUrl : requestHeaders} />
          </div>

          {/* Response */}
          <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white">
                Response<span className="text-emerald-400">.</span>
              </h3>
              <Tabs
                value={responseTab}
                onChange={setResponseTab}
                options={[
                  { value: 'body', label: 'Body' },
                  { value: 'headers', label: 'Headers' },
                ]}
              />
            </div>
            <CodeBlock
              value={
                responseTab === 'body'
                  ? responseBody || '(no body captured)'
                  : responseHeaders
              }
            />
          </div>

          {/* Traceroute */}
          <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3">
            <div className="mb-2">
              <h3 className="font-bold text-white">
                Traceroute<span className="text-emerald-400">.</span>
              </h3>
            </div>
            <CodeBlock
              value={
                incident.monitor.serverIp
                  ? `Tracing route to ${incident.monitor.serverIp}\nhop no  -  node ip  -  ms\n1 -> ${incident.monitor.serverIp}`
                  : '(traceroute not available)'
              }
            />
          </div>
        </div>
      </div>

      {/* Activity log — full width */}
      <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-4 py-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white">
            Activity log<span className="text-emerald-400">.</span>
          </h3>
          {activity.length > 0 && (
            <p className="text-xs text-slate-500">
              {safeActivityPage * ACTIVITY_PAGE_SIZE + 1}–
              {Math.min(activity.length, (safeActivityPage + 1) * ACTIVITY_PAGE_SIZE)}{' '}
              of {activity.length}
            </p>
          )}
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">No activity recorded.</p>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {activitySlice.map((it) => (
                <ActivityRow key={it.key} item={it} region={region} />
              ))}
            </div>
            {activityPageCount > 1 && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                  disabled={safeActivityPage === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f1217] border border-white/[0.06] text-slate-200 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0f1217]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>
                <p className="text-xs text-slate-500">
                  Page {safeActivityPage + 1} of {activityPageCount}
                </p>
                <button
                  type="button"
                  onClick={() => setActivityPage((p) => Math.min(activityPageCount - 1, p + 1))}
                  disabled={safeActivityPage >= activityPageCount - 1}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f1217] border border-white/[0.06] text-slate-200 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0f1217]"
                >
                  Next
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function IncidentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <IncidentDetailInner />
    </Suspense>
  );
}
