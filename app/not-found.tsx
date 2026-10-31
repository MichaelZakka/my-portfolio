import Link from 'next/link';
import HtmlDocument from './components/HtmlDocument';

/** Fallback 404 for paths outside any locale (e.g. an unknown locale prefix). */
export default function GlobalNotFound() {
  return (
    <HtmlDocument lang="en" dir="ltr">
      <main className="container section" style={{ minHeight: '70vh' }}>
        <h1 className="section-title">Page not found</h1>
        <p style={{ marginBlock: '16px 24px', color: 'var(--text-muted)' }}>
          This page doesn&apos;t exist. 
        </p>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </main>
    </HtmlDocument>
  );
}
