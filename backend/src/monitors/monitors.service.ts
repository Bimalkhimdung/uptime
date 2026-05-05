import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateMonitorDto, UpdateMonitorDto } from './dto/monitor.dto';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class MonitorsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('monitor-checks') private checksQueue: Queue,
    private scheduler: SchedulerService,
    private alerts: AlertsService,
  ) {}

  async create(userId: string, dto: CreateMonitorDto) {
    const monitor = await this.prisma.monitor.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        interval: dto.interval ?? 5,
        timeout: dto.timeout ?? 10,
        ...(dto.alertEmail && {
          alertContacts: {
            create: [{ type: 'EMAIL', value: dto.alertEmail }],
          },
        }),
      },
      include: { alertContacts: true },
    });

    // Schedule immediate first check
    await this.checksQueue.add(
      'check',
      { monitorId: monitor.id },
      { jobId: `immediate-${monitor.id}` },
    );

    // Fire-and-forget WHOIS + geo lookups so the detail page has data on first load.
    this.scheduler
      .refreshWhoisForMonitor(monitor.id, monitor.url)
      .catch(() => {
        /* logged inside the service */
      });
    this.scheduler
      .refreshGeoForMonitor(monitor.id, monitor.url)
      .catch(() => {
        /* logged inside the service */
      });

    return monitor;
  }

  async findAll(userId: string) {
    return this.prisma.monitor.findMany({
      where: { userId },
      include: {
        _count: { select: { checks: true, incidents: true } },
        incidents: {
          where: { resolved: false },
          take: 1,
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id },
      include: {
        alertContacts: true,
        incidents: { orderBy: { startTime: 'desc' }, take: 10 },
      },
    });
    if (!monitor) throw new NotFoundException('Monitor not found');
    if (monitor.userId !== userId) throw new ForbiddenException();
    return monitor;
  }

  async update(userId: string, id: string, dto: UpdateMonitorDto) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    if (monitor.userId !== userId) throw new ForbiddenException();

    const { alertEmails, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(rest).length > 0) {
        await tx.monitor.update({ where: { id }, data: rest });
      }

      if (alertEmails !== undefined) {
        const cleaned = Array.from(
          new Set(alertEmails.map((e) => e.trim()).filter(Boolean)),
        );
        await tx.alertContact.deleteMany({
          where: { monitorId: id, type: 'EMAIL' },
        });
        if (cleaned.length > 0) {
          await tx.alertContact.createMany({
            data: cleaned.map((value) => ({
              monitorId: id,
              type: 'EMAIL' as const,
              value,
            })),
          });
        }
      }

      return tx.monitor.findUnique({
        where: { id },
        include: { alertContacts: true },
      });
    });
  }

  async remove(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    if (monitor.userId !== userId) throw new ForbiddenException();

    // Remove scheduled jobs
    const jobs = await this.checksQueue.getRepeatableJobs();
    for (const job of jobs) {
      if (job.key.includes(id)) {
        await this.checksQueue.removeRepeatableByKey(job.key);
      }
    }

    await this.prisma.monitor.delete({ where: { id } });
    return { message: 'Monitor deleted' };
  }

  async pause(userId: string, id: string) {
    return this.update(userId, id, { isActive: false });
  }

  async resume(userId: string, id: string) {
    const monitor = await this.update(userId, id, { isActive: true });
    await this.checksQueue.add('check', { monitorId: id }, { jobId: `resume-${id}` });
    return monitor;
  }

  async getChecks(userId: string, monitorId: string, limit = 50) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) throw new NotFoundException();
    if (monitor.userId !== userId) throw new ForbiddenException();

    return this.prisma.check.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }

  async getIncidents(userId: string, monitorId: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) throw new NotFoundException();
    if (monitor.userId !== userId) throw new ForbiddenException();

    return this.prisma.incident.findMany({
      where: { monitorId },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
  }

  /**
   * Sends a test notification email to the logged-in user with the monitor's
   * current status and check details.
   */
  async sendTestNotification(userId: string, monitorId: string) {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id: monitorId },
    });
    if (!monitor) throw new NotFoundException('Monitor not found');
    if (monitor.userId !== userId) throw new ForbiddenException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      throw new NotFoundException('User has no email on file');
    }

    await this.alerts.sendTestNotification(monitor, user.email);
    return { sent: true, to: user.email };
  }
}
