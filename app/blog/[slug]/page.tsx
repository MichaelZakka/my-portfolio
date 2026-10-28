import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { ArrowLeft } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import CircuitBackground from '../../components/CircuitBackground';
import { buildPageMetadata } from '../../lib/seo';
import { formatPostDate, getPost, getPosts } from '../../lib/blog';
import styles from '../blog.module.css';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const meta = buildPageMetadata({
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
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { default: Content } = await evaluate(post.content, { ...runtime });

  return (
    <>
      <CircuitBackground />
      <Navigation />
      <main className={styles.main}>
        <article className={`container ${styles.narrow}`}>
          <nav aria-label="Breadcrumb">
            <Link href="/blog" className={styles.back}>
              <ArrowLeft size={16} aria-hidden className="flip-rtl" />
              All notes
            </Link>
          </nav>
          <header className={styles.header}>
            <p className={styles.meta}>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              {post.draft && <span className="todo"> Draft (dev only)</span>}
            </p>
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.lead}>{post.summary}</p>
          </header>
          <div className={`card ${styles.prose}`}>
            <Content />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
