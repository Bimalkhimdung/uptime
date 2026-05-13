import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import * as https from 'https';
import * as http from 'http';
import * as tls from 'tls';

type CheckResult = {
  status: 'UP' | 'DOWN';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  domainResolved?: boolean;
  ssl?: SslInfo | null;
};

type SslInfo = {
  validFrom: Date;
  validUntil: Date;
  daysLeft: number;
  issuer: string | null;
  valid: boolean;
};

@Injectable()
@Processor('monitor-checks')
export class CheckProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckProcessor.name);
  private readonly MAX_RETRIES = 2;
  private readonly DOWN_ALERT_REPEAT_MS = 60 * 60 * 1000; // 1 hour

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

    let lastResult: CheckResult | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      lastResult = await this.performCheck(monitor.url, monitor.timeout * 1000);
      if (lastResult.status === 'UP') break;
      if (attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt + 1} for ${monitor.url}`);
        await this.sleep(5000);
      }
    }

    if (!lastResult) return;

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

    const recentChecks = await this.prisma.check.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: 100,
    });
    const upCount = recentChecks.filter((c) => c.status === 'UP').length;
    const uptimePercent = (upCount / recentChecks.length) * 100;

    const ssl = lastResult.ssl;
    const sslPatch = ssl
      ? {
          sslValidFrom: ssl.validFrom,
          sslValidUntil: ssl.validUntil,
          sslIssuer: ssl.issuer,
          sslDaysLeft: ssl.daysLeft,
          sslValid: ssl.valid,
          sslLastCheckedAt: new Date(),
        }
      : {};

    const now = new Date();
    const isDownEdge = previousStatus !== 'DOWN' && newStatus === 'DOWN';
    const isRecoveryEdge = previousStatus === 'DOWN' && newStatus === 'UP';
    const lastDownAlertAt = monitor.lastDownAlertAt;
    const isDownRepeat =
      previousStatus === 'DOWN' &&
      newStatus === 'DOWN' &&
      (!lastDownAlertAt ||
        now.getTime() - lastDownAlertAt.getTime() >= this.DOWN_ALERT_REPEAT_MS);

    let lastDownAlertPatch: { lastDownAlertAt: Date | null } | object = {};
    if (isDownEdge || isDownRepeat) {
      lastDownAlertPatch = { lastDownAlertAt: now };
    } else if (isRecoveryEdge) {
      lastDownAlertPatch = { lastDownAlertAt: null };
    }

    await this.prisma.monitor.update({
      where: { id: monitorId },
      data: {
        status: newStatus,
        lastCheckedAt: now,
        lastStatusCode: lastResult.statusCode,
        lastResponseTime: lastResult.responseTime,
        uptimePercent: Math.round(uptimePercent * 100) / 100,
        domainResolved: lastResult.domainResolved ?? null,
        ...sslPatch,
        ...lastDownAlertPatch,
      },
    });

    if (isDownEdge) {
      this.logger.warn(`🔴 DOWN: ${monitor.name} (${monitor.url})`);

      await this.prisma.incident.create({
        data: { monitorId, errorMessage: lastResult.error },
      });

      for (const contact of monitor.alertContacts) {
        await this.alerts.sendDownAlert(monitor, contact, lastResult.error);
      }
    } else if (isDownRepeat) {
      this.logger.warn(
        `🔁 DOWN reminder (still down): ${monitor.name} (${monitor.url})`,
      );

      for (const contact of monitor.alertContacts) {
        await this.alerts.sendDownAlert(monitor, contact, lastResult.error);
      }
    } else if (isRecoveryEdge) {
      this.logger.log(`🟢 RECOVERED: ${monitor.name} (${monitor.url})`);

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
          data: { resolved: true, endTime: now, duration },
        });
      }

      for (const contact of monitor.alertContacts) {
        await this.alerts.sendRecoveryAlert(monitor, contact);
      }
    }
  }

  private async performCheck(
    url: string,
    timeoutMs: number,
  ): Promise<CheckResult> {
    const start = Date.now();
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    return new Promise((resolve) => {
      const req = lib.get(
        url,
        {
          timeout: timeoutMs,
          headers: { 'User-Agent': 'UptimeMonitor/1.0' },
          // Inspect even invalid certs so we can report on them
          ...(isHttps ? { rejectUnauthorized: false } : {}),
        },
        (res) => {
          const responseTime = Date.now() - start;

          let ssl: SslInfo | null = null;
          if (isHttps) {
            const socket = res.socket as tls.TLSSocket | undefined;
            if (socket && typeof socket.getPeerCertificate === 'function') {
              ssl = parseCert(socket.getPeerCertificate(), socket.authorized);
            }
          }

          res.resume();
          const statusCode = res.statusCode || 0;
          const ok = statusCode >= 200 && statusCode < 400;
          resolve({
            status: ok ? 'UP' : 'DOWN',
            statusCode,
            responseTime,
            error: ok ? undefined : `HTTP ${statusCode}`,
            domainResolved: true,
            ssl,
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'DOWN', error: `Timeout after ${timeoutMs}ms` });
      });

      req.on('error', (err: NodeJS.ErrnoException) => {
        const dnsErr = err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN';
        resolve({
          status: 'DOWN',
          error: err.message,
          domainResolved: dnsErr ? false : undefined,
        });
      });
    });
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

function parseCert(
  cert:
    | tls.PeerCertificate
    | tls.DetailedPeerCertificate
    | Record<string, never>,
  authorized: boolean,
): SslInfo | null {
  if (!cert || Object.keys(cert).length === 0) return null;
  const { valid_from, valid_to, issuer } = cert as tls.PeerCertificate;
  if (!valid_to) return null;

  const validFrom = new Date(valid_from);
  const validUntil = new Date(valid_to);
  const now = Date.now();
  const daysLeft = Math.floor((validUntil.getTime() - now) / 86_400_000);
  const issuerStr =
    typeof issuer === 'object' && issuer
      ? (issuer.O || issuer.CN || JSON.stringify(issuer)).toString()
      : null;

  return {
    validFrom,
    validUntil,
    issuer: issuerStr,
    daysLeft,
    valid: authorized && validUntil.getTime() > now,
  };
}
