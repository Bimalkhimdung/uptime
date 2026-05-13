'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';

type CurlResult = Awaited<ReturnType<typeof api.tools.curl>>;
type Header = { id: number; name: string; value: string };

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
type Method = (typeof METHODS)[number];

const BODY_PRESETS: Array<{ label: string; contentType: string; sample: string }> = [
  { label: 'JSON', contentType: 'application/json', sample: '{\n  "key": "value"\n}' },
  { label: 'Form', contentType: 'application/x-www-form-urlencoded', sample: 'key1=value1&key2=value2' },
  { label: 'Text', contentType: 'text/plain', sample: 'hello world' },
];

function classify(status: number): { tone: string; label: string } {
  if (status === 0) return { tone: 'red', label: 'Failed' };
  if (status >= 500) return { tone: 'red', label: 'Server error' };
  if (status >= 400) return { tone: 'amber', label: 'Client error' };
  if (status >= 300) return { tone: 'violet', label: 'Redirect' };
  if (status >= 200) return { tone: 'emerald', label: 'Success' };
  return { tone: 'slate', label: 'Informational' };
}

const TONE_TEXT: Record<string, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  violet: 'text-violet-400',
  slate: 'text-slate-300',
};

const TONE_BORDER: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/30',
  amber: 'bg-amber-500/10 border-amber-500/30',
  red: 'bg-red-500/10 border-red-500/30',
  violet: 'bg-violet-500/10 border-violet-500/30',
  slate: 'bg-slate-500/10 border-slate-500/30',
};

