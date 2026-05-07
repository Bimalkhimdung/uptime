import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  username: true,
  name: true,
  isSuperuser: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async getStats(userId: string) {
    const totalMonitors = await this.prisma.monitor.count({ where: { userId } });
    const upMonitors = await this.prisma.monitor.count({ where: { userId, status: 'UP' } });
    const downMonitors = await this.prisma.monitor.count({ where: { userId, status: 'DOWN' } });
    const activeIncidents = await this.prisma.incident.count({
      where: { monitor: { userId }, resolved: false },
    });
    return { totalMonitors, upMonitors, downMonitors, activeIncidents };
  }

  /* ---------- admin ops (gated by SuperuserGuard at the controller) ---------- */

  listAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existingUsername) throw new ConflictException('Username already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name ?? null,
        username: dto.username ?? null,
        isSuperuser: dto.isSuperuser ?? false,
      },
      select: PUBLIC_FIELDS,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== existing.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException('Email already in use');
    }
    if (dto.username && dto.username !== existing.username) {
      const taken = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (taken) throw new ConflictException('Username already in use');
    }

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.isSuperuser !== undefined) data.isSuperuser = dto.isSuperuser;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_FIELDS,
    });
  }
}
