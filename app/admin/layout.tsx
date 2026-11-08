import type { Metadata } from 'next';
import HtmlDocument from '../components/HtmlDocument';

export const metadata: Metadata = {
  title: { default: 'Admin | Michael Zakka', template: '%s | Admin' },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlDocument lang="en" dir="ltr">
      {children}
    </HtmlDocument>
  );
}
