import { useTranslations } from 'next-intl';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Link } from '../../i18n/navigation';

// No generateMetadata here: not-found metadata can't see the locale (no params), so
// next-intl would read request headers, which fails ("static to dynamic") when a
// project or blog page rebuilt after a content save calls notFound(). The tab keeps
// the locale layout's title; the page itself says "Page not found".
export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  return (
    <>
      <Navigation />
      <main id="main" tabIndex={-1} className="container section" style={{ minHeight: '70vh', paddingBlockStart: 140 }}>
        <h1 className="section-title">{t('title')}</h1>
        <p style={{ marginBlock: '16px 24px', color: 'var(--text-muted)' }}>{t('text')}</p>
        <Link href="/" className="btn btn-primary">
          {t('back')}
        </Link>
      </main>
      <Footer />
    </>
  );
}
