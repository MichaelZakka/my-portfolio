import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  // English stays at "/", Arabic lives under "/ar"
  localePrefix: 'as-needed',
  // Recruiters land on English by default; Arabic is one click away in the nav
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const dirFor = (locale: string) => (locale === 'ar' ? 'rtl' : 'ltr');
