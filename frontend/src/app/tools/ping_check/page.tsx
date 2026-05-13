'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type PingResult = Awaited<ReturnType<typeof api.tools.ping>>;
type Packet = PingResult['packets'][number];

const SUGGESTIONS = ['google.com', 'github.com', '1.1.1.1', 'cloudflare.com'];
const COUNTS = [3, 4, 5, 8, 10];

export default function PingPage() {
  const [host, setHost] = useState('');
  const [mode, setMode] = useState<'icmp' | 'tcp'>('icmp');
  const [count, setCount] = useState(4);
  const [port, setPort] = useState(443);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PingResult | null>(null);

  const submit = async (override?: { host?: string }) => {
    const h = (override?.host ?? host).trim();
    if (!h) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.ping(h, {
        mode,
        count,
        port: mode === 'tcp' ? port : undefined,
      });
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Ping failed.');
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
              Ping<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Measure round-trip latency to any host. ICMP by default, with a TCP-handshake
              fallback for networks that block ICMP echo.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="bg-[#11131a] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-3 space-y-3"
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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
              <button
                type="submit"
                disabled={loading || !host.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Pinging…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Ping
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[#0f1217] border border-white/[0.04] p-1">
                {(['icmp', 'tcp'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                      mode === m
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                    title={
                      m === 'icmp'
                        ? 'Classic echo ping — may be blocked by firewalls.'
                        : 'TCP handshake against a port — works even when ICMP is blocked.'
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-2">
                <label className="text-[11px] text-slate-500" htmlFor="ping-count">Count</label>
                <select
                  id="ping-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="appearance-none bg-[#0f1217] border border-white/[0.04] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/40 transition-colors"
                >
                  {COUNTS.map((n) => (
                    <option key={n} value={n} className="bg-[#0f1217]">
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'tcp' && (
                <div className="inline-flex items-center gap-2">
                  <label className="text-[11px] text-slate-500" htmlFor="ping-port">Port</label>
                  <input
                    id="ping-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || 443)}
                    className="w-20 bg-[#0f1217] border border-white/[0.04] rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/40 transition-colors"
                  />
                </div>
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
                Enter a host above and hit Ping to measure latency.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/port_scan"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Port check →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Probe TCP/UDP ports for open services.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor latency continuously →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Alerts on slow response and packet loss across regions.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: PingResult }) {
  const loss = result.summary.lossPercent;
  const tone =
    loss >= 50
      ? 'red'
      : loss > 0 || (result.summary.avgMs ?? 0) > 200
        ? 'amber'
        : 'emerald';
  const toneBg: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
  };

  // Compute the max RTT for bar scaling.
  const maxRtt = Math.max(
    1,
    ...result.packets.map((p) => p.rttMs ?? 0),
  );

  return (
    <div className="space-y-3">
      {result.fallbackReason && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-3 text-amber-300 text-xs">
          {result.fallbackReason}
        </div>
      )}

      <div className={`border rounded-2xl px-5 sm:px-6 py-4 ${toneBg[tone]}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">
              {result.mode.toUpperCase()} ping · {result.host}
              {result.port ? ` :${result.port}` : ''}
              {result.resolvedIp ? ` (${result.resolvedIp})` : ''}
            </p>
            <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
              {result.summary.avgMs != null
                ? `${result.summary.avgMs.toFixed(2)} ms avg`
                : 'No replies'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Stat label="Sent" value={`${result.summary.sent}`} />
            <Stat
              label="Received"
              value={`${result.summary.received}`}
              tone={result.summary.received === result.summary.sent ? 'good' : 'bad'}
            />
            <Stat
              label="Loss"
              value={`${result.summary.lossPercent}%`}
              tone={loss === 0 ? 'good' : loss < 50 ? 'warn' : 'bad'}
            />
          </div>
        </div>

        {result.summary.minMs != null && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10">
            <Metric label="Min" value={`${result.summary.minMs!.toFixed(2)} ms`} />
            <Metric label="Avg" value={`${result.summary.avgMs!.toFixed(2)} ms`} />
            <Metric label="Max" value={`${result.summary.maxMs!.toFixed(2)} ms`} />
            <Metric label="Stddev" value={`${result.summary.stddevMs!.toFixed(2)} ms`} />
          </div>
        )}
      </div>

      <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04]">
          <h3 className="text-sm font-bold text-white">Packets</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {result.packets.map((p) => (
            <PacketRow key={p.seq} packet={p} maxRtt={maxRtt} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass: Record<string, string> = {
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-red-300',
  };
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone ? toneClass[tone] : ''}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className="text-sm text-white tabular-nums">{value}</p>
    </div>
  );
}

function PacketRow({ packet, maxRtt }: { packet: Packet; maxRtt: number }) {
  const ok = packet.status === 'ok' && packet.rttMs != null;
  const pct = ok ? Math.max(2, Math.min(100, (packet.rttMs! / maxRtt) * 100)) : 0;
  const toneBar = ok ? 'bg-emerald-500/70' : 'bg-red-500/40';
  return (
    <div className="px-5 sm:px-6 py-2.5 grid grid-cols-[40px_minmax(0,1fr)_90px] items-center gap-3">
      <span className="text-[11px] font-mono text-slate-500 tabular-nums">#{packet.seq}</span>
      <div className="h-2.5 bg-[#0c0e13] rounded-sm overflow-hidden">
        <div className={`h-full ${toneBar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-right font-mono tabular-nums">
        {ok ? (
          <span className="text-emerald-300">{packet.rttMs!.toFixed(2)} ms</span>
        ) : (
          <span className="text-red-400" title={packet.error ?? ''}>
            {packet.status}
          </span>
        )}
      </span>
    </div>
  );
}
