import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Keep auth + per-tenant routes out of search results.
        // Authenticated tenant pages aren't useful to index and may leak
        // tenant slugs into Google's index by accident.
        disallow: [
          '/api/',
          '/login',
          '/signup',
          '/accept',
          '/forgot-password',
          '/reset-password',
          '/auth/',
          '/onboarding/',
          // Anything that looks like /<tenant-slug>/* — match common dashboard subpaths.
          '/*/dashboard',
          '/*/projects',
          '/*/projects/',
          '/*/team',
          '/*/settings',
        ],
      },
    ],
    sitemap: 'https://buildersready.uk/sitemap.xml',
  };
}
