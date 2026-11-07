import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import CircuitBackground from '../../components/CircuitBackground';
import { buildPageMetadata } from '../../lib/seo';
import { formatPostDate, getPosts } from '../../lib/blog';
import { Link } from '../../../i18n/navigation';
import styles from './blog.module.css';

const posts = getPosts();

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return buildPageMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/blog',
    // Keep an empty blog out of search results until the first post is published
    noIndex: posts.filter((p) => !p.draft).length === 0,
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('blog');

  return (
    <>
      <CircuitBackground />
      <Navigation />
      <main id="main" tabIndex={-1} className={styles.main}>
        <div className={`container ${styles.narrow}`}>
          <header className={styles.header}>
            <p className="eyebrow">{t('eyebrow')}</p>
            <h1 className={styles.title}>{t('title')}</h1>
            <p className={styles.lead}>{t('lead')}</p>
          </header>

          {posts.length === 0 ? (
            <p className={`card ${styles.empty}`}>{t('empty')}</p>
          ) : (
            <ul className={styles.list}>
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className={`card card-interactive ${styles.item}`}>
                    <span className={styles.meta}>
                      <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
                      {post.draft && <span className="todo"> {t('draft')}</span>}
                    </span>
                    <span className={styles.itemTitle} lang="en">
                      {post.title}
                    </span>
                    <span className={styles.summary} lang="en">
                      {post.summary}
                    </span>
                    {post.tags.length > 0 && (
                      <span className={styles.tags}>
                        {post.tags.map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
