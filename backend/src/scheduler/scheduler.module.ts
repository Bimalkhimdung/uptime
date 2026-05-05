import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhoisModule } from '../whois/whois.module';
import { GeoModule } from '../geo/geo.module';
import { SeoModule } from '../seo/seo.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'monitor-checks' }),
    WhoisModule,
    GeoModule,
    SeoModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
