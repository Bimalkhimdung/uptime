import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';

export type GeoLookup = {
  ip: string;
  lat: number;
  lng: number;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  /** Extract the hostname from a URL (or pass through if already a hostname). */
  hostnameOf(urlOrHost: string): string | null {
    try {
      return urlOrHost.includes('://')
        ? new URL(urlOrHost).hostname
        : urlOrHost;
    } catch {
      return null;
    }
  }

  /** Resolve hostname → first IPv4 (falls back to IPv6 if no v4). */
  async resolveIp(hostname: string): Promise<string | null> {
    try {
      const v4 = await dns.resolve4(hostname);
      if (v4.length) return v4[0];
    } catch {
      /* try v6 */
    }
    try {
      const v6 = await dns.resolve6(hostname);
      if (v6.length) return v6[0];
    } catch {
      /* fall through */
    }
    return null;
  }

  /**
   * Look up geo info for a URL. Resolves DNS, then queries ip-api.com (no key,
   * 45 req/min on the free tier — fine for our occasional refresh).
   */
  async lookup(urlOrHost: string): Promise<GeoLookup | null> {
    const host = this.hostnameOf(urlOrHost);
    if (!host) return null;

    const ip = await this.resolveIp(host);
    if (!ip) {
      this.logger.warn(`DNS resolution failed for ${host}`);
      return null;
    }

    try {
      const fields =
        'status,message,country,countryCode,regionName,city,lat,lon,query';
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        this.logger.warn(`ip-api returned HTTP ${res.status} for ${ip}`);
        return null;
      }
      const data = (await res.json()) as {
        status?: string;
        message?: string;
        country?: string;
        countryCode?: string;
        regionName?: string;
        city?: string;
        lat?: number;
        lon?: number;
        query?: string;
      };
      if (data.status !== 'success' || data.lat == null || data.lon == null) {
        this.logger.warn(
          `ip-api lookup failed for ${ip}: ${data.message ?? 'unknown'}`,
        );
        return null;
      }
      return {
        ip: data.query ?? ip,
        lat: data.lat,
        lng: data.lon,
        country: data.country ?? null,
        countryCode: data.countryCode ?? null,
        region: data.regionName ?? null,
        city: data.city ?? null,
      };
    } catch (err: any) {
      this.logger.warn(`ip-api lookup errored for ${ip}: ${err?.message}`);
      return null;
    }
  }
}
