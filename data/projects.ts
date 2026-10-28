import type { StaticImageData } from 'next/image';
import learnProgrammingImg from '../app/assets/learning programming/learn-programming.webp';
import learnProgrammingImg1 from '../app/assets/learning programming/learn-programming1.webp';
import learnProgrammingImg2 from '../app/assets/learning programming/learn-programming2.webp';
import newLogoImg from '../app/assets/new logo/new-logo.webp';
import newLogoImg1 from '../app/assets/new logo/new-logo1.webp';
import samSignImg from '../app/assets/sam sign/sam-sign.webp';
import samSignImg1 from '../app/assets/sam sign/sam-sign1.webp';
import tgmenaImg from '../app/assets/tgmena/tg.webp';
import tgmenaImg1 from '../app/assets/tgmena/tg1.webp';
import tinyTotsImg from '../app/assets/tinytots/tinytots.webp';
import tinyTotsImg1 from '../app/assets/tinytots/tinytots1.webp';

/**
 * Any string starting with "TODO:" is a placeholder for Michael to fill in.
 * Placeholders render as dashed notes in development and are hidden in production
 * (see data/todo.ts).
 */
export type Link = { name: string; url: string };

export type Project = {
  slug: string;
  title: string;
  /** One line for cards and meta descriptions. */
  summary: string;
  /** Longer overview for the case-study page. */
  overview: string;
  role: string;
  team: string;
  stack: string[];
  challenges: string[];
  solutions: string[];
  results: string[];
  liveUrl?: string;
  repoUrl?: string;
  /** Shown instead of a Code button when the source can't be public. */
  repoPrivateNote?: string;
  images: StaticImageData[];
  /** Only featured projects are listed and get a /projects/[slug] page. */
  featured: boolean;
  personal?: boolean;
  employer?: Link;
  collaborators?: Link[];
};

const TGMENA: Link = { name: 'TGMENA (Toward Greatness)', url: 'https://www.tgmena.com/' };
const AHMAD_AFIF: Link = { name: 'Ahmad Afif', url: 'https://www.ahmad-afif.com/' };
const CLIENT_PRIVATE = 'Client code private';

const METRIC_TODOS = [
  'TODO: Lighthouse scores (performance / accessibility / best practices / SEO)',
  'TODO: page load time (e.g. LCP on mobile)',
  'TODO: delivery time (brief to launch)',
];

