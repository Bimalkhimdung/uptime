import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'monitor-checks' }),
    SchedulerModule,
    AlertsModule,
  ],
  providers: [MonitorsService],
  controllers: [MonitorsController],
  exports: [MonitorsService],
})
export class MonitorsModule {}
