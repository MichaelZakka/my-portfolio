import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// The client portal is private: never framed, indexed, or leaking its URLs
// (invite and reset links carry tokens) through the Referer header.
const portalHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // forbidden() lets portal pages answer a real 403 for other clients' projects
    authInterrupts: true,
  },
  async headers() {
    return [
      { source: '/portal', headers: portalHeaders },
      { source: '/portal/:path*', headers: portalHeaders },
      { source: '/api/portal/:path*', headers: portalHeaders },
    ];
  },
};

export default withNextIntl(nextConfig);
