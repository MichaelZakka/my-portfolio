import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { getSiteUrl } from './lib/site';

type SitemapEntry = MetadataRoute.Sitemap[number];

const PAGE_FILE = /^page\.(tsx|ts|jsx|js)$/;
const SKIP_DIRS = new Set(['api', 'components', 'lib', 'hooks', 'utils', 'types', 'admin']);

/** Route metadata overrides keyed by pathname (e.g. "/", "/work-with-me"). */
const ROUTE_META: Record<
  string,
  Pick<SitemapEntry, 'changeFrequency' | 'priority'>
> = {
  '/': { changeFrequency: 'monthly', priority: 1 },
  '/work-with-me': { changeFrequency: 'monthly', priority: 0.8 },
};

/**
 * Walk `app/` and collect static route paths from `page.*` files.
 * Skips route groups, private folders, API, and dynamic `[param]` segments.
 */
function getStaticAppRoutes(appDir: string): string[] {
  const routes: string[] = [];

  const walk = (dir: string, urlPath: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasPage = entries.some(
      (entry) => entry.isFile() && PAGE_FILE.test(entry.name)
    );

    if (hasPage) {
      routes.push(urlPath || '/');
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const name = entry.name;

      // Private folders (_components) and known non-route folders
      if (name.startsWith('_') || name.startsWith('.') || SKIP_DIRS.has(name)) {
        continue;
      }

      // Route groups: (marketing) — do not affect the URL
      if (name.startsWith('(') && name.endsWith(')')) {
        walk(path.join(dir, name), urlPath);
        continue;
      }

      // Dynamic segments — handled separately if/when added
      if (name.startsWith('[') && name.endsWith(']')) {
        continue;
      }

      walk(path.join(dir, name), `${urlPath}/${name}`);
    }
  };

  walk(appDir, '');
  return Array.from(new Set(routes)).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Placeholder for future dynamic routes (blog posts, project detail pages, etc.).
 * Return absolute URL entries when those routes exist.
 */
async function getDynamicRoutes(_siteUrl: string): Promise<MetadataRoute.Sitemap> {
  // No dynamic app routes yet (projects live as homepage sections).
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const appDir = path.join(process.cwd(), 'app');
  const lastModified = new Date();

  const staticRoutes = getStaticAppRoutes(appDir).map((route): SitemapEntry => {
    const meta = ROUTE_META[route] ?? {
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };

    return {
      url: route === '/' ? siteUrl : `${siteUrl}${route}`,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });

  const dynamicRoutes = await getDynamicRoutes(siteUrl);

  return [...staticRoutes, ...dynamicRoutes];
}
