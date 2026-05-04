import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CheckProcessor } from './check.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    PrismaModule,
    AlertsModule,
    BullModule.registerQueue({ name: 'monitor-checks' }),
  ],
  providers: [CheckProcessor],
})
export class WorkerModule {}
