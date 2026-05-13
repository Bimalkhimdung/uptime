import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WhoisService } from '../whois/whois.service';
import { DnsService, RecordType } from './dns.service';
import { HttpCheckService, HttpMethod } from './http-check.service';
import { SslCheckService } from './ssl-check.service';
import {
  COMMON_PORT_PRESETS,
  PortCheckService,
  PortProtocol,
} from './port-check.service';

const DNS_RECORD_TYPES: RecordType[] = [
  'A',
  'AAAA',
  'MX',
  'TXT',
  'NS',
  'CNAME',
  'SOA',
  'CAA',
];

const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'OPTIONS',
  'PATCH',
];

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
  constructor(
    private whois: WhoisService,
    private dnsService: DnsService,
    private httpCheckService: HttpCheckService,
    private sslCheckService: SslCheckService,
    private portCheckService: PortCheckService,
  ) {}

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

  @Get('port-check')
  async portCheck(
    @Query('host') hostQuery?: string,
    @Query('ports') portsQuery?: string,
    @Query('preset') presetQuery?: string,
    @Query('protocol') protocolQuery?: string,
  ) {
    if (!hostQuery || typeof hostQuery !== 'string') {
      throw new BadRequestException('Provide a "host" query parameter.');
    }
    const host = parseSslHost(hostQuery);
    if (!host) {
      throw new BadRequestException(
        'Could not parse a valid hostname from the input.',
      );
    }

    let ports: number[] = [];
    if (presetQuery) {
      const key = presetQuery.toLowerCase();
      const preset = COMMON_PORT_PRESETS[key];
      if (!preset) {
        throw new BadRequestException(
          `Unknown preset "${presetQuery}". Use one of: ${Object.keys(COMMON_PORT_PRESETS).join(', ')}.`,
        );
      }
      ports = preset.slice();
    }
    if (portsQuery) {
      const parsed = portsQuery
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
      if (parsed.some((p) => p < 1 || p > 65535)) {
        throw new BadRequestException('Each port must be between 1 and 65535.');
      }
      ports.push(...parsed);
    }
    if (ports.length === 0) {
      throw new BadRequestException(
        'Provide at least one port via "ports" or a "preset".',
      );
    }

    const protocol: PortProtocol =
      (protocolQuery?.toLowerCase() as PortProtocol) || 'tcp';
    if (protocol !== 'tcp' && protocol !== 'udp') {
      throw new BadRequestException('Protocol must be "tcp" or "udp".');
    }

    return this.portCheckService.check(host, ports, protocol);
  }

  @Get('ssl-check')
  async sslCheck(
    @Query('host') hostQuery?: string,
    @Query('port') portQuery?: string,
  ) {
    if (!hostQuery || typeof hostQuery !== 'string') {
      throw new BadRequestException('Provide a "host" query parameter.');
    }
    const host = parseSslHost(hostQuery);
    if (!host) {
      throw new BadRequestException(
        'Could not parse a valid hostname from the input.',
      );
    }
    const port = portQuery ? parseInt(portQuery, 10) : 443;
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new BadRequestException('Port must be between 1 and 65535.');
    }
    return this.sslCheckService.check(host, port);
  }

  @Post('curl')
  async curl(@Body() body: unknown) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be a JSON object.');
    }
    const spec = body as {
      url?: unknown;
      method?: unknown;
      headers?: unknown;
      body?: unknown;
      followRedirects?: unknown;
    };

    if (typeof spec.url !== 'string') {
      throw new BadRequestException('"url" is required.');
    }
    const url = normalizeHttpUrl(spec.url);
    if (!url) {
      throw new BadRequestException('Could not parse a valid HTTP/HTTPS URL.');
    }

    const method: HttpMethod = (
      typeof spec.method === 'string' ? spec.method.toUpperCase() : 'GET'
    ) as HttpMethod;
    if (!HTTP_METHODS.includes(method)) {
      throw new BadRequestException(
        `Unsupported method. Use one of: ${HTTP_METHODS.join(', ')}.`,
      );
    }

    // Headers — accept an array of {name, value} pairs or a {name: value} map.
    const headers = parseHeaders(spec.headers);
    if (Object.keys(headers).length > 30) {
      throw new BadRequestException('Too many headers (max 30).');
    }

    let requestBody: string | null = null;
    if (typeof spec.body === 'string' && spec.body.length > 0) {
      if (Buffer.byteLength(spec.body, 'utf8') > 1024 * 1024) {
        throw new BadRequestException('Request body exceeds 1 MB limit.');
      }
      requestBody = spec.body;
    }

    const followRedirects = spec.followRedirects !== false;

    return this.httpCheckService.check(url, method, undefined, {
      headers,
      body: requestBody,
      followRedirects,
      bodyPreviewBytes: 64 * 1024,
    });
  }

  @Get('http-check')
  async httpCheck(
    @Query('url') urlQuery?: string,
    @Query('method') methodQuery?: string,
  ) {
    if (!urlQuery || typeof urlQuery !== 'string') {
      throw new BadRequestException('Provide a "url" query parameter.');
    }
    const url = normalizeHttpUrl(urlQuery);
    if (!url) {
      throw new BadRequestException('Could not parse a valid HTTP/HTTPS URL.');
    }
    const method: HttpMethod = (
      methodQuery ? methodQuery.toUpperCase() : 'GET'
    ) as HttpMethod;
    if (!HTTP_METHODS.includes(method)) {
      throw new BadRequestException(
        `Unsupported method. Use one of: ${HTTP_METHODS.join(', ')}.`,
      );
    }
    return this.httpCheckService.check(url, method);
  }

  @Get('dns-lookup')
  async dnsLookup(
    @Query('domain') domainQuery?: string,
    @Query('type') typeQuery?: string,
  ) {
    const cleaned = parseDomain(domainQuery);
    const host = stripWww(cleaned);

    if (typeQuery && typeQuery !== 'ALL') {
      const upper = typeQuery.toUpperCase() as RecordType;
      if (!DNS_RECORD_TYPES.includes(upper)) {
        throw new BadRequestException(
          `Unsupported record type. Use one of: ${DNS_RECORD_TYPES.join(', ')}, ALL.`,
        );
      }
      const set = await this.dnsService.lookup(host, upper);
      return { host, sets: [set] };
    }

    const sets = await this.dnsService.lookupAll(host);
    return { host, sets };
  }
}

function stripWww(host: string): string {
  return host.startsWith('www.') ? host.slice(4) : host;
}

function parseSslHost(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//, '');
  const host = withoutProtocol.split('/')[0].split('?')[0].split(':')[0];
  if (!/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host)) return null;
  return host;
}

function parseHeaders(input: unknown): Record<string, string> {
  if (!input) return {};
  const out: Record<string, string> = {};
  if (Array.isArray(input)) {
    for (const row of input) {
      if (!row || typeof row !== 'object') continue;
      const r = row as { name?: unknown; value?: unknown };
      if (typeof r.name !== 'string') continue;
      const name = r.name.trim();
      if (!name) continue;
      const value = typeof r.value === 'string' ? r.value : '';
      out[name] = value;
    }
    return out;
  }
  if (typeof input === 'object') {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (!k || typeof v !== 'string') continue;
      out[k] = v;
    }
  }
  return out;
}

function normalizeHttpUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
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
