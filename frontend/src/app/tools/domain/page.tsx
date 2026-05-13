'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type DomainResult = Awaited<ReturnType<typeof api.tools.checkDomain>>;
type SuggestionsResult = Awaited<ReturnType<typeof api.tools.domainSuggestions>>;
type Suggestion = SuggestionsResult['suggestions'][number];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function relativeDays(iso: string | null): { label: string; tone: string } | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (isNaN(target)) return null;
  const diffMs = target - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (days < 0) {
    return {
      label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`,
      tone: 'text-red-400',
    };
  }
  if (days === 0) return { label: 'Expires today', tone: 'text-red-400' };
  if (days < 30) return { label: `in ${days} day${days === 1 ? '' : 's'}`, tone: 'text-red-400' };
  if (days < 90) return { label: `in ${days} days`, tone: 'text-amber-400' };
  if (days < 365) return { label: `in ${days} days`, tone: 'text-emerald-400' };
  const years = Math.floor(days / 365);
  return {
    label: `in ${years} year${years === 1 ? '' : 's'} (${days} days)`,
    tone: 'text-emerald-400',
  };
}

const SUGGESTIONS = ['google.com', 'github.com', 'vercel.com', 'this-domain-is-unlikely-12345.com'];

export default function DomainCheckPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DomainResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const submit = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestions(null);
    setSuggestionsLoading(false);
    try {
      const data = await api.tools.checkDomain(value);
      setResult(data);
      // Kick off suggestions in the background — don't block the main result on it.
      setSuggestionsLoading(true);
      api.tools
        .domainSuggestions(value)
        .then((s) => setSuggestions(s.suggestions))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
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
              Domain name check<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Type a domain and we&apos;ll check if it&apos;s available to register, plus surface
              the registrar, creation, expiry, and nameservers if it&apos;s taken.
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
                  Checking…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Check
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

          {result && <ResultCard result={result} />}

          {result && (suggestionsLoading || suggestions) && (
            <SuggestionsSection
              suggestions={suggestions}
              loading={suggestionsLoading}
              onPick={(d) => {
                setDomain(d);
                submit(d);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            />
          )}

          {!result && !error && !loading && (
            <div className="bg-[#11131a] border border-white/[0.04] rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">
                Enter a domain above to see if it&apos;s available.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor your domain with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Get SSL + expiry alerts and HTTP health checks every minute.
              </p>
            </Link>
            <Link
              href="/"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                More free tools →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                SSL check, DNS lookup, HTTP status. (Coming soon.)
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultCard({ result }: { result: DomainResult }) {
  if (result.available) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/0 border border-emerald-500/30 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-emerald-400 font-bold text-lg">Available</p>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-mono">{result.domain}</span> is open to register.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          WHOIS reports no registration on file. Availability can change in real time — confirm with
          your registrar before assuming it&apos;s still free.
        </p>
      </div>
    );
  }

  const expiryRel = relativeDays(result.expiresAt);
  const expired = expiryRel?.tone === 'text-red-400' && (result.daysLeft ?? 0) <= 0;

  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="bg-red-500/5 border-b border-red-500/10 px-5 sm:px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-red-400 font-bold text-lg">Taken</p>
            {expired && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                Expired
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm truncate">
            <span className="text-white font-mono">{result.domain}</span> is registered.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04]">
        <Cell label="Registrar" value={result.registrar} mono={false} />
        <Cell label="Created on" value={formatDate(result.createdAt)} />
        <ExpiresCell
          label="Expires on"
          date={result.expiresAt}
          rel={expiryRel}
        />
        <Cell label="Last updated" value={formatDate(result.updatedAt)} />
        <Cell
          label="Nameservers"
          value={result.nameservers.length ? result.nameservers.join('\n') : '—'}
          mono
          multiline
        />
      </div>

      {result.status.length > 0 && (
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.04]">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-2">Status flags</p>
          <div className="flex flex-wrap gap-1.5">
            {result.status.slice(0, 8).map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06] font-mono"
              >
                {s.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  loading,
  onPick,
}: {
  suggestions: Suggestion[] | null;
  loading: boolean;
  onPick: (domain: string) => void;
}) {
  const available = suggestions?.filter((s) => s.available === true) ?? [];
  const unknown = suggestions?.filter((s) => s.available === null) ?? [];
  const taken = suggestions?.filter((s) => s.available === false) ?? [];

  return (
    <div className="mt-4 bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <h2 className="text-white font-bold text-base sm:text-lg">
          Similar domains<span className="text-emerald-400">.</span>
        </h2>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            <span className="w-3 h-3 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
            Checking availability…
          </span>
        ) : suggestions && suggestions.length > 0 ? (
          <span className="text-[11px] text-slate-500">
            {available.length} available · {taken.length} taken
            {unknown.length > 0 ? ` · ${unknown.length} unknown` : ''}
          </span>
        ) : null}
      </div>

      <div className="divide-y divide-white/[0.04]">
        {loading && !suggestions
          ? Array.from({ length: 6 }).map((_, i) => (
              <SuggestionRowSkeleton key={i} />
            ))
          : suggestions && suggestions.length > 0
            ? suggestions.map((s) => (
                <SuggestionRow key={s.domain} suggestion={s} onPick={onPick} />
              ))
            : (
              <p className="px-5 sm:px-6 py-6 text-sm text-slate-500 text-center">
                No suggestions to show.
              </p>
            )}
      </div>

      {suggestions && suggestions.some((s) => s.available && s.priceUsd) && (
        <p className="px-5 sm:px-6 py-3 text-[11px] text-slate-600 border-t border-white/[0.04]">
          Prices are indicative first-year rates in USD. Final cost depends on your registrar and renewal terms.
        </p>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onPick,
}: {
  suggestion: Suggestion;
  onPick: (domain: string) => void;
}) {
  const { domain, available } = suggestion;

  let badge: React.ReactNode;
  if (available === true) {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available
      </span>
    );
  } else if (available === false) {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Taken
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Unknown
      </span>
    );
  }

  const showPrice = suggestion.available === true && suggestion.priceUsd != null;

  return (
    <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="min-w-0 flex items-center gap-3 flex-1">
        {badge}
        <p className="text-sm sm:text-base font-mono text-white truncate">
          {domain}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showPrice && (
          <span
            className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md"
            title="Indicative first-year registration price"
          >
            from ${suggestion.priceUsd!.toFixed(2)}/yr
          </span>
        )}
        <button
          type="button"
          onClick={() => onPick(domain)}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors"
        >
          Check →
        </button>
      </div>
    </div>
  );
}

function SuggestionRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="h-6 w-20 rounded bg-white/[0.04] animate-pulse" />
        <span className="h-4 w-40 rounded bg-white/[0.04] animate-pulse" />
      </div>
      <span className="h-4 w-12 rounded bg-white/[0.04] animate-pulse" />
    </div>
  );
}

function ExpiresCell({
  label,
  date,
  rel,
}: {
  label: string;
  date: string | null;
  rel: { label: string; tone: string } | null;
}) {
  return (
    <div className="bg-[#11131a] px-5 sm:px-6 py-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">{label}</p>
      <p className="text-sm text-slate-200 truncate">{formatDate(date)}</p>
      {rel && (
        <p className={`text-xs mt-0.5 font-medium ${rel.tone}`}>{rel.label}</p>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  mono = false,
  multiline = false,
  valueClass,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  multiline?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#11131a] px-5 sm:px-6 py-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1">{label}</p>
      <p
        className={`text-sm ${valueClass ?? 'text-slate-200'} ${mono ? 'font-mono' : ''} ${
          multiline ? 'whitespace-pre-line' : 'truncate'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}
