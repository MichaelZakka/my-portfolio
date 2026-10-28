import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  draft: boolean;
};

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function readPost(file: string): PostMeta & { content: string } {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? '');
  return {
    slug: file.replace(/\.mdx$/, ''),
    title: String(data.title ?? ''),
    date,
    summary: String(data.summary ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: data.draft === true,
    content,
  };
}

function allPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map(readPost)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Drafts are visible in development only, never listed or built in production. */
const includeDrafts = process.env.NODE_ENV !== 'production';

export function getPosts(): PostMeta[] {
  return allPosts()
    .filter((p) => includeDrafts || !p.draft)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      summary: p.summary,
      tags: p.tags,
      draft: p.draft,
    }));
}

export function getPost(slug: string) {
  return allPosts().find((p) => p.slug === slug && (includeDrafts || !p.draft));
}

export const formatPostDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
