import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async getStats(userId: string) {
    const totalMonitors = await this.prisma.monitor.count({ where: { userId } });
    const upMonitors = await this.prisma.monitor.count({ where: { userId, status: 'UP' } });
    const downMonitors = await this.prisma.monitor.count({ where: { userId, status: 'DOWN' } });
    const activeIncidents = await this.prisma.incident.count({
      where: { monitor: { userId }, resolved: false },
    });
    return { totalMonitors, upMonitors, downMonitors, activeIncidents };
  }
}
