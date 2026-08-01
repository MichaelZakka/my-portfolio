import type { StaticImageData } from 'next/image';
import learnProgrammingImg from '../assets/learning programming/learn-programming.webp';
import learnProgrammingImg1 from '../assets/learning programming/learn-programming1.webp';
import learnProgrammingImg2 from '../assets/learning programming/learn-programming2.webp';
import newLogoImg from '../assets/new logo/new-logo.webp';
import newLogoImg1 from '../assets/new logo/new-logo1.webp';
import samSignImg from '../assets/sam sign/sam-sign.webp';
import samSignImg1 from '../assets/sam sign/sam-sign1.webp';
import tgmenaImg from '../assets/tgmena/tg.webp';
import tgmenaImg1 from '../assets/tgmena/tg1.webp';
import tinyTotsImg from '../assets/tinytots/tinytots.webp';
import tinyTotsImg1 from '../assets/tinytots/tinytots1.webp';

export type Collaborator = {
  name: string;
  url: string;
};

export type Project = {
  title: string;
  description: string;
  technologies: string[];
  image?: string;
  images?: StaticImageData[];
  liveUrl?: string;
  githubUrl?: string;
  highlights: string[];
  isSelfProject?: boolean;
  employer?: string;
  employerUrl?: string;
  collaborators?: Collaborator[];
};

/** Featured projects shown on the homepage — single source of truth (also used by /admin/site). */
export const PROJECTS: Project[] = [
  {
    title: 'Learn Programming',
    description:
      'A personal self-project built for learning and experimentation — not intended for commercial use. An educational web app built with Next.js to help users learn programming fundamentals through structured lessons and a friendly interface. Deployed on Vercel.',
    technologies: ['Next.js', 'JavaScript', 'Vercel'],
    images: [learnProgrammingImg, learnProgrammingImg1, learnProgrammingImg2],
    highlights: ['Self Project', 'Educational'],
    isSelfProject: true,
    liveUrl: 'https://learn-programming-azure.vercel.app/',
  },
  {
    title: 'New Logo',
    description:
      'A landing page built with Next.js for a branding company based in Saudi Arabia, specialized in brand identity and visual design. Focused on presenting the company’s services with a polished, modern layout tailored to the regional market.',
    technologies: ['Next.js', 'Vercel', 'JavaScript'],
    images: [newLogoImg, newLogoImg1],
    highlights: ['Landing Page', 'Branding', 'Saudi Arabia', 'Bilingual'],
    employer: 'TGMENA (Toward Greatness)',
    employerUrl: 'https://www.tgmena.com/',
    liveUrl: 'https://newlogo.sa/',
  },
  {
    title: 'SAM Sign',
    description:
      'A landing page built with Next.js for SAM Sign, a company specialized in signs for businesses and stores. Designed to showcase their signage solutions and help potential clients understand services with a clear, professional presentation.',
    technologies: ['Next.js', 'Vercel', 'JavaScript'],
    images: [samSignImg1, samSignImg],
    highlights: ['Landing Page', 'Signage', 'Saudi Arabia', 'Bilingual'],
    employer: 'TGMENA (Toward Greatness)',
    employerUrl: 'https://www.tgmena.com/',
    liveUrl: 'https://samsign.sa/',
  },
  {
    title: 'TGMENA Landing Page',
    description:
      'A landing page built with Next.js for TGMENA (Toward Greatness), a company specialized in technical solutions, branding, and marketing services. Designed to present the company’s full offering with a modern, professional layout that reflects their multi-service expertise.',
    technologies: ['Next.js', 'Vercel', 'JavaScript'],
    images: [tgmenaImg, tgmenaImg1],
    highlights: ['Landing Page', 'Branding', 'Marketing', 'Technical Solutions'],
    employer: 'TGMENA (Toward Greatness)',
    employerUrl: 'https://www.tgmena.com/',
    liveUrl: 'https://www.tgmena.com/',
    collaborators: [{ name: 'Ahmad Afif', url: 'https://www.ahmad-afif.com/' }],
  },
  {
    title: 'Tiny Tots',
    description:
      'A bilingual landing page built with Next.js for Tiny Tots, a kindergarten in Saudi Arabia. Designed to introduce the school’s programs and values to parents with a warm, trustworthy presentation suited to the local market.',
    technologies: ['Next.js', 'Vercel', 'JavaScript'],
    images: [tinyTotsImg, tinyTotsImg1],
    highlights: ['Landing Page', 'Kindergarten', 'Saudi Arabia', 'Bilingual'],
    employer: 'TGMENA (Toward Greatness)',
    employerUrl: 'https://www.tgmena.com/',
    liveUrl: 'https://tinytotsksa.com/',
    collaborators: [{ name: 'Ahmad Afif', url: 'https://www.ahmad-afif.com/' }],
  },
];
