'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, type SslCert } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type SslResult = Awaited<ReturnType<typeof api.tools.sslCheck>>;

const SUGGESTIONS = ['github.com', 'cloudflare.com', 'expired.badssl.com', 'self-signed.badssl.com'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function relativeDays(days: number | null): { label: string; tone: string } | null {
  if (days == null) return null;
  if (days < 0) {
    return {
      label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`,
      tone: 'text-red-400',
    };
  }
  if (days === 0) return { label: 'Expires today', tone: 'text-red-400' };
  if (days < 14) return { label: `${days} day${days === 1 ? '' : 's'} left`, tone: 'text-red-400' };
  if (days < 30) return { label: `${days} days left`, tone: 'text-amber-400' };
  return { label: `${days} days left`, tone: 'text-emerald-400' };
}

export default function SslCheckPage() {
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SslResult | null>(null);

  const submit = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.sslCheck(value);
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
              SSL certificate check<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Inspect the TLS certificate any HTTPS host presents — issuer, validity, SAN list,
              chain, and the protocol &amp; cipher negotiated during the handshake.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(host);
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="example.com"
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
                  Inspecting…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Inspect
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
                  setHost(s);
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
                Enter a hostname above to inspect its SSL certificate.
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
                Resolve A, AAAA, MX, TXT, NS and more.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor SSL expiry with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Get an email when the certificate is within 14 days of expiring.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: SslResult }) {
  if (result.error && !result.certificate) {
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
            <p className="text-red-400 font-bold text-lg">Handshake failed</p>
            <p className="text-slate-300 text-sm mt-1 break-words">{result.error}</p>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              {result.host}:{result.port}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ValidityHero result={result} />
      {result.certificate && <CertCard cert={result.certificate} />}
      {result.chain.length > 1 && <ChainCard chain={result.chain.slice(1)} />}
      <ConnectionCard result={result} />
    </div>
  );
}

function ValidityHero({ result }: { result: SslResult }) {
  const cert = result.certificate;
  const rel = cert ? relativeDays(cert.daysLeft) : null;
  const valid = result.authorized && result.hostnameMatches !== false;
  const tone = valid && (cert?.daysLeft ?? 1) > 14 ? 'emerald' : (cert?.daysLeft ?? 0) < 0 || !valid ? 'red' : 'amber';
  const toneBg: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30',
    amber: 'bg-amber-500/10 border-amber-500/30',
    red: 'bg-red-500/10 border-red-500/30',
  };
  const toneText: Record<string, string> = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={`border rounded-2xl p-5 sm:p-6 ${toneBg[tone]}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
          tone === 'emerald'
            ? 'bg-emerald-500/20 border-emerald-500/40'
            : tone === 'amber'
              ? 'bg-amber-500/20 border-amber-500/40'
              : 'bg-red-500/20 border-red-500/40'
        }`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={toneText[tone]}>
            {valid ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-lg ${toneText[tone]}`}>
            {valid
              ? rel?.tone === 'text-red-400'
                ? 'Certificate expired'
                : rel?.tone === 'text-amber-400'
                  ? 'Expiring soon'
                  : 'Certificate is valid'
              : 'Certificate has issues'}
          </p>
          <p className="text-slate-300 text-sm mt-1 truncate">
            <span className="font-mono">{result.host}</span>
            {result.port !== 443 ? `:${result.port}` : ''}
          </p>
          {rel && (
            <p className={`text-xs mt-1 ${rel.tone}`}>{rel.label}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Pill label="Chain" ok={result.authorized} okText="Trusted" badText="Untrusted" />
        <Pill
          label="Hostname"
          ok={result.hostnameMatches}
          okText="Matches"
          badText="Mismatch"
        />
        <Pill label="Self-signed" ok={!result.certificate?.selfSigned} okText="No" badText="Yes" />
      </div>

      {result.authorizationError && (
        <p className="text-xs text-red-300 mt-3">
          {result.authorizationError}
        </p>
      )}
    </div>
  );
}

function Pill({
  label,
  ok,
  okText,
  badText,
}: {
  label: string;
  ok: boolean | null;
  okText: string;
  badText: string;
}) {
  const tone = ok === null ? 'slate' : ok ? 'emerald' : 'red';
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    red: 'bg-red-500/15 border-red-500/30 text-red-300',
    slate: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  };
  return (
    <div className={`border rounded-lg px-3 py-2 ${bg[tone]}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{label}</p>
      <p className="text-xs font-semibold">{ok === null ? '—' : ok ? okText : badText}</p>
    </div>
  );
}

function CertCard({ cert }: { cert: SslCert }) {
  const rel = relativeDays(cert.daysLeft);
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04]">
        <h3 className="text-sm font-bold text-white">Certificate</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04]">
        <Cell label="Common name" value={cert.subject.CN} mono />
        <Cell label="Organization" value={cert.subject.O} />
        <Cell label="Issued by" value={cert.issuer.CN} mono />
        <Cell label="Issuer organization" value={cert.issuer.O} />
        <Cell label="Valid from" value={formatDate(cert.validFrom)} />
        <Cell
          label="Valid until"
          value={formatDate(cert.validUntil)}
          extra={rel?.label}
          extraTone={rel?.tone}
        />
        <Cell label="Key size" value={cert.keyBits ? `${cert.keyBits} bits` : null} />
        <Cell label="Serial" value={cert.serialNumber} mono />
      </div>

      {cert.altNames.length > 0 && (
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.04]">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2">
            Subject alternative names ({cert.altNames.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cert.altNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {cert.fingerprintSha256 && (
        <div className="px-5 sm:px-6 py-3 border-t border-white/[0.04]">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">
            SHA-256 fingerprint
          </p>
          <p className="text-[11px] font-mono text-slate-400 break-all">{cert.fingerprintSha256}</p>
        </div>
      )}
    </div>
  );
}

function ChainCard({ chain }: { chain: SslCert[] }) {
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Issuer chain</h3>
        <p className="text-xs text-slate-500">{chain.length}</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {chain.map((c, i) => (
          <div key={`${c.fingerprintSha256 ?? c.subject.CN}-${i}`} className="px-5 sm:px-6 py-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">
              {i === chain.length - 1 ? 'Root' : `Intermediate ${i + 1}`}
            </p>
            <p className="text-sm text-white font-mono truncate">{c.subject.CN ?? c.subject.O ?? '—'}</p>
            <p className="text-xs text-slate-500 truncate">
              Issued by {c.issuer.CN ?? c.issuer.O ?? 'unknown'} ·{' '}
              expires {formatDate(c.validUntil)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionCard({ result }: { result: SslResult }) {
  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04]">
        <h3 className="text-sm font-bold text-white">Connection</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04]">
        <Cell label="Protocol" value={result.protocol} mono />
        <Cell label="Cipher" value={result.cipher?.name ?? null} mono />
        <Cell label="Port" value={`${result.port}`} />
        <Cell label="Inspected at" value={new Date(result.fetchedAt).toLocaleString()} />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  mono = false,
  extra,
  extraTone,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  extra?: string | null;
  extraTone?: string;
}) {
  return (
    <div className="bg-[#11131a] px-5 sm:px-6 py-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">{label}</p>
      <p className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''} truncate`}>{value || '—'}</p>
      {extra && (
        <p className={`text-xs mt-0.5 font-medium ${extraTone ?? 'text-slate-400'}`}>{extra}</p>
      )}
    </div>
  );
}
