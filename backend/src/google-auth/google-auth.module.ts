import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [GoogleAuthService],
  controllers: [GoogleAuthController],
  exports: [GoogleAuthService],
})
export class GoogleAuthModule {}
