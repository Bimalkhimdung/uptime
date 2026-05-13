import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://uptime.nepsesignal.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Authenticated app surfaces and old/renamed routes — nothing to
        // index there.
        disallow: [
          '/dashboard',
          '/monitors',
          '/incidents',
          '/seo',
          '/users',
          '/auth/',
          '/api/',
          '/tools/domain',
          '/tools/ssl',
          '/tools/dns',
          '/tools/curl',
          '/tools/ping',
          '/tools/ports',
          '/tools/http',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
