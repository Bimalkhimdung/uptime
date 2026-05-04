import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateMonitorDto, UpdateMonitorDto } from './dto/monitor.dto';

@Injectable()
export class MonitorsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('monitor-checks') private checksQueue: Queue,
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

    return this.prisma.monitor.update({
      where: { id },
      data: dto,
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
}
