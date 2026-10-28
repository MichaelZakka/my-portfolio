import type { Metadata } from 'next';
import { GITHUB_URL, JOB_TITLE, LINKEDIN_URL, getSiteUrl } from './site';
import type { Project } from '../../data/projects';

export const SITE_NAME = 'Michael Zakka';
export const SITE_TITLE_DEFAULT = `Michael Zakka | ${JOB_TITLE}`;
export const SITE_DESCRIPTION =
  'Michael Zakka is a frontend developer building production React & Next.js apps: bilingual (Arabic/English, RTL/LTR), fast, and shipped to real users. Projects, experience, and resume.';
export const SITE_KEYWORDS = [
  'Michael Zakka',
  'Frontend Developer',
  'React Developer',
  'Next.js Developer',
  'TypeScript',
  'RTL',
  'Arabic English bilingual websites',
  'Frontend Developer Damascus',
  'Remote Frontend Developer',
  'Portfolio',
];

export const PERSON = {
  name: 'Michael Zakka',
  jobTitle: JOB_TITLE,
  email: 'michealzakka@gmail.com',
  // Private: used by the admin dashboard only, never rendered on public pages or JSON-LD.
  telephone: '+963992833739',
  addressLocality: 'Damascus',
  addressCountry: 'SY',
  sameAs: [LINKEDIN_URL, ...(GITHUB_URL ? [GITHUB_URL] : [])],
} as const;

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  ogType?: 'website' | 'profile';
  noIndex?: boolean;
  /** Absolute URL of the social preview image; defaults to /og-image.jpg. */
  image?: string;
};

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords = SITE_KEYWORDS,
  ogType = 'website',
  noIndex = false,
  image,
  absoluteTitle = false,
}: BuildPageMetadataInput & { absoluteTitle?: boolean }): Metadata {
  const siteUrl = getSiteUrl();
  const url = path === '/' ? siteUrl : `${siteUrl}${path}`;
  const ogImage = image ?? `${siteUrl}/og-image.jpg`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    authors: [{ name: PERSON.name, url: siteUrl }],
    creator: PERSON.name,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: ogType,
      locale: 'en_US',
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${PERSON.name} — ${PERSON.jobTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}

export function personJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteUrl}/#person`,
    name: PERSON.name,
    url: siteUrl,
    image: `${siteUrl}/og-image.jpg`,
    jobTitle: PERSON.jobTitle,
    email: `mailto:${PERSON.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: PERSON.addressLocality,
      addressCountry: PERSON.addressCountry,
    },
    sameAs: [...PERSON.sameAs],
    knowsAbout: [
      'Frontend Development',
      'React',
      'Next.js',
      'TypeScript',
      'Right-to-left (RTL) web layouts',
      'Shopify',
    ],
  };
}

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${siteUrl}/#person` },
    inLanguage: 'en',
  };
}

export function homePageJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${siteUrl}/#webpage`,
    url: siteUrl,
    name: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#person` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${siteUrl}/og-image.jpg`,
    },
    inLanguage: 'en',
  };
}

export function workWithMeJsonLd() {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/work-with-me`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}/#webpage`,
    url: pageUrl,
    name: 'Work with me | Michael Zakka',
    description:
      'Start a freelancing project with Michael Zakka — web apps, landing pages, Shopify stores, or Flutter mobile apps.',
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#person` },
    mainEntity: {
      '@type': 'ContactPage',
      name: 'Project intake survey',
      url: pageUrl,
      description:
        'Multi-step project brief form for freelancing inquiries with Michael Zakka.',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Work with me',
          item: pageUrl,
        },
      ],
    },
    inLanguage: 'en',
  };
}

export function projectJsonLd(project: Project) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/projects/${project.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${pageUrl}#work`,
    name: project.title,
    description: project.summary,
    url: pageUrl,
    ...(project.liveUrl ? { sameAs: project.liveUrl } : {}),
    ...(project.images[0] ? { image: `${siteUrl}${project.images[0].src}` } : {}),
    keywords: project.stack.filter((t) => !t.startsWith('TODO')).join(', '),
    creator: { '@id': `${siteUrl}/#person` },
    inLanguage: 'en',
  };
}
