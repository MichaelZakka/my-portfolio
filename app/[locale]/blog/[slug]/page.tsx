import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { ArrowLeft } from 'lucide-react';
import Navigation from '../../../components/Navigation';
import Footer from '../../../components/Footer';
import CircuitBackground from '../../../components/CircuitBackground';
import { buildPageMetadata } from '../../../lib/seo';
import { formatPostDate, getPost, getPosts } from '../../../lib/blog';
import { Link } from '../../../../i18n/navigation';
import styles from '../blog.module.css';

type Params = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const meta = buildPageMetadata({
    locale,
    title: post.title,
    description: post.summary,
    path: `/blog/${post.slug}`,
    keywords: post.tags,
    noIndex: post.draft,
  });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: 'article', publishedTime: post.date, tags: post.tags },
  };
}

export default async function PostPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPost(slug);
  if (!post) notFound();
  const t = await getTranslations('blog');

  const { default: Content } = await evaluate(post.content, { ...runtime });

  return (
    <>
      <CircuitBackground />
      <Navigation />
      <main id="main" tabIndex={-1} className={styles.main}>
        <article className={`container ${styles.narrow}`}>
          <nav aria-label="Breadcrumb">
            <Link href="/blog" className={styles.back}>
              <ArrowLeft size={16} aria-hidden className="flip-rtl" />
              {t('allNotes')}
            </Link>
          </nav>
          <header className={styles.header}>
            <p className={styles.meta}>
              <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time>
              {post.draft && <span className="todo"> {t('draft')}</span>}
            </p>
            <h1 className={styles.title} lang="en">
              {post.title}
            </h1>
            <p className={styles.lead} lang="en">
              {post.summary}
            </p>
          </header>
          {/* Posts are written in English only */}
          <div className={`card ${styles.prose}`} lang="en" dir="ltr">
            <Content />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
