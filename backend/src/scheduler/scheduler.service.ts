import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhoisService } from '../whois/whois.service';
import { GeoService } from '../geo/geo.service';
import { SeoService } from '../seo/seo.service';

const WHOIS_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days
const WHOIS_BATCH_SIZE = 50;
const WHOIS_DELAY_MS = 2_000;

const GEO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const GEO_BATCH_SIZE = 50;
const GEO_DELAY_MS = 1_500;

const SEO_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 6 days
const SEO_BATCH_SIZE = 50;
const SEO_DELAY_MS = 2_000;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('monitor-checks') private checksQueue: Queue,
    private whois: WhoisService,
    private geo: GeoService,
    private seo: SeoService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueChecks() {
    const now = new Date();
    const monitors = await this.prisma.monitor.findMany({
      where: { isActive: true },
    });

    let dispatched = 0;
    for (const monitor of monitors) {
      const lastChecked = monitor.lastCheckedAt;
      const intervalMs = monitor.interval * 60 * 1000;
      const isDue =
        !lastChecked || now.getTime() - lastChecked.getTime() >= intervalMs;
      if (!isDue) continue;

      const jobId = `check-${monitor.id}-${Math.floor(now.getTime() / intervalMs)}`;
      const existing = await this.checksQueue.getJob(jobId);
      if (!existing) {
        await this.checksQueue.add(
          'check',
          { monitorId: monitor.id },
          { jobId, attempts: 1 },
        );
        dispatched++;
      }
    }

    if (dispatched > 0) this.logger.log(`Dispatched ${dispatched} check(s)`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshStaleWhois() {
    const stale = await this.prisma.monitor.findMany({
      where: {
        OR: [
          { domainLastCheckedAt: null },
          { domainLastCheckedAt: { lt: new Date(Date.now() - WHOIS_TTL_MS) } },
        ],
      },
      take: WHOIS_BATCH_SIZE,
      orderBy: { domainLastCheckedAt: { sort: 'asc', nulls: 'first' } },
    });

    if (stale.length === 0) return;
    this.logger.log(`Refreshing WHOIS for ${stale.length} monitor(s)`);

    for (const m of stale) {
      try {
        await this.refreshWhoisForMonitor(m.id, m.url);
      } catch (err: any) {
        this.logger.warn(`WHOIS refresh failed for ${m.url}: ${err?.message}`);
      }
      await new Promise((r) => setTimeout(r, WHOIS_DELAY_MS));
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async refreshStaleGeo() {
    const stale = await this.prisma.monitor.findMany({
      where: {
        OR: [
          { serverGeoCheckedAt: null },
          { serverGeoCheckedAt: { lt: new Date(Date.now() - GEO_TTL_MS) } },
        ],
      },
      take: GEO_BATCH_SIZE,
      orderBy: { serverGeoCheckedAt: { sort: 'asc', nulls: 'first' } },
    });

    if (stale.length === 0) return;
    this.logger.log(`Refreshing server geo for ${stale.length} monitor(s)`);

    for (const m of stale) {
      try {
        await this.refreshGeoForMonitor(m.id, m.url);
      } catch (err: any) {
        this.logger.warn(`Geo refresh failed for ${m.url}: ${err?.message}`);
      }
      await new Promise((r) => setTimeout(r, GEO_DELAY_MS));
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async refreshStaleSeo() {
    const cutoff = new Date(Date.now() - SEO_TTL_MS);
    const stale = await this.prisma.site.findMany({
      where: {
        OR: [
          { seoSnapshot: { is: null } },
          { seoSnapshot: { fetchedAt: { lt: cutoff } } },
        ],
      },
      take: SEO_BATCH_SIZE,
      include: { seoSnapshot: true },
    });

    if (stale.length === 0) return;
    this.logger.log(`Refreshing SEO for ${stale.length} site(s)`);

    for (const s of stale) {
      try {
        await this.seo.refreshSeoForSite(s.id, s.url);
      } catch (err: any) {
        this.logger.warn(`SEO refresh failed for ${s.url}: ${err?.message}`);
      }
      await new Promise((r) => setTimeout(r, SEO_DELAY_MS));
    }
  }

  /** Resolve hostname → IP → geo and persist. Used by daily cron and on-create. */
  async refreshGeoForMonitor(monitorId: string, url: string): Promise<void> {
    const result = await this.geo.lookup(url);
    const now = new Date();

    if (!result) {
      await this.prisma.monitor.update({
        where: { id: monitorId },
        data: { serverGeoCheckedAt: now },
      });
      return;
    }

    await this.prisma.monitor.update({
      where: { id: monitorId },
      data: {
        serverIp: result.ip,
        serverLat: result.lat,
        serverLng: result.lng,
        serverCountry: result.country,
        serverCountryCode: result.countryCode,
        serverRegion: result.region,
        serverCity: result.city,
        serverGeoCheckedAt: now,
      },
    });
  }

  /** Lookup WHOIS for a single monitor and persist the result. Used by daily cron and on-create. */
  async refreshWhoisForMonitor(monitorId: string, url: string): Promise<void> {
    const result = await this.whois.lookup(url);
    const now = new Date();

    if (!result) {
      await this.prisma.monitor.update({
        where: { id: monitorId },
        data: { domainLastCheckedAt: now },
      });
      return;
    }

    const daysLeft =
      result.expiresAt != null
        ? Math.floor((result.expiresAt.getTime() - Date.now()) / 86_400_000)
        : null;

    await this.prisma.monitor.update({
      where: { id: monitorId },
      data: {
        domainExpiresAt: result.expiresAt,
        domainRegistrar: result.registrar,
        domainDaysLeft: daysLeft,
        domainLastCheckedAt: now,
      },
    });
  }
}
