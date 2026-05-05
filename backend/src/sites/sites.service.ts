import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeoService } from '../seo/seo.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  private readonly logger = new Logger(SitesService.name);

  constructor(
    private prisma: PrismaService,
    private seo: SeoService,
    private analytics: AnalyticsService,
  ) {}

  async create(userId: string, dto: CreateSiteDto) {
    const site = await this.prisma.site.create({
      data: { userId, name: dto.name, url: dto.url },
    });
    // Fire-and-forget first audit so the user sees data on next refresh.
    this.seo.refreshSeoForSite(site.id, site.url).catch((err) => {
      this.logger.warn(
        `Initial SEO audit failed for ${site.url}: ${err?.message}`,
      );
    });
    return site;
  }

  async findAll(userId: string) {
    return this.prisma.site.findMany({
      where: { userId },
      include: { seoSnapshot: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: { seoSnapshot: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    if (site.userId !== userId) throw new ForbiddenException();
    return site;
  }

  async update(userId: string, id: string, dto: UpdateSiteDto) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    if (site.userId !== userId) throw new ForbiddenException();

    const urlChanged = dto.url !== undefined && dto.url !== site.url;
    const updated = await this.prisma.site.update({
      where: { id },
      data: dto,
      include: { seoSnapshot: true },
    });

    if (urlChanged) {
      this.seo.refreshSeoForSite(updated.id, updated.url).catch((err) => {
        this.logger.warn(
          `SEO re-audit after URL change failed: ${err?.message}`,
        );
      });
    }
    return updated;
  }

  async remove(userId: string, id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    if (site.userId !== userId) throw new ForbiddenException();
    await this.prisma.site.delete({ where: { id } });
    return { message: 'Site deleted' };
  }

  async refreshSeo(userId: string, id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    if (site.userId !== userId) throw new ForbiddenException();
    await this.seo.refreshSeoForSite(site.id, site.url);
    return this.findOne(userId, id);
  }

  /** Live-fetch GA4 metrics for a site. Requires both Google connection and gaPropertyId. */
  async getAnalytics(userId: string, id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    if (site.userId !== userId) throw new ForbiddenException();
    if (!site.gaPropertyId) {
      throw new BadRequestException('No GA4 property linked to this site');
    }
    return this.analytics.fetchSiteAnalytics(userId, site.gaPropertyId);
  }
}
