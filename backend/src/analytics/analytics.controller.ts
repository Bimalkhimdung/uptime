import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('google/analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('properties')
  listProperties(@Request() req: any) {
    return this.analytics.listProperties(req.user.sub);
  }
}
