import { Injectable, Logger } from '@nestjs/common';
import * as whois from 'whois';
import { getDomain } from 'tldts';

export type WhoisResult = {
  expiresAt: Date | null;
  registrar: string | null;
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

const REGISTRAR_PATTERNS = [
  /Registrar:\s*(.+)/i,
  /Sponsoring Registrar:\s*(.+)/i,
  /registrar name:\s*(.+)/i,
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

  async lookup(urlOrHost: string, timeoutMs = 10_000): Promise<WhoisResult | null> {
    const domain = this.registrableDomain(urlOrHost);
    if (!domain) return null;

    const raw = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WHOIS timeout')), timeoutMs);
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

    if (!raw) return null;
    return parseWhois(raw);
  }
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
