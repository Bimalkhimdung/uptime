import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'monitor-checks' }),
  ],
  providers: [MonitorsService],
  controllers: [MonitorsController],
  exports: [MonitorsService],
})
export class MonitorsModule {}
