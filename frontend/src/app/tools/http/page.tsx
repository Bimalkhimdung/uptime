'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type HttpResult = Awaited<ReturnType<typeof api.tools.httpCheck>>;

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'] as const;
type Method = (typeof METHODS)[number];

const SUGGESTIONS = [
  'https://github.com',
  'https://httpbin.org/status/200',
  'https://httpbin.org/status/404',
  'https://httpbin.org/redirect/2',
];

function classify(status: number): { tone: string; label: string } {
  if (status === 0) return { tone: 'red', label: 'Failed' };
  if (status >= 500) return { tone: 'red', label: 'Server error' };
  if (status >= 400) return { tone: 'amber', label: 'Client error' };
  if (status >= 300) return { tone: 'violet', label: 'Redirect' };
  if (status >= 200) return { tone: 'emerald', label: 'Success' };
  return { tone: 'slate', label: 'Informational' };
}

const TONE_BG: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  red: 'bg-red-500/10 border-red-500/30 text-red-300',
  violet: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
  slate: 'bg-slate-500/10 border-slate-500/30 text-slate-300',
};

const TONE_TEXT: Record<string, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  violet: 'text-violet-400',
  slate: 'text-slate-300',
};

export default function HttpCheckPage() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<Method>('GET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HttpResult | null>(null);

  const submit = async (raw: string, m: Method = method) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.httpCheck(value, m);
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
              HTTP status check<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Send a one-shot request to any HTTP/S endpoint and inspect the response code,
              timing, headers, redirect chain, SSL certificate, and body preview.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(url);
            }}
            className="bg-[#11131a] border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-3 flex flex-col sm:flex-row gap-2"
          >
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="appearance-none bg-[#0f1217] border border-white/[0.04] rounded-xl px-3 py-3 sm:py-3.5 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500/40 transition-colors"
            >
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-[#0f1217]">
                  {m}
                </option>
              ))}
            </select>
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-[#0f1217] border border-white/[0.04] rounded-xl pl-11 pr-4 py-3 sm:py-3.5 text-white text-base placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 mb-8 text-xs text-slate-500">
            <span>Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setUrl(s);
                  submit(s);
                }}
                className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:text-slate-300 transition-colors"
              >
                {s.replace('https://', '')}
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
                Enter a URL above to check its HTTP response.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/dns"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                DNS lookup →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Inspect A, AAAA, MX, TXT, NS, and more records.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor this URL with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Per-minute checks, instant alerts when the status changes.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: HttpResult }) {
  if (result.error && result.statusCode === 0) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-red-400 font-bold text-lg">Request failed</p>
            <p className="text-slate-300 text-sm mt-1 break-words">{result.error}</p>
            <p className="text-xs text-slate-500 mt-2">
              {result.method} {result.url} · {result.responseTimeMs}ms
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StatusCard result={result} />
      {result.redirects.length > 0 && <RedirectsCard redirects={result.redirects} />}
      {result.ssl && <SslCard ssl={result.ssl} />}
      <HeadersCard headers={result.headers} />
      {result.bodyPreview != null && (
        <BodyCard
          contentType={result.contentType}
          body={result.bodyPreview}
          truncated={result.bodyTruncated}
        />
      )}
    </div>
  );
}

function StatusCard({ result }: { result: HttpResult }) {
  const cls = classify(result.statusCode);
  return (
    <div className={`border rounded-2xl overflow-hidden ${TONE_BG[cls.tone]}`}>
      <div className="px-5 sm:px-6 py-5 flex flex-wrap items-center gap-4">
        <p className={`text-5xl font-black tracking-tight ${TONE_TEXT[cls.tone]} tabular-nums`}>
          {result.statusCode || '—'}
        </p>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">
            {result.statusText || cls.label}
          </p>
          <p className="text-xs text-slate-400 truncate" title={result.finalUrl}>
            {result.method} {result.finalUrl}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Metric label="Time" value={`${result.responseTimeMs} ms`} />
          {result.contentType && (
            <Metric label="Type" value={result.contentType.split(';')[0]} />
          )}
          {result.contentLength != null && (
            <Metric label="Size" value={formatBytes(result.contentLength)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className="text-sm text-slate-200 tabular-nums">{value}</p>
    </div>
  );
}

function RedirectsCard({
  redirects,
}: {
  redirects: HttpResult['redirects'];
}) {
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Redirects</h3>
        <p className="text-xs text-slate-500">{redirects.length} hop{redirects.length === 1 ? '' : 's'}</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {redirects.map((r, i) => (
          <div key={i} className="px-5 sm:px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="inline-flex items-center justify-center min-w-[36px] text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                {r.statusCode}
              </span>
              <span>Hop {i + 1}</span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate" title={r.from}>{r.from}</p>
            <p className="text-sm text-white font-mono truncate" title={r.to}>↳ {r.to}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SslCard({ ssl }: { ssl: NonNullable<HttpResult['ssl']> }) {
  const tone = !ssl.authorized
    ? 'text-red-400'
    : ssl.daysLeft != null && ssl.daysLeft < 14
      ? 'text-amber-400'
      : 'text-emerald-400';
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04]">
        <h3 className="text-sm font-bold text-white">SSL certificate</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04]">
        <Cell label="Subject" value={ssl.subject} />
        <Cell label="Issuer" value={ssl.issuer} />
        <Cell label="Valid from" value={formatDate(ssl.validFrom)} />
        <Cell
          label="Valid until"
          value={formatDate(ssl.validUntil)}
          extra={ssl.daysLeft != null ? `${ssl.daysLeft} day${Math.abs(ssl.daysLeft) === 1 ? '' : 's'} left` : null}
          extraTone={tone}
        />
      </div>
      {!ssl.authorized && (
        <div className="px-5 sm:px-6 py-3 border-t border-red-500/20 bg-red-500/5">
          <p className="text-xs text-red-400">
            Certificate did not pass full chain validation — could be self-signed, expired, or
            hostname-mismatched.
          </p>
        </div>
      )}
    </div>
  );
}

function HeadersCard({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0) return null;
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Response headers</h3>
        <p className="text-xs text-slate-500">{entries.length}</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-1 sm:gap-3 px-5 sm:px-6 py-2.5">
            <p className="text-xs text-slate-500 font-mono break-all">{k}</p>
            <p className="text-xs text-slate-200 font-mono break-all">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyCard({
  contentType,
  body,
  truncated,
}: {
  contentType: string | null;
  body: string;
  truncated: boolean;
}) {
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white">Response body</h3>
        <p className="text-xs text-slate-500">
          {contentType?.split(';')[0] ?? 'unknown'}
          {truncated ? ' · truncated' : ''}
        </p>
      </div>
      <pre className="text-[12px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-all bg-[#0c0e13] m-4 p-4 rounded-xl max-h-[400px] overflow-y-auto">
{body}
      </pre>
    </div>
  );
}

function Cell({
  label,
  value,
  extra,
  extraTone,
}: {
  label: string;
  value: string | null;
  extra?: string | null;
  extraTone?: string;
}) {
  return (
    <div className="bg-[#11131a] px-5 sm:px-6 py-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">{label}</p>
      <p className="text-sm text-slate-200 truncate">{value || '—'}</p>
      {extra && (
        <p className={`text-xs mt-0.5 font-medium ${extraTone ?? 'text-slate-400'}`}>{extra}</p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
