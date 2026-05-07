import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperuserGuard } from '../auth/guards/superuser.guard';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, SuperuserGuard],
  exports: [UsersService],
})
export class UsersModule {}
