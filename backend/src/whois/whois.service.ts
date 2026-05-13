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

@Injectable()
export class WhoisService {
  private readonly logger = new Logger(WhoisService.name);

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
    const raw = await this.rawLookup(urlOrHost, timeoutMs);
    if (!raw) return null;
    return parseWhois(raw);
  }

  /** Full domain info including availability — used by the public tools endpoint. */
  async domainInfo(
    urlOrHost: string,
    timeoutMs = 10_000,
  ): Promise<DomainInfo | null> {
    const domain = this.registrableDomain(urlOrHost);
    if (!domain) return null;

    const raw = await this.rawLookup(domain, timeoutMs);
    if (raw == null) {
      // Treat a hard WHOIS failure as "unknown" by returning null so the
      // controller can map it to a 502 / informative error.
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
      whois.lookup(domain, { follow: 2 }, (err, data) => {
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
