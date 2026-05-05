import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoModule } from '../seo/seo.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, SeoModule, AnalyticsModule],
  providers: [SitesService],
  controllers: [SitesController],
  exports: [SitesService],
})
export class SitesModule {}
