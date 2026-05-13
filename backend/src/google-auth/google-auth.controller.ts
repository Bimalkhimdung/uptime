import {
  Controller,
  Delete,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleAuthService } from './google-auth.service';

@ApiTags('GoogleAuth')
@Controller('integrations/google')
export class GoogleAuthController {
  constructor(private gauth: GoogleAuthService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@Request() req: any) {
    return this.gauth.getStatus(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('connect')
  connect(@Request() req: any) {
    return { url: this.gauth.buildAuthUrl(req.user.sub) };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (error) {
      return res.redirect(
        `${frontend}/seo?google=error&reason=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) {
      return res.redirect(`${frontend}/seo?google=error&reason=missing_params`);
    }
    const result = await this.gauth.handleCallback(code, state);
    return res.redirect(result.redirectTo);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  disconnect(@Request() req: any) {
    return this.gauth.disconnect(req.user.sub);
  }
}
