import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name },
    });

    const token = this.signTokenForUser(user);
    return { token, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const identifier = dto.email;
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.signTokenForUser(updated);
    return { token, user: this.sanitize(updated) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  /**
   * Find a user by Google ID. If not found, link by matching email or create a new account.
   * Used by GoogleStrategy.validate.
   */
  async findOrCreateGoogleUser(input: {
    googleId: string;
    email: string;
    name?: string | null;
  }) {
    const now = new Date();

    const byGoogle = await this.prisma.user.findUnique({
      where: { googleId: input.googleId },
    });
    if (byGoogle) {
      return this.prisma.user.update({
        where: { id: byGoogle.id },
        data: { lastLoginAt: now },
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: input.googleId,
          name: byEmail.name ?? input.name ?? null,
          lastLoginAt: now,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name ?? null,
        googleId: input.googleId,
        lastLoginAt: now,
      },
    });
  }

  signTokenForUser(user: { id: string; email: string }) {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
