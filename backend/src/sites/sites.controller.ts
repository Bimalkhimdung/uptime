import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { SitesService } from './sites.service';

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sites')
export class SitesController {
  constructor(private sitesService: SitesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.sitesService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.sitesService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.sitesService.remove(req.user.sub, id);
  }

  @Post(':id/seo/refresh')
  refresh(@Request() req: any, @Param('id') id: string) {
    return this.sitesService.refreshSeo(req.user.sub, id);
  }

  @Get(':id/analytics')
  analytics(@Request() req: any, @Param('id') id: string) {
    return this.sitesService.getAnalytics(req.user.sub, id);
  }
}
