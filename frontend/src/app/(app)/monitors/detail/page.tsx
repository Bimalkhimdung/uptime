'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TestNotificationModal } from '@/components/dashboard/TestNotificationModal';
import { RegionMap } from '@/components/dashboard/RegionMap';
import EditMonitorModal from '@/components/EditMonitorModal';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    UP:      { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Up' },
    DOWN:    { dot: 'bg-red-400 animate-pulse', text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Down' },
    PENDING: { dot: 'bg-slate-400', text: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', label: 'Pending' },
  };
  const s = map[status] || map.PENDING;
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.bg} border-2`}>
      <div className={`w-3 h-3 rounded-full ${s.dot}`} />
    </div>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function DomainSslCard({ monitor }: { monitor: any }) {
  const isHttps = typeof monitor.url === 'string' && monitor.url.startsWith('https');
  const ssl = {
    validUntil: monitor.sslValidUntil ? new Date(monitor.sslValidUntil) : null,
    daysLeft: monitor.sslDaysLeft as number | null | undefined,
    issuer: monitor.sslIssuer as string | null,
    valid: monitor.sslValid as boolean | null,
    checkedAt: monitor.sslLastCheckedAt ? new Date(monitor.sslLastCheckedAt) : null,
  };
  const domainResolved = monitor.domainResolved as boolean | null;
  const domain = {
    expiresAt: monitor.domainExpiresAt ? new Date(monitor.domainExpiresAt) : null,
    daysLeft: monitor.domainDaysLeft as number | null,
    registrar: monitor.domainRegistrar as string | null,
    checkedAt: monitor.domainLastCheckedAt ? new Date(monitor.domainLastCheckedAt) : null,
  };

  const tone = {
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-red-400',
    unknown: 'text-slate-400',
  };

  let sslTone: keyof typeof tone = 'unknown';
  if (ssl.daysLeft != null && ssl.valid != null) {
    if (!ssl.valid) sslTone = 'bad';
    else if (ssl.daysLeft < 14) sslTone = 'warn';
    else sslTone = 'good';
  }

  let domainTone: keyof typeof tone = 'unknown';
  if (domain.daysLeft != null) {
    if (domain.daysLeft <= 0) domainTone = 'bad';
    else if (domain.daysLeft < 30) domainTone = 'warn';
    else domainTone = 'good';
  }

  const toneClass = tone[sslTone];
  const domainToneClass = tone[domainTone];

  return (
    <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
      <h3 className="font-bold text-white mb-6">
        Domain &amp; SSL<span className="text-emerald-400">.</span>
      </h3>

      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-2">DNS</p>
        {domainResolved === false ? (
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Did not resolve
          </div>
        ) : domainResolved === true ? (
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Resolves
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Awaiting first check
          </div>
        )}
      </div>

      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-2">Domain registration</p>
        {!domain.expiresAt ? (
          <p className="text-slate-500 text-sm">
            {domain.checkedAt ? 'WHOIS unavailable' : 'Awaiting first WHOIS lookup'}
          </p>
        ) : (
          <>
            <div className={`flex items-center gap-2 font-semibold ${domainToneClass}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
              </svg>
              {domain.daysLeft != null && domain.daysLeft <= 0
                ? 'Expired'
                : `${domain.daysLeft ?? '—'} days left`}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Expires{' '}
              <span className="text-slate-300">
                {domain.expiresAt.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </p>
            {domain.registrar && (
              <p className="text-xs text-slate-500 mt-1 truncate" title={domain.registrar}>
                Registrar <span className="text-slate-300">{domain.registrar}</span>
              </p>
            )}
          </>
        )}
      </div>

      <div className="mb-2">
        <p className="text-sm text-slate-400 mb-2">SSL certificate</p>
        {!isHttps ? (
          <p className="text-slate-500 text-sm">Not applicable (HTTP)</p>
        ) : !ssl.validUntil ? (
          <p className="text-slate-500 text-sm">Awaiting first HTTPS check</p>
        ) : (
          <>
            <div className={`flex items-center gap-2 font-semibold ${toneClass}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {ssl.valid === false
                ? 'Invalid certificate'
                : ssl.daysLeft != null && ssl.daysLeft <= 0
                ? 'Expired'
                : `${ssl.daysLeft ?? '—'} days left`}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Valid until{' '}
              <span className="text-slate-300">
                {ssl.validUntil.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </p>
            {ssl.issuer && (
              <p className="text-xs text-slate-500 mt-1 truncate" title={ssl.issuer}>
                Issuer <span className="text-slate-300">{ssl.issuer}</span>
              </p>
            )}
          </>
        )}
      </div>

      {ssl.checkedAt && (
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-4">
          Checked {timeAgo(ssl.checkedAt.toISOString())}
        </p>
      )}
    </div>
  );
}

function timeAgo(dateString: string | null) {
  if (!dateString) return 'Never';
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m, ${seconds % 60}s ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function LiveTimeAgo({ dateString }: { dateString: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!dateString) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [dateString]);
  return <>{timeAgo(dateString)}</>;
}

function MonitorDetailInner() {
  const { user } = useAuth();
  const search = useSearchParams();
  const id = search.get('id') ?? '';

  const [monitor, setMonitor] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
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
    if (!id) return;
    const load = async () => {
      try {
        const [m, c, i] = await Promise.all([
          api.monitors.get(id),
          api.monitors.checks(id, 100),
          api.monitors.incidents(id),
        ]);
        setMonitor(m);
        setChecks(c.reverse());
        setIncidents(i);
      } finally {
        setFetching(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [id]);

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!monitor) {
    return <div className="p-8 text-slate-400">Monitor not found.</div>;
  }

  const handleTogglePause = async () => {
    if (monitor.isActive) {
      await api.monitors.pause(id);
    } else {
      await api.monitors.resume(id);
    }
    const updated = await api.monitors.get(id);
    setMonitor(updated);
  };

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    try {
      const updated = await api.monitors.refreshMetadata(id);
      setMonitor(updated);
    } finally {
      setRefreshing(false);
    }
  };

  const chartData = checks.map(c => ({
    time: new Date(c.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    responseTime: c.responseTime || 0,
    status: c.status
  }));

  const upDuration = monitor.status === 'UP' && checks.length > 0
    ? Math.floor((new Date().getTime() - new Date(checks[0].checkedAt).getTime()) / 1000)
    : 0;

  const uptimePercentStr = (monitor.uptimePercent ?? 100).toFixed(2) + '%';
  const isUp = monitor.status === 'UP';

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-4 sm:p-6 md:p-10 font-sans">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full">
          <StatusBadge status={monitor.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{monitor.name}</h1>
              <a href={monitor.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">HTTP/S monitor for <a href={monitor.url} className="text-emerald-400 hover:underline">{monitor.url}</a></p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto">
          <button onClick={() => setShowTestModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1d24] hover:bg-[#252830] border border-white/5 rounded-lg text-xs sm:text-sm font-medium transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Test Notification
          </button>
          <button onClick={handleTogglePause} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1d24] hover:bg-[#252830] border border-white/5 rounded-lg text-xs sm:text-sm font-medium transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
            {monitor.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1d24] hover:bg-[#252830] border border-white/5 rounded-lg text-xs sm:text-sm font-medium transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="More actions"
              className={`p-2 border border-white/5 rounded-lg text-slate-400 transition-colors ${
                menuOpen ? 'bg-[#252830] text-white' : 'bg-[#1a1d24] hover:bg-[#252830]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 bg-[#171a21] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={refreshing}
                  onClick={() => {
                    setMenuOpen(false);
                    handleRefreshMetadata();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={refreshing ? 'animate-spin' : ''}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  {refreshing ? 'Refreshing…' : 'Refresh metadata'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">

        <div className="lg:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-4 sm:p-6">
              <p className="text-sm text-slate-400 mb-3">Current status</p>
              <h2 className={`text-2xl font-bold mb-2 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? 'Up' : 'Down'}
              </h2>
              <p className="text-sm text-slate-400">Currently {isUp ? 'up' : 'down'} for {formatDuration(upDuration)}</p>
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-4 sm:p-6">
              <p className="text-sm text-slate-400 mb-3">Last check</p>
              <h2 className="text-2xl font-bold text-white mb-2 tabular-nums">
                <LiveTimeAgo dateString={monitor.lastCheckedAt} />
              </h2>
              <p className="text-sm text-slate-400">Checked every {monitor.interval}m</p>
            </div>

            <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-4 sm:p-6">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-slate-400">Last 24 hours</p>
                <p className="text-sm font-bold text-white">{uptimePercentStr}</p>
              </div>
              <div className="flex gap-1 h-6 mb-3">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-emerald-500 rounded-sm" />
                ))}
              </div>
              <p className="text-sm text-slate-400">0 incidents, 0m down</p>
            </div>
          </div>

          <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 sm:divide-x sm:divide-white/5">
              <div className="sm:px-2">
                <p className="text-xs sm:text-sm text-slate-400 mb-2">Last 7 days</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-400 mb-2">{uptimePercentStr}</p>
                <p className="text-xs text-slate-400 leading-relaxed">0 incidents, 0m down</p>
              </div>
              <div className="sm:px-6">
                <p className="text-xs sm:text-sm text-slate-400 mb-2">Last 30 days</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-400 mb-2">{uptimePercentStr}</p>
                <p className="text-xs text-slate-400 leading-relaxed">0 incidents, 0m down</p>
              </div>
              <div className="sm:px-6">
                <p className="text-xs sm:text-sm text-slate-400 mb-2">Last 365 days</p>
                <p className="text-xl sm:text-2xl font-bold text-white mb-2">--.---%</p>
                <a href="#" className="text-xs text-emerald-400 hover:underline">Unlock with paid plans</a>
              </div>
              <div className="sm:px-6 relative">
                <p className="text-xs sm:text-sm text-slate-400 mb-2 flex items-center gap-1">
                  MTBF <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-500 mb-2">N/A</p>
              </div>
            </div>
          </div>

          <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                Response time for <span className="underline decoration-dashed decoration-slate-500 underline-offset-4 cursor-pointer">All regions</span>
              </h3>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <button className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Setup alerts
                </button>
                <span className="hidden sm:inline text-xs text-slate-400">For slow response times</span>
                <select className="bg-[#0f1115] border border-white/10 rounded-md px-3 py-1 text-xs sm:text-sm text-white outline-none">
                  <option>Last hour</option>
                  <option>Last 24 hours</option>
                </select>
              </div>
            </div>

            <div className="h-48 sm:h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="time"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}ms`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#34d399' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <ReferenceLine y={chartData[chartData.length-1]?.responseTime} stroke="#34d399" strokeDasharray="3 3" opacity={0.5} />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#34d399', stroke: '#1a1d24', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">No response time data</div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-8">
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  Current
                </p>
                <p className="text-xl font-bold text-white">{monitor.lastResponseTime || '--'} ms</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1 mb-1 text-emerald-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  Average
                </p>
                <p className="text-xl font-bold text-white">
                  {chartData.length ? Math.round(chartData.reduce((a,c)=>a+c.responseTime,0)/chartData.length) : '--'} ms
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#171a21] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="font-bold text-white">Latest incidents<span className="text-emerald-400">.</span></h3>
            </div>
            <div className="p-12 text-center bg-[#13151a]">
              {incidents.length === 0 ? (
                <>
                  <h4 className="text-xl font-bold text-white mb-2">👍 Good job, no incidents<span className="text-emerald-400">.</span></h4>
                  <p className="text-sm text-slate-400">No incidents so far. Keep it up!</p>
                </>
              ) : (
                <div className="text-left divide-y divide-white/5">
                  {incidents.slice(0, 5).map((inc: any) => (
                    <div key={inc.id} className="py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${inc.resolved ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        <span className="font-semibold text-white">{inc.resolved ? 'Resolved' : 'Ongoing'} Incident</span>
                      </div>
                      <p className="text-sm text-slate-400 ml-4">{new Date(inc.startTime).toLocaleString()} - {inc.duration ? formatDuration(inc.duration) : 'Current'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="space-y-6">

          <DomainSslCard monitor={monitor} />

          <div className="bg-[#171a21] border border-white/[0.04] rounded-xl p-6">
            <h3 className="font-bold text-white mb-2">
              Notified to<span className="text-emerald-400">.</span>
            </h3>
            <p className="text-sm text-slate-400 truncate" title={user?.email}>
              {user?.email || 'Not logged in'}
            </p>
          </div>


          <RegionMap monitor={monitor} />

        </div>
      </div>

      {showTestModal && user && (
        <TestNotificationModal
          monitorId={monitor.id}
          monitorName={monitor.name}
          userEmail={user.email}
          onClose={() => setShowTestModal(false)}
        />
      )}

      {showEditModal && (
        <EditMonitorModal
          monitor={monitor}
          onClose={() => setShowEditModal(false)}
          onSaved={async () => {
            const updated = await api.monitors.get(id);
            setMonitor(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function MonitorDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <MonitorDetailInner />
    </Suspense>
  );
}
