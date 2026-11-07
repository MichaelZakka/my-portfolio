import type { MetadataRoute } from 'next';
import { getSiteUrl } from './lib/site';
import { getPosts } from './lib/blog';
import { PUBLISHED_PROJECTS } from '../data/projects';
import { routing } from '../i18n/routing';
import { localizedPath } from '../i18n/paths';

type SitemapEntry = MetadataRoute.Sitemap[number];
type Route = { path: string } & Pick<SitemapEntry, 'changeFrequency' | 'priority'>;

/** Every public, indexable route (locale-less). Each is emitted once per locale with hreflang alternates. */
function getRoutes(): Route[] {
  const publishedPosts = getPosts().filter((p) => !p.draft);
  return [
    { path: '/', changeFrequency: 'monthly', priority: 1 },
    ...PUBLISHED_PROJECTS.map((p): Route => ({
      path: `/projects/${p.slug}`,
      changeFrequency: 'monthly',
      priority: 0.8,
    })),
    { path: '/work-with-me', changeFrequency: 'yearly', priority: 0.4 },
    // The blog index is noindexed until a post is published
    ...(publishedPosts.length > 0
      ? [
          { path: '/blog', changeFrequency: 'weekly', priority: 0.6 } as Route,
          ...publishedPosts.map((p): Route => ({
            path: `/blog/${p.slug}`,
            changeFrequency: 'yearly',
            priority: 0.5,
          })),
        ]
      : []),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const url = (locale: string, path: string) => {
    const p = localizedPath(locale, path);
    return p === '/' ? siteUrl : `${siteUrl}${p}`;
  };

  return getRoutes().flatMap((route) =>
    routing.locales.map(
      (locale): SitemapEntry => ({
        url: url(locale, route.path),
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(routing.locales.map((l) => [l, url(l, route.path)])),
        },
      })
    )
  );
}
