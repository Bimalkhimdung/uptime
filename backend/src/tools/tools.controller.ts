import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WhoisService } from '../whois/whois.service';

const ALT_TLDS = [
  'com',
  'net',
  'io',
  'app',
  'dev',
  'co',
  'ai',
  'xyz',
  'tech',
  'online',
  'site',
  'org',
];

const PREFIXES = ['get', 'try', 'my', 'use'];
const SUFFIXES = ['app', 'hq', 'hub', 'io'];

// Indicative first-year registration prices in USD. Sourced from common
// registrar rack rates — these will drift over time and should be treated as
// "starting at" estimates, not real-time pricing.
const TLD_PRICE_USD: Record<string, number> = {
  com: 11.99,
  net: 14.99,
  org: 12.99,
  io: 39.99,
  app: 14.99,
  dev: 14.99,
  co: 28.99,
  ai: 79.99,
  xyz: 11.99,
  tech: 49.99,
  online: 34.99,
  site: 24.99,
  info: 16.99,
  me: 19.99,
  biz: 17.99,
  cc: 24.99,
  pro: 19.99,
  store: 49.99,
  blog: 29.99,
  in: 8.99,
  uk: 8.99,
  us: 9.99,
};

function priceForDomain(domain: string): number | null {
  const tld = domain.split('.').pop();
  if (!tld) return null;
  return TLD_PRICE_USD[tld] ?? null;
}

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private whois: WhoisService) {}

  @Get('domain-check')
  async checkDomain(@Query('domain') domainQuery?: string) {
    const cleaned = parseDomain(domainQuery);
    const info = await this.whois.domainInfo(cleaned);
    if (!info) {
      throw new BadGatewayException(
        `WHOIS lookup failed for ${cleaned}. The TLD may not support WHOIS or the server is unreachable.`,
      );
    }
    return info;
  }

  @Get('domain-suggestions')
  async suggestDomains(@Query('domain') domainQuery?: string) {
    const cleaned = parseDomain(domainQuery);
    const { sld, tld } = splitDomain(cleaned);
    if (!sld) {
      throw new BadRequestException(
        'Could not derive a base name to suggest variants for.',
      );
    }

    const candidates = buildCandidates(sld, tld);

    // Run WHOIS lookups in parallel with a tighter timeout so the page doesn't
    // sit on a slow TLD server. Anything that fails or times out is reported
    // as `available: null` (unknown) instead of blocking the whole response.
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const info = await this.whois.domainInfo(candidate, 5_000);
        return {
          domain: candidate,
          available: info ? info.available : null,
          expiresAt: info?.expiresAt ?? null,
          registrar: info?.registrar ?? null,
          priceUsd: priceForDomain(candidate),
          currency: 'USD',
        };
      }),
    );

    // Prefer available results first, then unknown, then taken.
    results.sort((a, b) => {
      const score = (x: { available: boolean | null }) =>
        x.available === true ? 0 : x.available === null ? 1 : 2;
      return score(a) - score(b);
    });

    return { input: cleaned, suggestions: results };
  }
}

function parseDomain(input: string | undefined): string {
  if (!input || typeof input !== 'string') {
    throw new BadRequestException('Provide a "domain" query parameter.');
  }
  const cleaned = normalizeDomain(input);
  if (!cleaned) {
    throw new BadRequestException(
      'Could not parse a registrable domain from the input.',
    );
  }
  return cleaned;
}

function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  // Strip protocol and path so users can paste URLs.
  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//, '');
  const host = withoutProtocol.split('/')[0].split('?')[0];
  // Basic sanity check: must contain a dot and only valid hostname characters.
  if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host)) return null;
  return host;
}

function splitDomain(domain: string): { sld: string; tld: string } {
  const parts = domain.split('.');
  if (parts.length < 2) return { sld: '', tld: '' };
  return {
    sld: parts.slice(0, -1).join('-'),
    tld: parts[parts.length - 1],
  };
}

function buildCandidates(sld: string, tld: string): string[] {
  const set = new Set<string>();
  // Alternative TLDs.
  for (const altTld of ALT_TLDS) {
    if (altTld === tld) continue;
    set.add(`${sld}.${altTld}`);
  }
  // Prefix + suffix variants on the same TLD (and .com).
  const targetTlds = Array.from(new Set([tld, 'com'])).filter(Boolean);
  for (const t of targetTlds) {
    for (const p of PREFIXES) set.add(`${p}${sld}.${t}`);
    for (const s of SUFFIXES) set.add(`${sld}${s}.${t}`);
  }
  // Cap to keep WHOIS load reasonable.
  return Array.from(set).slice(0, 12);
}
