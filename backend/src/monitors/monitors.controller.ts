import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto, UpdateMonitorDto } from './dto/monitor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Monitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private monitorsService: MonitorsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateMonitorDto) {
    return this.monitorsService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.monitorsService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMonitorDto,
  ) {
    return this.monitorsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.remove(req.user.sub, id);
  }

  @Patch(':id/pause')
  pause(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.pause(req.user.sub, id);
  }

  @Patch(':id/resume')
  resume(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.resume(req.user.sub, id);
  }

  @Get(':id/checks')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getChecks(
    @Request() req: any,
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.monitorsService.getChecks(req.user.sub, id, limit);
  }

  @Get(':id/incidents')
  getIncidents(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.getIncidents(req.user.sub, id);
  }

  @Post(':id/test-notification')
  testNotification(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.sendTestNotification(req.user.sub, id);
  }

  @Post(':id/refresh-metadata')
  refreshMetadata(@Request() req: any, @Param('id') id: string) {
    return this.monitorsService.refreshMetadata(req.user.sub, id);
  }
}
