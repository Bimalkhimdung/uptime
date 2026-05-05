import { Module } from '@nestjs/common';
import { SeoService } from './seo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
