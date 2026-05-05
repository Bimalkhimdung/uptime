import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;

type Severity = 'error' | 'warn' | 'info';
type Issue = { severity: Severity; code: string; message: string };

const PENALTY: Record<Severity, number> = { error: 15, warn: 5, info: 0 };

export type SeoAudit = {
  ok: boolean;
  statusCode: number | null;
  fetchError: string | null;
  score: number;
  issues: Issue[];
  details: Record<string, unknown>;
};

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(private prisma: PrismaService) {}

  /** Run an audit and persist (upsert) a snapshot for the site. Never throws. */
  async refreshSeoForSite(siteId: string, url: string): Promise<void> {
    let audit: SeoAudit;
    try {
      audit = await this.runAudit(url);
    } catch (err: any) {
      this.logger.warn(`SEO audit threw for ${url}: ${err?.message}`);
      audit = {
        ok: false,
        statusCode: null,
        fetchError: err?.message || 'Unknown error',
        score: 0,
        issues: [
          {
            severity: 'error',
            code: 'fetch_failed',
            message: err?.message || 'Audit failed',
          },
        ],
        details: { issues: [] },
      };
    }

    const detailsWithIssues = { ...audit.details, issues: audit.issues };

    await this.prisma.seoSnapshot.upsert({
      where: { siteId },
      create: {
        siteId,
        fetchOk: audit.ok,
        fetchError: audit.fetchError,
        statusCode: audit.statusCode,
        score: audit.score,
        issueCount: audit.issues.length,
        details: detailsWithIssues,
      },
      update: {
        fetchedAt: new Date(),
        fetchOk: audit.ok,
        fetchError: audit.fetchError,
        statusCode: audit.statusCode,
        score: audit.score,
        issueCount: audit.issues.length,
        details: detailsWithIssues,
      },
    });
  }

  async runAudit(url: string): Promise<SeoAudit> {
    const start = Date.now();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    let html = '';
    let bytes = 0;
    let statusCode: number | null = null;

    try {
      res = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'UptimeMonitor-SEO/1.0' },
      });
      statusCode = res.status;

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Empty response body');
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > MAX_BYTES) {
          ctrl.abort();
          throw new Error('Response body exceeded 5MB cap');
        }
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
    } catch (err: any) {
      clearTimeout(t);
      const msg =
        err?.name === 'AbortError'
          ? `Fetch aborted (timeout or size cap) after ${Date.now() - start}ms`
          : err?.message || 'Fetch failed';
      return {
        ok: false,
        statusCode,
        fetchError: msg,
        score: 0,
        issues: [{ severity: 'error', code: 'fetch_failed', message: msg }],
        details: { fetchTimeMs: Date.now() - start, htmlBytes: bytes },
      };
    }
    clearTimeout(t);

    const fetchTimeMs = Date.now() - start;
    const fetchOk =
      statusCode !== null && statusCode >= 200 && statusCode < 300;

    const $ = cheerio.load(html);
    const issues: Issue[] = [];
    if (!fetchOk) {
      issues.push({
        severity: 'error',
        code: 'http_status',
        message: `HTTP ${statusCode}`,
      });
    }

    // Tags
    const title = ($('head > title').first().text() || '').trim();
    const metaDescription = (
      $('meta[name="description"]').attr('content') || ''
    ).trim();
    const canonical = ($('link[rel="canonical"]').attr('href') || '').trim();
    const metaRobots = ($('meta[name="robots"]').attr('content') || '').trim();
    const metaViewport = (
      $('meta[name="viewport"]').attr('content') || ''
    ).trim();
    const charset = (
      $('meta[charset]').attr('charset') ||
      ($('meta[http-equiv="Content-Type"]').attr('content') || '').match(
        /charset=([^;]+)/i,
      )?.[1] ||
      ''
    ).trim();
    const htmlLang = ($('html').attr('lang') || '').trim();

    if (!title) {
      issues.push({
        severity: 'error',
        code: 'missing_title',
        message: 'Page has no <title>',
      });
    } else if (title.length < 30 || title.length > 60) {
      issues.push({
        severity: 'warn',
        code: 'title_length',
        message: `Title is ${title.length} chars (recommended 30–60)`,
      });
    }
    if (!metaDescription) {
      issues.push({
        severity: 'error',
        code: 'missing_meta_description',
        message: 'Meta description is missing',
      });
    } else if (metaDescription.length < 70 || metaDescription.length > 160) {
      issues.push({
        severity: 'warn',
        code: 'meta_description_length',
        message: `Meta description is ${metaDescription.length} chars (recommended 70–160)`,
      });
    }
    if (!canonical) {
      issues.push({
        severity: 'warn',
        code: 'missing_canonical',
        message: 'No canonical link tag',
      });
    }
    if (!metaViewport) {
      issues.push({
        severity: 'warn',
        code: 'missing_viewport',
        message: 'No viewport meta tag (mobile rendering)',
      });
    }

    // Open Graph
    const og = {
      title:
        ($('meta[property="og:title"]').attr('content') || '').trim() || null,
      description:
        ($('meta[property="og:description"]').attr('content') || '').trim() ||
        null,
      image:
        ($('meta[property="og:image"]').attr('content') || '').trim() || null,
      url: ($('meta[property="og:url"]').attr('content') || '').trim() || null,
      type:
        ($('meta[property="og:type"]').attr('content') || '').trim() || null,
    };
    // Twitter
    const twitter = {
      card:
        ($('meta[name="twitter:card"]').attr('content') || '').trim() || null,
      title:
        ($('meta[name="twitter:title"]').attr('content') || '').trim() || null,
      description:
        ($('meta[name="twitter:description"]').attr('content') || '').trim() ||
        null,
      image:
        ($('meta[name="twitter:image"]').attr('content') || '').trim() || null,
    };

    // Headings
    const h1Count = $('h1').length;
    const h1FirstText = ($('h1').first().text() || '').trim() || null;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    if (h1Count !== 1) {
      issues.push({
        severity: 'error',
        code: h1Count === 0 ? 'missing_h1' : 'multiple_h1',
        message:
          h1Count === 0
            ? 'Page has no <h1>'
            : `Page has ${h1Count} <h1> tags (should be exactly 1)`,
      });
    }

    // Images
    const images = $('img').toArray();
    const imageCount = images.length;
    let missingAlt = 0;
    for (const img of images) {
      const alt = $(img).attr('alt');
      if (alt === undefined || alt.trim() === '') missingAlt++;
    }
    if (missingAlt > 0) {
      issues.push({
        severity: 'warn',
        code: 'images_missing_alt',
        message: `${missingAlt} of ${imageCount} images are missing alt text`,
      });
    }

    // Links
    let internal = 0;
    let external = 0;
    let host: string | null = null;
    try {
      host = new URL(url).hostname;
    } catch {
      host = null;
    }
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      )
        return;
      try {
        const abs = new URL(href, url);
        if (host && abs.hostname === host) internal++;
        else external++;
      } catch {
        /* ignore unparseable */
      }
    });

    // Word count (rough — strip script/style/noscript)
    const text = $('body')
      .clone()
      .find('script, style, noscript')
      .remove()
      .end()
      .text();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Structured data
    const schemaBlocks = $('script[type="application/ld+json"]').toArray();
    const schemaTypes: string[] = [];
    for (const s of schemaBlocks) {
      try {
        const parsed = JSON.parse($(s).text());
        const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const it of items) {
          const t2 = it?.['@type'];
          if (typeof t2 === 'string') schemaTypes.push(t2);
          else if (Array.isArray(t2))
            schemaTypes.push(...t2.filter((x) => typeof x === 'string'));
        }
      } catch {
        /* ignore malformed JSON-LD */
      }
    }
    if (schemaBlocks.length === 0) {
      issues.push({
        severity: 'info',
        code: 'no_structured_data',
        message: 'No JSON-LD structured data found',
      });
    }

    // robots.txt + sitemap.xml in parallel
    const baseOrigin = (() => {
      try {
        return new URL(url).origin;
      } catch {
        return null;
      }
    })();

    const [robots, sitemap] = await Promise.all([
      this.fetchAux(baseOrigin ? `${baseOrigin}/robots.txt` : null),
      this.fetchAux(baseOrigin ? `${baseOrigin}/sitemap.xml` : null),
    ]);
    if (!robots.found) {
      issues.push({
        severity: 'info',
        code: 'no_robots_txt',
        message: 'robots.txt not found at the site root',
      });
    }
    let sitemapUrlCount: number | null = null;
    if (!sitemap.found) {
      issues.push({
        severity: 'warn',
        code: 'no_sitemap',
        message: 'sitemap.xml not found at the site root',
      });
    } else {
      const matches = sitemap.body?.match(/<loc>/g);
      sitemapUrlCount = matches ? matches.length : 0;
    }

    // Score
    const penalty = issues.reduce((sum, i) => sum + PENALTY[i.severity], 0);
    const score = Math.max(0, 100 - penalty);

    const details = {
      htmlBytes: bytes,
      fetchTimeMs,
      tags: {
        title: title || null,
        titleLength: title ? title.length : null,
        metaDescription: metaDescription || null,
        metaDescriptionLength: metaDescription ? metaDescription.length : null,
        canonical: canonical || null,
        metaRobots: metaRobots || null,
        metaViewport: metaViewport || null,
        htmlLang: htmlLang || null,
        charset: charset || null,
      },
      openGraph: og,
      twitter,
      headings: { h1Count, h1FirstText, h2Count, h3Count },
      images: { total: imageCount, missingAlt },
      links: { internal, external },
      content: { wordCount },
      robots: {
        found: robots.found,
        contentLength: robots.body?.length ?? null,
      },
      sitemap: { found: sitemap.found, urlCount: sitemapUrlCount },
      structuredData: {
        count: schemaBlocks.length,
        types: Array.from(new Set(schemaTypes)),
      },
    };

    return {
      ok: fetchOk,
      statusCode,
      fetchError: null,
      score,
      issues,
      details,
    };
  }

  private async fetchAux(
    url: string | null,
  ): Promise<{ found: boolean; body: string | null }> {
    if (!url) return { found: false, body: null };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'UptimeMonitor-SEO/1.0' },
      });
      if (!res.ok) return { found: false, body: null };
      const body = await res.text();
      return { found: true, body };
    } catch {
      return { found: false, body: null };
    } finally {
      clearTimeout(t);
    }
  }
}
