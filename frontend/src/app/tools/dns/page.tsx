'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type DnsResult = Awaited<ReturnType<typeof api.tools.dnsLookup>>;
type DnsSet = DnsResult['sets'][number];
type DnsRecord = DnsSet['records'][number];

const TYPES = ['ALL', 'A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA'] as const;
type DnsType = (typeof TYPES)[number];

const TYPE_DESCRIPTION: Record<DnsType, string> = {
  ALL: 'All record types',
  A: 'IPv4 address',
  AAAA: 'IPv6 address',
  MX: 'Mail exchange',
  TXT: 'Text — SPF, DKIM, verification',
  NS: 'Authoritative nameservers',
  CNAME: 'Canonical alias',
  SOA: 'Start of authority',
  CAA: 'Certificate authority authorization',
};

const TONE_BY_TYPE: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  AAAA: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  MX: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  TXT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  NS: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  CNAME: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  SOA: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CAA: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
};

const SUGGESTIONS = ['google.com', 'github.com', 'cloudflare.com', 'nepsesignal.com'];

export default function DnsLookupPage() {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<DnsType>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DnsResult | null>(null);

  const submit = async (raw: string, t: DnsType = type) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.dnsLookup(value, t);
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
              DNS lookup<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Resolve a domain&apos;s A, AAAA, MX, TXT, NS, CNAME, SOA, and CAA records
              against the authoritative chain — straight from your browser.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(domain);
            }}
            className="bg-[#11131a] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-3 flex flex-col sm:flex-row gap-2"
          >
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
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-[#0f1217] border border-white/[0.04] rounded-xl pl-11 pr-4 py-3 sm:py-3.5 text-white text-base placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Resolving…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Look up
                </>
              )}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5 mb-6">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (domain.trim()) submit(domain, t);
                }}
                title={TYPE_DESCRIPTION[t]}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                  type === t
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-[#11131a] text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-8 text-xs text-slate-500">
            <span>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setDomain(s);
                  submit(s);
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
                Enter a domain above to look up its DNS records.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/domain"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Domain name check →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Is the domain registered? WHOIS + expiry, plus alternative TLDs.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor this domain with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Get DNS, SSL, and HTTP health alerts when records change or fail.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: DnsResult }) {
  const nonEmpty = result.sets.filter((s) => s.records.length > 0 || s.error);
  const totalRecords = result.sets.reduce((sum, s) => sum + s.records.length, 0);

  if (nonEmpty.length === 0) {
    return (
      <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl p-8 text-center">
        <p className="text-slate-400 text-sm">
          No records found for <span className="text-white font-mono">{result.host}</span>.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          The domain might not exist, or it has no records of the selected type(s).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Resolved</p>
          <p className="text-white font-mono text-sm sm:text-base truncate">{result.host}</p>
        </div>
        <p className="text-xs text-slate-500 shrink-0">
          {totalRecords} record{totalRecords === 1 ? '' : 's'} · {nonEmpty.length} type
          {nonEmpty.length === 1 ? '' : 's'}
        </p>
      </div>

      {nonEmpty.map((set) => (
        <RecordSetCard key={set.type} set={set} />
      ))}
    </div>
  );
}

function RecordSetCard({ set }: { set: DnsSet }) {
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center min-w-[44px] text-[11px] font-bold px-2 py-1 rounded border ${
              TONE_BY_TYPE[set.type] ?? TONE_BY_TYPE.SOA
            }`}
          >
            {set.type}
          </span>
          <p className="text-xs text-slate-500">{TYPE_DESCRIPTION[set.type as DnsType]}</p>
        </div>
        <p className="text-xs text-slate-500">
          {set.records.length} record{set.records.length === 1 ? '' : 's'}
        </p>
      </div>

      {set.error ? (
        <div className="px-5 sm:px-6 py-4 text-sm text-red-400">{set.error}</div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {set.records.map((r, i) => (
            <RecordRow key={`${r.value}-${i}`} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({ record }: { record: DnsRecord }) {
  return (
    <div className="px-5 sm:px-6 py-3 flex items-start gap-3">
      {record.priority != null && (
        <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06] shrink-0">
          P{record.priority}
        </span>
      )}
      <p className="text-sm font-mono text-white break-all flex-1">{record.value}</p>
      <CopyButton text={record.value} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
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
      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
      title={copied ? 'Copied' : 'Copy value'}
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
