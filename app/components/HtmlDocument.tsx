import { Suspense, type ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Space_Grotesk, IBM_Plex_Sans_Arabic } from 'next/font/google';
import AnalyticsTracker from './AnalyticsTracker';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  preload: false,
});

/** <html>/<body> shell shared by the localized site and the admin dashboard. */
export default function HtmlDocument({
  lang,
  dir,
  children,
}: {
  lang: string;
  dir: 'ltr' | 'rtl';
  children: ReactNode;
}) {
  return (
    <html
      lang={lang}
      dir={dir}
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexArabic.variable}`}
    >
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
