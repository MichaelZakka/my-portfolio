import type { MetadataRoute } from 'next';
import { getSiteUrl } from './lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The admin's path is deliberately not listed here (it would publish it); its pages are noindex instead
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
