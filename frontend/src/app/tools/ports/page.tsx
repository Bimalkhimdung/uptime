'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type PortResult = Awaited<ReturnType<typeof api.tools.portCheck>>;
type PortRow = PortResult['results'][number];

const PRESETS = [
  { key: 'common', label: 'Common', description: 'Top web, mail, db, cache' },
  { key: 'web', label: 'Web', description: 'HTTP / HTTPS / dev servers' },
  { key: 'mail', label: 'Mail', description: 'SMTP, IMAP, POP3' },
  { key: 'db', label: 'Database', description: 'MySQL, Postgres, Mongo, Redis' },
  { key: 'admin', label: 'Admin', description: 'SSH, RDP, VNC, Telnet' },
];

const SUGGESTIONS = ['github.com', 'cloudflare.com', '1.1.1.1', 'scanme.nmap.org'];

const TONE_BY_STATUS: Record<PortRow['status'], string> = {
  open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  timeout: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'open|filtered': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const STATUS_LABEL: Record<PortRow['status'], string> = {
  open: 'OPEN',
  closed: 'CLOSED',
  timeout: 'TIMEOUT',
  'open|filtered': 'OPEN|FILT',
  error: 'ERROR',
};

export default function PortCheckPage() {
  const [host, setHost] = useState('');
  const [ports, setPorts] = useState('');
  const [preset, setPreset] = useState<string | null>('common');
  const [protocol, setProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortResult | null>(null);

  const submit = async (override?: {
    host?: string;
    ports?: string;
    preset?: string | null;
    protocol?: 'tcp' | 'udp';
  }) => {
    const h = (override?.host ?? host).trim();
    if (!h) return;
    const p = override?.ports ?? ports;
    const pre = override?.preset === undefined ? preset : override.preset;
    const proto = override?.protocol ?? protocol;
    if (!p.trim() && !pre) {
      setError('Pick a preset or enter at least one port.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.portCheck(h, {
        ports: p.trim() || undefined,
        preset: pre ?? undefined,
        protocol: proto,
      });
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1110] text-slate-300">
      <Nav />

      <main className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
              <span className="h-1 w-1 rounded-full bg-emerald-400" /> Free tool
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
              Port check<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Probe specific TCP ports — or scan a preset — to see what&apos;s open, closed, or
              firewalled on any host.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="bg-[#11131a] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-3 space-y-2"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="example.com or 1.2.3.4"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-[#0f1217] border border-white/[0.04] rounded-xl pl-11 pr-4 py-3 sm:py-3.5 text-white text-base placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
              </div>
              <input
                type="text"
                value={ports}
                onChange={(e) => setPorts(e.target.value)}
                placeholder="22, 80, 443"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full sm:w-44 bg-[#0f1217] border border-white/[0.04] rounded-xl px-4 py-3 sm:py-3.5 text-white text-base placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors font-mono text-sm"
              />
              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Scan
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[#0f1217] border border-white/[0.04] p-1">
                {(['tcp', 'udp'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtocol(p)}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                      protocol === p
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                    title={
                      p === 'tcp'
                        ? 'Connection-oriented probe (definitive open/closed)'
                        : 'Connectionless probe (best-effort, may report Open|Filtered)'
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">Preset:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(preset === p.key ? null : p.key)}
                  title={p.description}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                    preset === p.key
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-[#0f1217] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {preset && (
                <button
                  type="button"
                  onClick={() => setPreset(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 mb-8 text-xs text-slate-500">
            <span>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setHost(s);
                  submit({ host: s });
                }}
                className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {result && <ResultSection result={result} />}

          {!result && !error && !loading && (
            <div className="bg-[#11131a] border border-white/[0.04] rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">
                Enter a host above and pick ports or a preset.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/http"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                HTTP status check →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Send a real request and inspect headers, redirects, body.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor open ports with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Get alerted when a port stops responding.
              </p>
            </Link>
          </div>

          <p className="text-[11px] text-slate-600 mt-6 text-center max-w-xl mx-auto">
            Only scan hosts you own or have permission to test. Aggressive scanning of
            third-party systems may violate their terms of service or applicable law.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: PortResult }) {
  const openCount = result.results.filter((r) => r.status === 'open').length;
  const closedCount = result.results.filter((r) => r.status === 'closed').length;
  const filteredCount = result.results.filter(
    (r) => r.status === 'timeout' || r.status === 'open|filtered' || r.status === 'error',
  ).length;

  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
            Scanned · <span className="text-emerald-400">{result.protocol.toUpperCase()}</span>
          </p>
          <p className="text-white font-mono text-sm sm:text-base truncate">{result.host}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {openCount} open
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-500/20">
            {closedCount} closed
          </span>
          {filteredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {filteredCount} filtered
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {result.results.map((r) => (
          <PortRow key={r.port} row={r} />
        ))}
      </div>
    </div>
  );
}

function PortRow({ row }: { row: PortRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`inline-flex items-center justify-center min-w-[80px] text-[11px] font-bold px-2 py-1 rounded border ${
            TONE_BY_STATUS[row.status]
          }`}
        >
          {STATUS_LABEL[row.status]}
        </span>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-mono text-white">
            {row.port}
            {row.service ? (
              <span className="text-slate-500 font-sans"> · {row.service}</span>
            ) : null}
          </p>
          {row.error && (
            <p className="text-[11px] text-slate-500 truncate" title={row.error}>
              {row.error}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500 tabular-nums shrink-0">
        {row.latencyMs != null ? `${row.latencyMs} ms` : '—'}
      </p>
    </div>
  );
}
