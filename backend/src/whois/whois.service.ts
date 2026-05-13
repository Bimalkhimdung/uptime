import { Injectable, Logger } from '@nestjs/common';
import * as whois from 'whois';
import { getDomain } from 'tldts';

export type WhoisResult = {
  expiresAt: Date | null;
  registrar: string | null;
};

export type DomainInfo = {
  domain: string;
  available: boolean;
  registrar: string | null;
  createdAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date | null;
  daysLeft: number | null;
  nameservers: string[];
  status: string[];
};

const EXPIRY_PATTERNS = [
  /Registry Expiry Date:\s*(.+)/i,
  /Expiry Date:\s*(.+)/i,
  /Expiration Date:\s*(.+)/i,
  /Registrar Registration Expiration Date:\s*(.+)/i,
  /paid-till:\s*(.+)/i,
  /expires:\s*(.+)/i,
  /expire:\s*(.+)/i,
  /renewal date:\s*(.+)/i,
  /Domain Expiration Date:\s*(.+)/i,
];

const CREATED_PATTERNS = [
  /Creation Date:\s*(.+)/i,
  /Created Date:\s*(.+)/i,
  /Created On:\s*(.+)/i,
  /Domain Registration Date:\s*(.+)/i,
  /Registered on:\s*(.+)/i,
  /created:\s*(.+)/i,
];

const UPDATED_PATTERNS = [
  /Updated Date:\s*(.+)/i,
  /Last Updated:\s*(.+)/i,
  /Last Modified:\s*(.+)/i,
  /modified:\s*(.+)/i,
  /changed:\s*(.+)/i,
];

const REGISTRAR_PATTERNS = [
  /Registrar:\s*(.+)/i,
  /Sponsoring Registrar:\s*(.+)/i,
  /registrar name:\s*(.+)/i,
];

const NAMESERVER_PATTERNS = [/Name Server:\s*(\S+)/gi, /nserver:\s*(\S+)/gi];

const STATUS_PATTERNS = [/Domain Status:\s*(.+)/gi, /status:\s*(.+)/gi];

const AVAILABLE_SIGNALS = [
  /no match for/i,
  /not found/i,
  /no entries found/i,
  /no data found/i,
  /domain is available for registration/i,
  /status:\s*available/i,
  /status:\s*free/i,
  /is free$/im,
  /^domain not registered/im,
  /no object found/i,
  /the queried object does not exist/i,
];

type CacheEntry = { raw: string; expiresAt: number };

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class WhoisService {
  private readonly logger = new Logger(WhoisService.name);
  private readonly cache = new Map<string, CacheEntry>();

  /** Extract registrable domain (eTLD+1) from a URL or hostname. */
  registrableDomain(urlOrHost: string): string | null {
    try {
      const host = urlOrHost.includes('://')
        ? new URL(urlOrHost).hostname
        : urlOrHost;
      return getDomain(host) ?? host;
    } catch {
      return null;
    }
  }

  async lookup(
    urlOrHost: string,
    timeoutMs = 10_000,
  ): Promise<WhoisResult | null> {
    const raw = await this.cachedLookup(urlOrHost, timeoutMs, false);
    if (!raw) return null;
    return parseWhois(raw);
  }

  /** Full domain info including availability — used by the public tools endpoint. */
  async domainInfo(
    urlOrHost: string,
    timeoutMs = 15_000,
  ): Promise<DomainInfo | null> {
    const domain = this.registrableDomain(urlOrHost);
    if (!domain) return null;

    // The main domain check retries once on timeout — Verisign and a handful
    // of other registry WHOIS servers occasionally take a few seconds to
    // respond, especially when we've been rate-limited.
    const raw = await this.cachedLookup(domain, timeoutMs, true);
    if (raw == null) {
      return null;
    }

    const available = isAvailable(raw);
    const parsed = parseWhois(raw);
    const createdAt = extractDate(raw, CREATED_PATTERNS);
    const updatedAt = extractDate(raw, UPDATED_PATTERNS);
    const nameservers = extractAll(raw, NAMESERVER_PATTERNS).map((s) =>
      s.toLowerCase(),
    );
    const status = extractAll(raw, STATUS_PATTERNS);
    const daysLeft = parsed.expiresAt
      ? Math.floor((parsed.expiresAt.getTime() - Date.now()) / 86_400_000)
      : null;

    return {
      domain,
      available,
      registrar: available ? null : parsed.registrar,
      createdAt: available ? null : createdAt,
      expiresAt: available ? null : parsed.expiresAt,
      updatedAt: available ? null : updatedAt,
      daysLeft: available ? null : daysLeft,
      nameservers: available ? [] : Array.from(new Set(nameservers)),
      status: available ? [] : Array.from(new Set(status)),
    };
  }

  private async cachedLookup(
    urlOrHost: string,
    timeoutMs: number,
    retryOnTimeout: boolean,
  ): Promise<string | null> {
    const domain = this.registrableDomain(urlOrHost);
    if (!domain) return null;

    // Serve from cache if fresh.
    const cached = this.cache.get(domain);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.raw;
    }

    let raw = await this.rawLookup(domain, timeoutMs);
    if (raw == null && retryOnTimeout) {
      // One quick retry — WHOIS timeouts are usually transient throttling.
      await new Promise((r) => setTimeout(r, 1500));
      raw = await this.rawLookup(domain, timeoutMs);
    }

    if (raw != null) {
      this.cache.set(domain, { raw, expiresAt: Date.now() + CACHE_TTL_MS });
      // Prune occasionally so the map doesn't grow unbounded.
      if (this.cache.size > 500) this.pruneCache();
    }
    return raw;
  }

  private pruneCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  private async rawLookup(
    urlOrHost: string,
    timeoutMs: number,
  ): Promise<string | null> {
    const domain = this.registrableDomain(urlOrHost);
    if (!domain) return null;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('WHOIS timeout')),
        timeoutMs,
      );
      // follow:0 = go straight to the registry's WHOIS server (the package
      // already maps TLD → server from its own servers.json, no IANA hop
      // needed). We skip referrals entirely because many registrars publish
      // broken/unresolvable WHOIS hosts (e.g. whois.registrar.amazon) that
      // would otherwise hang the lookup. The registry response already
      // contains everything we parse: registrar name, expiry, NS, status.
      whois.lookup(domain, { follow: 0, timeout: 6000 }, (err, data) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve(data);
      });
    }).catch((err) => {
      const detail = err?.message || err?.code || JSON.stringify(err);
      this.logger.warn(`WHOIS lookup failed for ${domain}: ${detail}`);
      return null;
    });
  }
}

function isAvailable(text: string): boolean {
  return AVAILABLE_SIGNALS.some((re) => re.test(text));
}

function extractAll(text: string, patterns: RegExp[]): string[] {
  const out: string[] = [];
  for (const re of patterns) {
    const matches = text.matchAll(re);
    for (const m of matches) {
      if (m[1]) {
        const value = m[1].trim().split(/\r?\n/)[0].trim();
        if (value) out.push(value);
      }
    }
  }
  return out;
}

function parseWhois(text: string): WhoisResult {
  return {
    expiresAt: extractDate(text, EXPIRY_PATTERNS),
    registrar: extractString(text, REGISTRAR_PATTERNS),
  };
}

function extractDate(text: string, patterns: RegExp[]): Date | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const parsed = new Date(m[1].trim());
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

function extractString(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const value = m[1].trim().split(/\r?\n/)[0].trim();
      if (value) return value;
    }
  }
  return null;
}
