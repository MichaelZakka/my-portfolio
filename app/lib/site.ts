/**
 * Canonical site origin for SEO (robots, sitemap, metadataBase).
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  // Vercel provides these when NEXT_PUBLIC_SITE_URL is not set yet
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/^https?:\/\//, '')}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, '')}`;
  }

  return 'http://localhost:3000';
}

/** Single job title used across metadata, hero, nav and footer. */
export const JOB_TITLE = 'Frontend Developer (React / Next.js)';

/** What the hero "Open to" badge lists. */
export const OPEN_TO = ['Remote', 'Damascus on-site'] as const;

// TODO(michael): set your GitHub profile URL, e.g. 'https://github.com/your-username'.
// GitHub links stay hidden everywhere while this is null.
export const GITHUB_URL: string | null = null;

// TODO(michael): set the public repo URL of this portfolio for the footer "view source" link.
export const SOURCE_REPO_URL: string | null = null;

export const LINKEDIN_URL = 'https://linkedin.com/in/michael-zakka';
export const EMAIL = 'michealzakka@gmail.com';

// TODO(michael): add the updated CV at public/michael-zakka-cv.pdf (link 404s until then).
export const RESUME_URL = '/michael-zakka-cv.pdf';