export const PROJECTS: Project[] = [
  {
    slug: 'learn-programming',
    title: 'Learn Programming',
    summary: 'Educational web app that teaches programming fundamentals through structured lessons.',
    overview:
      'A personal project built for learning and experimentation, not for commercial use. An educational web app built with Next.js to help users learn programming fundamentals through structured lessons and a friendly interface. Deployed on Vercel.',
    role: 'Solo project: design, development and deployment',
    team: 'Solo',
    stack: ['Next.js', 'JavaScript', 'Vercel'],
    challenges: [
      'Present lessons in a clear order that stays readable on phones and desktops.',
    ],
    solutions: [
      'Structured lesson pages with Next.js routing and a responsive layout.',
      'Deployed on Vercel for instant previews and production builds.',
    ],
    results: [...METRIC_TODOS.slice(0, 2)],
    liveUrl: 'https://learn-programming-azure.vercel.app/',
    repoUrl: undefined, // TODO: add the public GitHub repo URL if this project's code is public
    images: [learnProgrammingImg, learnProgrammingImg1, learnProgrammingImg2],
    featured: true,
    personal: true,
  },
  {
    slug: 'new-logo',
    title: 'New Logo',
    summary: 'Bilingual landing page for a Saudi branding and visual identity company.',
    overview:
      'A landing page built with Next.js for a branding company based in Saudi Arabia, specialized in brand identity and visual design. Focused on presenting the company’s services with a polished, modern layout tailored to the regional market.',
    role: 'Frontend developer at TGMENA: built and deployed the site',
    team: 'TGMENA team',
    stack: ['Next.js', 'JavaScript', 'Vercel'],
    challenges: [
      'Serve Arabic and English visitors with one codebase and a layout that mirrors correctly.',
      'Keep a visual-heavy branding page fast on mobile.',
    ],
    solutions: [
      'Bilingual pages with direction-aware layout for Arabic (RTL) and English (LTR).',
      'Responsive layout and optimized images for small screens.',
      'Next.js build deployed on Vercel.',
    ],
    results: [...METRIC_TODOS],
    liveUrl: 'https://newlogo.sa/',
    repoPrivateNote: CLIENT_PRIVATE,
    images: [newLogoImg, newLogoImg1],
    featured: true,
    employer: TGMENA,
  },
  {
    slug: 'sam-sign',
    title: 'SAM Sign',
    summary: 'Bilingual landing page for a Saudi signage company serving businesses and stores.',
    overview:
      'A landing page built with Next.js for SAM Sign, a company specialized in signs for businesses and stores. Designed to showcase their signage solutions and help potential clients understand services with a clear, professional presentation.',
    role: 'Frontend developer at TGMENA: built and deployed the site',
    team: 'TGMENA team',
    stack: ['Next.js', 'JavaScript', 'Vercel'],
    challenges: [
      'Present many signage products clearly in both Arabic and English.',
    ],
    solutions: [
      'Bilingual RTL/LTR layout with a clear service structure.',
      'Responsive design and optimized product imagery.',
      'Next.js build deployed on Vercel.',
    ],
    results: [...METRIC_TODOS],
    liveUrl: 'https://samsign.sa/',
    repoPrivateNote: CLIENT_PRIVATE,
    images: [samSignImg1, samSignImg],
    featured: true,
    employer: TGMENA,
  },
  {
    slug: 'tgmena',
    title: 'TGMENA Landing Page',
    summary: 'Company site for TGMENA, a technical solutions, branding and marketing agency.',
    overview:
      'A landing page built with Next.js for TGMENA (Toward Greatness), a company specialized in technical solutions, branding, and marketing services. Designed to present the company’s full offering with a modern, professional layout that reflects their multi-service expertise.',
    role: 'TODO: my exact contribution on this project (built together with Ahmad Afif)',
    team: 'TGMENA team, with Ahmad Afif',
    stack: ['Next.js', 'JavaScript', 'Vercel'],
    challenges: [
      'Present several service lines (tech, branding, marketing) without overwhelming visitors.',
    ],
    solutions: [
      'Responsive, section-based layout for each service line.',
      'Next.js build deployed on Vercel.',
    ],
    results: [...METRIC_TODOS],
    liveUrl: 'https://www.tgmena.com/',
    repoPrivateNote: CLIENT_PRIVATE,
    images: [tgmenaImg, tgmenaImg1],
    featured: true,
    employer: TGMENA,
    collaborators: [AHMAD_AFIF],
  },
  {
    slug: 'tiny-tots',
    title: 'Tiny Tots',
    summary: 'Bilingual Arabic/English site for a kindergarten in Saudi Arabia.',
    overview:
      'A bilingual landing page built with Next.js for Tiny Tots, a kindergarten in Saudi Arabia. Designed to introduce the school’s programs and values to parents with a warm, trustworthy presentation suited to the local market.',
    role: 'TODO: my exact contribution on this project (built together with Ahmad Afif)',
    team: 'TGMENA team, with Ahmad Afif',
    stack: ['Next.js', 'JavaScript', 'Vercel'],
    challenges: [
      'Arabic is right-to-left: the whole layout, spacing and icons must mirror without breaking the English version.',
      'Parents mostly browse on phones, so the page has to stay light and readable on small screens.',
    ],
    solutions: [
      'Bilingual RTL/LTR layout using direction-aware styling so one set of components serves both languages.',
      'Responsive design with optimized images.',
      'Next.js build deployed on Vercel.',
    ],
    results: [...METRIC_TODOS],
    liveUrl: 'https://tinytotsksa.com/',
    repoPrivateNote: CLIENT_PRIVATE,
    images: [tinyTotsImg, tinyTotsImg1],
    featured: true,
    employer: TGMENA,
    collaborators: [AHMAD_AFIF],
  },

  // ---- Placeholders: hidden until filled in and switched to featured: true ----
  {
    slug: 'todo-fullstack-nextjs-app',
    title: 'TODO: full-stack Next.js app',
    summary: 'TODO: one-line summary',
    overview: 'TODO: overview',
    role: 'TODO: role',
    team: 'TODO: team',
    stack: ['Next.js', 'TODO: rest of stack'],
    challenges: ['TODO: challenge'],
    solutions: ['TODO: solution'],
    results: ['TODO: result with a real number'],
    images: [],
    featured: false,
  },
  {
    slug: 'todo-shopify-project',
    title: 'TODO: Shopify project',
    summary: 'TODO: one-line summary',
    overview: 'TODO: overview',
    role: 'TODO: role',
    team: 'TODO: team',
    stack: ['Shopify', 'TODO: rest of stack'],
    challenges: ['TODO: challenge'],
    solutions: ['TODO: solution'],
    results: ['TODO: result with a real number'],
    images: [],
    featured: false,
  },
  {
    slug: 'todo-flutter-app',
    title: 'TODO: Flutter app',
    summary: 'TODO: one-line summary',
    overview: 'TODO: overview',
    role: 'TODO: role',
    team: 'TODO: team',
    stack: ['Flutter', 'Dart', 'TODO: rest of stack'],
    challenges: ['TODO: challenge'],
    solutions: ['TODO: solution'],
    results: ['TODO: result with a real number'],
    images: [],
    featured: false,
  },
];

export const PUBLISHED_PROJECTS = PROJECTS.filter((p) => p.featured);

export function getProject(slug: string): Project | undefined {
  return PUBLISHED_PROJECTS.find((p) => p.slug === slug);
}
