import type { MetadataRoute } from 'next';

// `output: "export"` in next.config requires sitemap/robots to be statically
// rendered at build time — opt in explicitly.
export const dynamic = 'force-static';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://uptime.nepsesignal.com';

// Priority ladder (per sitemaps.org spec, 0.0–1.0):
//   1.0  homepage — the canonical landing entry point
//   0.8  free tools — primary SEO targets, each ranks independently
//   0.4  auth pages — useful but rarely the search target
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },

    // Free tools — each is a self-contained landing page worth indexing
    {
      url: `${BASE_URL}/tools/domain_check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools/ssl_check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools/dns_check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools/http_status_check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tools/online_curl`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools/ping_check`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tools/port_scan`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },

    // Auth pages
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];
}
