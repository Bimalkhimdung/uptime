import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.prisma.incident.findMany({
      where: { monitor: { userId: req.user.sub } },
      include: { monitor: { select: { id: true, name: true, url: true } } },
      orderBy: { startTime: 'desc' },
      take: 50,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, monitor: { userId: req.user.sub } },
      include: {
        monitor: {
          include: { alertContacts: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    // Pull checks that fall inside the incident window (with a small buffer
    // either side) so the activity log can show detection / retry / recovery
    // events around the incident.
    const windowStart = new Date(incident.startTime.getTime() - 60_000);
    const windowEnd = new Date(
      (incident.endTime ?? new Date()).getTime() + 60_000,
    );
    const checks = await this.prisma.check.findMany({
      where: {
        monitorId: incident.monitorId,
        checkedAt: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { checkedAt: 'asc' },
    });

    return { ...incident, checks };
  }
}
