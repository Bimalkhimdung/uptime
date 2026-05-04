import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}
