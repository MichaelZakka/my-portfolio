/** Production origin (apex domain, no www). Single source of truth for the site URL. */
export const SITE_URL = 'https://michael-zakka.com';

/**
 * Canonical site origin for SEO (robots, sitemap, metadataBase, JSON-LD) and portal email links.
 * NEXT_PUBLIC_SITE_URL overrides it (e.g. http://localhost:3000 for local portal testing);
 * otherwise every environment, including Vercel previews, uses SITE_URL.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return fromEnv ? fromEnv.replace(/\/$/, '') : SITE_URL;
}

/** English job title for JSON-LD; the UI reads meta.jobTitle from messages/<locale>.json. */
export const JOB_TITLE = 'Web Developer (React / Next.js)';

// TODO(michael): set your GitHub profile URL, e.g. 'https://github.com/your-username'.
// GitHub links stay hidden everywhere while this is null.
export const GITHUB_URL: string | null = null;

// TODO(michael): set the public repo URL of this portfolio for the footer "view source" link.
export const SOURCE_REPO_URL: string | null = null;

export const LINKEDIN_URL = 'https://linkedin.com/in/michael-zakka';
export const EMAIL = 'michealzakka@gmail.com';

export const RESUME_URL = '/michael-zakka-cv.pdf';