function buildCurlCommand(spec: {
  url: string;
  method: Method;
  headers: Header[];
  body: string;
}): string {
  const parts: string[] = [`curl -X ${spec.method}`];
  for (const h of spec.headers) {
    if (!h.name.trim()) continue;
    parts.push(`-H ${shellQuote(`${h.name}: ${h.value}`)}`);
  }
  if (spec.body.trim() && spec.method !== 'GET' && spec.method !== 'HEAD') {
    parts.push(`--data ${shellQuote(spec.body)}`);
  }
  parts.push(shellQuote(spec.url));
  return parts.join(' \\\n  ');
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

// Tokenize a shell command into args, respecting single/double quotes,
// backslash escapes, and line continuations.
function tokenizeShell(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let hasCurrent = false;
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (inSingle) {
      if (c === "'") {
        inSingle = false;
      } else {
        current += c;
      }
      i++;
      continue;
    }
    if (inDouble) {
      if (c === '"') {
        inDouble = false;
      } else if (c === '\\' && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`' || next === '\n') {
          current += next;
          i += 2;
          continue;
        }
        current += c;
        i++;
      } else {
        current += c;
        i++;
      }
      continue;
    }
    if (c === "'") {
      inSingle = true;
      hasCurrent = true;
      i++;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      hasCurrent = true;
      i++;
      continue;
    }
    if (c === '\\' && i + 1 < input.length) {
      const next = input[i + 1];
      if (next === '\n' || next === '\r') {
        // line continuation — skip both, and skip a following \n after \r
        i += 2;
        if (next === '\r' && input[i] === '\n') i++;
        continue;
      }
      current += next;
      hasCurrent = true;
      i += 2;
      continue;
    }
    if (/\s/.test(c)) {
      if (hasCurrent) {
        tokens.push(current);
        current = '';
        hasCurrent = false;
      }
      i++;
      continue;
    }
    current += c;
    hasCurrent = true;
    i++;
  }
  if (hasCurrent) tokens.push(current);
  return tokens;
}

type ParsedCurl = {
  url: string;
  method: Method;
  headers: Array<{ name: string; value: string }>;
  body: string;
  followRedirects: boolean;
};

const SUPPORTED_METHODS: Method[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

// Parses a curl command string into a ParsedCurl spec. Best-effort: silently
// drops flags it doesn't understand, so a real shell command with -o, -s, etc.
// still imports cleanly.
function parseCurl(raw: string): ParsedCurl | { error: string } {
  let tokens = tokenizeShell(raw.trim());
  if (tokens.length === 0) return { error: 'Empty command.' };
  // Strip leading `curl` (or `curl.exe`, or `$ curl`).
  if (tokens[0] === '$' || tokens[0] === '>') tokens = tokens.slice(1);
  if (/^curl(\.exe)?$/i.test(tokens[0] ?? '')) tokens = tokens.slice(1);

  let url = '';
  let method: Method | null = null;
  const headers: Array<{ name: string; value: string }> = [];
  let body = '';
  let followRedirects = false;

  // Flags that take a value (read the next token).
  const valueFlags = new Set([
    '-X',
    '--request',
    '-H',
    '--header',
    '-d',
    '--data',
    '--data-raw',
    '--data-binary',
    '--data-ascii',
    '--data-urlencode',
    '-u',
    '--user',
    '-A',
    '--user-agent',
    '-e',
    '--referer',
    '-b',
    '--cookie',
    '-o',
    '--output',
    '--connect-timeout',
    '--max-time',
    '--retry',
    '--write-out',
    '-w',
    '--resolve',
    '--cacert',
    '--cert',
    '--key',
    '--proxy',
    '-x',
    '--form',
    '-F',
  ]);

  // Boolean flags we want to honor.
  const booleanFlags = new Set(['-L', '--location']);

  const addHeader = (name: string, value: string) => {
    const n = name.trim();
    if (!n) return;
    headers.push({ name: n, value: value.trim() });
  };

  const setBody = (value: string) => {
    body = body ? `${body}&${value}` : value;
    if (!method) method = 'POST';
  };

  for (let i = 0; i < tokens.length; i++) {
    let flag = tokens[i];
    let inlineValue: string | null = null;
    if (flag.startsWith('--') && flag.includes('=')) {
      const eq = flag.indexOf('=');
      inlineValue = flag.slice(eq + 1);
      flag = flag.slice(0, eq);
    }

    const consumeValue = (): string | null => {
      if (inlineValue !== null) return inlineValue;
      if (i + 1 < tokens.length) {
        i++;
        return tokens[i];
      }
      return null;
    };

    if (flag === '-X' || flag === '--request') {
      const v = consumeValue();
      if (v && SUPPORTED_METHODS.includes(v.toUpperCase() as Method)) {
        method = v.toUpperCase() as Method;
      }
      continue;
    }
    if (flag === '-H' || flag === '--header') {
      const v = consumeValue();
      if (v) {
        const colon = v.indexOf(':');
        if (colon > -1) {
          addHeader(v.slice(0, colon), v.slice(colon + 1));
        }
      }
      continue;
    }
    if (
      flag === '-d' ||
      flag === '--data' ||
      flag === '--data-raw' ||
      flag === '--data-binary' ||
      flag === '--data-ascii' ||
      flag === '--data-urlencode'
    ) {
      const v = consumeValue();
      if (v != null) setBody(v);
      continue;
    }
    if (flag === '-u' || flag === '--user') {
      const v = consumeValue();
      if (v) {
        try {
          addHeader('Authorization', `Basic ${btoa(v)}`);
        } catch {
          // ignore base64 encoding errors
        }
      }
      continue;
    }
    if (flag === '-A' || flag === '--user-agent') {
      const v = consumeValue();
      if (v) addHeader('User-Agent', v);
      continue;
    }
    if (flag === '-e' || flag === '--referer') {
      const v = consumeValue();
      if (v) addHeader('Referer', v);
      continue;
    }
    if (flag === '-b' || flag === '--cookie') {
      const v = consumeValue();
      if (v) addHeader('Cookie', v);
      continue;
    }
    if (flag === '-L' || flag === '--location') {
      followRedirects = true;
      continue;
    }
    if (booleanFlags.has(flag)) {
      continue;
    }
    if (valueFlags.has(flag)) {
      // Consume the value but don't act on it.
      consumeValue();
      continue;
    }
    // Other --long-option that takes no value — ignore.
    if (flag.startsWith('-')) continue;
    // Positional: treat first as the URL.
    if (!url) {
      url = flag;
      // Normalize: strip any wrapping that survived tokenization (rare).
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
    }
  }

  if (!url) return { error: 'No URL found in the command.' };
  return {
    url,
    method: method ?? 'GET',
    headers,
    body,
    followRedirects,
  };
}

export default function CurlPage() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<Method>('GET');
  const [headers, setHeaders] = useState<Header[]>([
    { id: 1, name: '', value: '' },
  ]);
  const [body, setBody] = useState('');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [tab, setTab] = useState<'headers' | 'body' | 'curl'>('headers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CurlResult | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const importFromCurl = () => {
    const parsed = parseCurl(importInput);
    if ('error' in parsed) {
      setImportError(parsed.error);
      return;
    }
    setUrl(parsed.url);
    setMethod(parsed.method);
    setBody(parsed.body);
    setFollowRedirects(parsed.followRedirects);
    setHeaders(
      parsed.headers.length > 0
        ? parsed.headers.map((h, i) => ({ id: Date.now() + i, ...h }))
        : [{ id: Date.now(), name: '', value: '' }],
    );
    if (parsed.body) setTab('body');
    else if (parsed.headers.length > 0) setTab('headers');
    setImportError(null);
    setImportOpen(false);
    setImportInput('');
  };

  const bodyAllowed = method !== 'GET' && method !== 'HEAD';

  const curlCmd = useMemo(
    () => buildCurlCommand({ url, method, headers, body }),
    [url, method, headers, body],
  );

  const updateHeader = (id: number, patch: Partial<Header>) => {
    setHeaders((rows) => rows.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };
  const addHeader = () => {
    setHeaders((rows) => [...rows, { id: Date.now(), name: '', value: '' }]);
  };
  const removeHeader = (id: number) => {
    setHeaders((rows) => (rows.length === 1 ? rows : rows.filter((h) => h.id !== id)));
  };
  const applyBodyPreset = (preset: (typeof BODY_PRESETS)[number]) => {
    setBody(preset.sample);
    setHeaders((rows) => {
      const filtered = rows.filter(
        (h) => h.name.trim().toLowerCase() !== 'content-type',
      );
      return [
        ...filtered,
        { id: Date.now(), name: 'Content-Type', value: preset.contentType },
      ];
    });
    setTab('body');
  };

  const submit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tools.curl({
        url: url.trim(),
        method,
        headers: headers
          .filter((h) => h.name.trim())
          .map((h) => ({ name: h.name.trim(), value: h.value })),
        body: bodyAllowed ? body : undefined,
        followRedirects,
      });
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Request failed.');
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
              Online curl<span className="text-emerald-400">.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Build a full HTTP request with custom headers and a body, fire it from our server,
              and inspect everything that comes back. Copy the equivalent curl command at any time.
            </p>
          </div>

          {/* Request builder */}
          <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden mb-3">
            <div className="px-3 sm:px-4 pt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setImportOpen((o) => !o);
                  setImportError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                title="Paste a curl command (e.g. from browser DevTools)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {importOpen ? 'Cancel' : 'Paste curl command'}
              </button>
            </div>

            {importOpen && (
              <div className="px-3 sm:px-4 pt-2 pb-3 border-b border-white/[0.04]">
                <textarea
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder={"curl 'https://api.example.com/users' \\\n  -H 'Accept: application/json' \\\n  -H 'Authorization: Bearer …' \\\n  --data-raw '{\"name\":\"Ada\"}'"}
                  spellCheck={false}
                  rows={5}
                  className="w-full bg-[#0c0e13] border border-white/[0.04] rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors resize-y"
                />
                {importError && (
                  <p className="text-xs text-red-400 mt-1.5">{importError}</p>
                )}
                <div className="flex items-center justify-between mt-2 gap-2">
                  <p className="text-[11px] text-slate-500">
                    Supports DevTools &quot;Copy as cURL&quot;: <code className="text-slate-400">-X / -H / -d / --data* / -L / -u / -A / -e / -b</code>.
                  </p>
                  <button
                    type="button"
                    onClick={importFromCurl}
                    disabled={!importInput.trim()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="p-3 sm:p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-2">
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
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/resource"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="flex-1 bg-[#0f1217] border border-white/[0.04] rounded-xl px-4 py-3 sm:py-3.5 text-white text-base placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
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
                    'Send'
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followRedirects}
                    onChange={(e) => setFollowRedirects(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  Follow redirects
                </label>
              </div>
            </form>

            {/* Tabs */}
            <div className="border-t border-white/[0.04] flex items-center gap-1 px-3 sm:px-4 pt-2 overflow-x-auto">
              {(['headers', 'body', 'curl'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-t-md transition-colors border-b-2 ${tab === t
                      ? 'text-emerald-300 border-emerald-400'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                >
                  {t === 'curl' ? 'curl command' : t}
                  {t === 'headers' && headers.filter((h) => h.name.trim()).length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-white/[0.04] text-slate-400 rounded px-1.5 py-0.5">
                      {headers.filter((h) => h.name.trim()).length}
                    </span>
                  )}
                  {t === 'body' && body.trim() && bodyAllowed && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {tab === 'headers' && (
              <div className="p-3 sm:p-4 space-y-2">
                {headers.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={h.name}
                      onChange={(e) => updateHeader(h.id, { name: e.target.value })}
                      placeholder="Header"
                      className="flex-1 min-w-0 bg-[#0f1217] border border-white/[0.04] rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                    <input
                      type="text"
                      value={h.value}
                      onChange={(e) => updateHeader(h.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 min-w-0 bg-[#0f1217] border border-white/[0.04] rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(h.id)}
                      disabled={headers.length === 1}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeader}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1"
                >
                  + Add header
                </button>
              </div>
            )}

            {tab === 'body' && (
              <div className="p-3 sm:p-4 space-y-2">
                {!bodyAllowed ? (
                  <p className="text-xs text-slate-500 px-1 py-2">
                    {method} requests don&apos;t carry a body.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[11px] text-slate-500 mr-1">Quick start:</span>
                      {BODY_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => applyBodyPreset(p)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#0f1217] text-slate-300 border border-white/[0.06] hover:bg-white/[0.04] hover:text-white transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Request body…"
                      spellCheck={false}
                      rows={8}
                      className="w-full bg-[#0c0e13] border border-white/[0.04] rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 transition-colors resize-y"
                    />
                  </>
                )}
              </div>
            )}

            {tab === 'curl' && (
              <div className="p-3 sm:p-4">
                <div className="relative bg-[#0c0e13] border border-white/[0.04] rounded-lg p-3 pr-12">
                  <pre className="text-[12px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-all">
                    {curlCmd}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={curlCmd} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 mt-2">
                  Paste this into your terminal to reproduce the exact request locally.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {result && <ResultSection result={result} />}

          {!result && !error && !loading && (
            <div className="bg-[#11131a] border border-white/[0.04] rounded-2xl p-8 text-center mt-3">
              <p className="text-slate-500 text-sm">
                Set a URL and hit <span className="text-emerald-400 font-semibold">Send</span> to inspect the response.
              </p>
            </div>
          )}

          <div className="mt-12 grid sm:grid-cols-2 gap-3">
            <Link
              href="/tools/http_status_check"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Also free</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                HTTP status check →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Quick one-shot endpoint test, no request builder.
              </p>
            </Link>
            <Link
              href="/register"
              className="group bg-[#11131a] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/30 transition-colors"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Next up</p>
              <p className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                Monitor your API with Uptime →
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Continuous health checks with retries and instant alerts.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ResultSection({ result }: { result: CurlResult }) {
  if (result.error && result.statusCode === 0) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mt-3">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      <StatusCard result={result} />
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

function StatusCard({ result }: { result: CurlResult }) {
  const cls = classify(result.statusCode);
  return (
    <div className={`border rounded-2xl overflow-hidden ${TONE_BORDER[cls.tone]}`}>
      <div className="px-5 sm:px-6 py-5 flex flex-wrap items-center gap-4">
        <p className={`text-5xl font-black tracking-tight tabular-nums ${TONE_TEXT[cls.tone]}`}>
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
  const isJson = contentType?.includes('json');
  const [pretty, setPretty] = useState(isJson);
  const display = pretty && isJson ? prettyJson(body) : body;

  return (
    <div className="bg-[#11131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 sm:px-6 py-3 border-b border-white/[0.04] flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white">Response body</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">
            {contentType?.split(';')[0] ?? 'unknown'}
            {truncated ? ' · truncated' : ''}
          </p>
          {isJson && (
            <button
              type="button"
              onClick={() => setPretty((p) => !p)}
              className={`text-[11px] font-semibold px-2 py-1 rounded ${pretty ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
            >
              Pretty
            </button>
          )}
          <CopyButton text={display} />
        </div>
      </div>
      <pre className="text-[12px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap break-all bg-[#0c0e13] m-4 p-4 rounded-xl max-h-[500px] overflow-y-auto">
        {display}
      </pre>
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
