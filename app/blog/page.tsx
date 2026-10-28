import Link from 'next/link';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import CircuitBackground from '../components/CircuitBackground';
import { buildPageMetadata } from '../lib/seo';
import { formatPostDate, getPosts } from '../lib/blog';
import styles from './blog.module.css';

const posts = getPosts();

export const metadata = buildPageMetadata({
  title: 'Notes',
  description: 'Notes by Michael Zakka on React, Next.js, RTL/LTR interfaces and frontend engineering.',
  path: '/blog',
  // Keep an empty blog out of search results until the first post is published
  noIndex: posts.filter((p) => !p.draft).length === 0,
});

export default function BlogPage() {
  return (
    <>
      <CircuitBackground />
      <Navigation />
      <main className={styles.main}>
        <div className={`container ${styles.narrow}`}>
          <header className={styles.header}>
            <p className="eyebrow">Notes</p>
            <h1 className={styles.title}>Writing</h1>
            <p className={styles.lead}>Short notes on React, Next.js and building bilingual interfaces.</p>
          </header>

          {posts.length === 0 ? (
            <p className={`card ${styles.empty}`}>The first notes are being written. Check back soon.</p>
          ) : (
            <ul className={styles.list}>
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className={`card card-interactive ${styles.item}`}>
                    <span className={styles.meta}>
                      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                      {post.draft && <span className="todo"> Draft (dev only)</span>}
                    </span>
                    <span className={styles.itemTitle}>{post.title}</span>
                    <span className={styles.summary}>{post.summary}</span>
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
