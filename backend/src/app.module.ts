import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MonitorsModule } from './monitors/monitors.module';
import { ChecksModule } from './checks/checks.module';
import { IncidentsModule } from './incidents/incidents.module';
import { WorkerModule } from './worker/worker.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AlertsModule } from './alerts/alerts.module';
import { SitesModule } from './sites/sites.module';
import { SeoModule } from './seo/seo.module';
import { GoogleAuthModule } from './google-auth/google-auth.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    MonitorsModule,
    ChecksModule,
    IncidentsModule,
    WorkerModule,
    SchedulerModule,
    AlertsModule,
    SeoModule,
    GoogleAuthModule,
    AnalyticsModule,
    SitesModule,
  ],
})
export class AppModule {}
