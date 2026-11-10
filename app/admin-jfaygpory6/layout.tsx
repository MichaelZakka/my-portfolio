import type { Metadata } from 'next';
import HtmlDocument from '../components/HtmlDocument';

export const metadata: Metadata = {
  title: { default: 'Admin | Michael Zakka', template: '%s | Admin' },
  // Hidden path: kept out of search results without listing it in robots.txt
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlDocument lang="en" dir="ltr">
      {children}
    </HtmlDocument>
  );
}
