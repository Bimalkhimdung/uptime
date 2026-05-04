import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('monitor-checks') private checksQueue: Queue,
  ) {}

  // Run every minute — dispatch checks for monitors whose interval is due
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
        !lastChecked ||
        now.getTime() - lastChecked.getTime() >= intervalMs;

      if (isDue) {
        const jobId = `check-${monitor.id}-${Math.floor(now.getTime() / intervalMs)}`;

        // Avoid duplicate jobs for same interval window
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
    }

    if (dispatched > 0) {
      this.logger.log(`Dispatched ${dispatched} check(s)`);
    }
  }
}
