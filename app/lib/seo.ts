import type { Metadata } from 'next';
import { getSiteUrl } from './site';

export const SITE_NAME = 'Michael Zakka';
export const SITE_TITLE_DEFAULT = 'Michael Zakka | IT Engineer & Full-Stack Developer';
export const SITE_DESCRIPTION =
  'Portfolio of Michael Zakka — IT Engineer and Full-Stack Developer specializing in React, Next.js, Shopify, and Flutter. Explore projects, services, and experience.';
export const SITE_KEYWORDS = [
  'Michael Zakka',
  'IT Engineer',
  'Full-Stack Developer',
  'Portfolio',
  'Web Development',
  'Next.js',
  'React',
  'Flutter Developer',
  'Shopify',
  'Freelance Developer',
];

export const PERSON = {
  name: 'Michael Zakka',
  jobTitle: 'IT Engineer & Full-Stack Developer',
  email: 'michealzakka@gmail.com',
  telephone: '+963992833739',
  addressLocality: 'Damascus',
  addressCountry: 'SY',
  sameAs: [
    'https://linkedin.com/in/michael-zakka',
    'https://wa.me/963992833739',
  ],
} as const;

export const SERVICES = [
  {
    name: 'Web Projects',
    description:
      'Modern, scalable web applications with React, Next.js, and full-stack technologies.',
  },
  {
    name: 'Landing Pages',
    description:
      'High-converting, fast, SEO-friendly landing pages optimized for performance.',
  },
  {
    name: 'Shopify Stores',
    description:
      'Custom Shopify themes, store setup, payments, and product experiences.',
  },
  {
    name: 'Mobile Applications',
    description:
      'Cross-platform Flutter apps for iOS and Android with polished UI/UX.',
  },
] as const;

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  ogType?: 'website' | 'profile';
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords = SITE_KEYWORDS,
  ogType = 'website',
  noIndex = false,
  absoluteTitle = false,
}: BuildPageMetadataInput & { absoluteTitle?: boolean }): Metadata {
  const siteUrl = getSiteUrl();
  const url = path === '/' ? siteUrl : `${siteUrl}${path}`;
  const ogImage = `${siteUrl}/og-image.jpg`;

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
    telephone: PERSON.telephone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: PERSON.addressLocality,
      addressCountry: PERSON.addressCountry,
    },
    sameAs: [...PERSON.sameAs],
    knowsAbout: [
      'Web Development',
      'Next.js',
      'React',
      'Flutter',
      'Shopify',
      'Full-Stack Development',
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

export function professionalServiceJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}/#services`,
    name: `${PERSON.name} — Freelance Development`,
    url: siteUrl,
    image: `${siteUrl}/og-image.jpg`,
    description: SITE_DESCRIPTION,
    provider: { '@id': `${siteUrl}/#person` },
    areaServed: 'Worldwide',
    availableLanguage: ['English', 'Arabic'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Development services',
      itemListElement: SERVICES.map((service, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.description,
        },
      })),
    },
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
