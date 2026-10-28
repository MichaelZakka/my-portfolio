import type { Metadata, Viewport } from 'next';
import { SITE_NAME } from './lib/seo';
import { getSiteUrl } from './lib/site';
import './globals.css';

// <html>/<body> are rendered by app/[locale]/layout.tsx (with lang/dir) and app/admin/layout.tsx.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a1628',
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  icons: {
    icon: '/portfolio-icon.svg',
    shortcut: '/portfolio-icon.svg',
    apple: '/portfolio-icon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
