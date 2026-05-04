import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import * as https from 'https';
import * as http from 'http';

@Injectable()
@Processor('monitor-checks')
export class CheckProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckProcessor.name);
  private readonly MAX_RETRIES = 2;

  constructor(
    private prisma: PrismaService,
    private alerts: AlertsService,
  ) {
    super();
  }

  async process(job: Job) {
    const { monitorId } = job.data;

    const monitor = await this.prisma.monitor.findUnique({
      where: { id: monitorId },
      include: { alertContacts: true },
    });

    if (!monitor || !monitor.isActive) return;

    this.logger.debug(`Checking monitor: ${monitor.name} (${monitor.url})`);

    // Retry loop to avoid false positives
    let lastResult: { status: 'UP' | 'DOWN'; statusCode?: number; responseTime?: number; error?: string } | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      lastResult = await this.performCheck(monitor.url, monitor.timeout * 1000);
      if (lastResult.status === 'UP') break;
      if (attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt + 1} for ${monitor.url}`);
        await this.sleep(5000);
      }
    }

    if (!lastResult) return;

    // Save check result
    await this.prisma.check.create({
      data: {
        monitorId: monitor.id,
        status: lastResult.status,
        statusCode: lastResult.statusCode,
        responseTime: lastResult.responseTime,
        errorMessage: lastResult.error,
      },
    });

    const previousStatus = monitor.status;
    const newStatus = lastResult.status;

    // Update monitor status and stats
    const recentChecks = await this.prisma.check.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: 100,
    });
    const upCount = recentChecks.filter((c) => c.status === 'UP').length;
    const uptimePercent = (upCount / recentChecks.length) * 100;

    await this.prisma.monitor.update({
      where: { id: monitorId },
      data: {
        status: newStatus,
        lastCheckedAt: new Date(),
        lastStatusCode: lastResult.statusCode,
        lastResponseTime: lastResult.responseTime,
        uptimePercent: Math.round(uptimePercent * 100) / 100,
      },
    });

    // Handle status transitions
    if (previousStatus !== 'DOWN' && newStatus === 'DOWN') {
      this.logger.warn(`🔴 DOWN: ${monitor.name} (${monitor.url})`);

      // Create incident
      await this.prisma.incident.create({
        data: {
          monitorId,
          errorMessage: lastResult.error,
        },
      });

      // Send alerts
      for (const contact of monitor.alertContacts) {
        await this.alerts.sendDownAlert(monitor, contact, lastResult.error);
      }
    } else if (previousStatus === 'DOWN' && newStatus === 'UP') {
      this.logger.log(`🟢 RECOVERED: ${monitor.name} (${monitor.url})`);

      // Resolve open incident
      const openIncident = await this.prisma.incident.findFirst({
        where: { monitorId, resolved: false },
        orderBy: { startTime: 'desc' },
      });
      if (openIncident) {
        const duration = Math.floor(
          (Date.now() - openIncident.startTime.getTime()) / 1000,
        );
        await this.prisma.incident.update({
          where: { id: openIncident.id },
          data: { resolved: true, endTime: new Date(), duration },
        });
      }

      // Send recovery alerts
      for (const contact of monitor.alertContacts) {
        await this.alerts.sendRecoveryAlert(monitor, contact);
      }
    }
  }

  private async performCheck(
    url: string,
    timeoutMs: number,
  ): Promise<{ status: 'UP' | 'DOWN'; statusCode?: number; responseTime?: number; error?: string }> {
    const start = Date.now();

    return new Promise((resolve) => {
      const isHttps = url.startsWith('https');
      const lib = isHttps ? https : http;

      const req = lib.get(
        url,
        {
          timeout: timeoutMs,
          headers: { 'User-Agent': 'UptimeMonitor/1.0' },
        },
        (res) => {
          const responseTime = Date.now() - start;
          res.resume(); // consume response data
          const statusCode = res.statusCode || 0;
          if (statusCode >= 200 && statusCode < 400) {
            resolve({ status: 'UP', statusCode, responseTime });
          } else {
            resolve({
              status: 'DOWN',
              statusCode,
              responseTime,
              error: `HTTP ${statusCode}`,
            });
          }
        },
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'DOWN', error: `Timeout after ${timeoutMs}ms` });
      });

      req.on('error', (err) => {
        resolve({ status: 'DOWN', error: err.message });
      });
    });
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
