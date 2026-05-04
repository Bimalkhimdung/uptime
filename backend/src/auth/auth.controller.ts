import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Request() req: any) {
    return this.authService.me(req.user.sub);
  }

  /** Kicks off Google OAuth — Passport handles the redirect to Google. */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    /* Passport-google-oauth20 redirects to Google before this body runs. */
  }

  /** Google redirects here. Issue a JWT and bounce back to the frontend with it. */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Request() req: any, @Response() res: ExpressResponse) {
    const user = req.user;
    if (!user) {
      const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontend}/login?error=google_failed`);
    }
    const token = this.authService.signTokenForUser(user);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(
      `${frontend}/auth/callback?token=${encodeURIComponent(token)}`,
    );
  }
}
