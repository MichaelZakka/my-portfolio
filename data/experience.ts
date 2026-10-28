/** Work history, newest first. `result` strings starting with "TODO:" are hidden in production. */
export type Achievement = { text: string; result?: string };

export type Role = {
  id: string;
  company: string;
  companyNote?: string;
  website?: string;
  role: string;
  duration: string;
  location: string;
  achievements: Achievement[];
};

export const EXPERIENCE: Role[] = [
  {
    id: 'tgmena',
    company: 'Toward Greatness (TGMENA)',
    companyNote:
      'Toward Greatness, known as TGMENA, is a company offering technical solutions, branding and marketing services.',
    website: 'https://www.tgmena.com/',
    role: 'Fullstack Developer',
    duration: 'Oct 2025 – Present',
    location: 'Remote · Full time',
    achievements: [
      {
        text: 'Built and launched bilingual Arabic/English client sites (New Logo, SAM Sign, Tiny Tots) and the TGMENA site with React and Next.js on Vercel.',
        result: 'TODO: measurable outcome, e.g. Lighthouse score or brief-to-launch time',
      },
      {
        text: 'Set up and managed Shopify stores for agency clients.',
        result: 'TODO: number of stores or a store outcome',
      },
      {
        text: 'Evaluated technical options with the team to choose the stack for client projects.',
        result: 'TODO: outcome of those decisions',
      },
    ],
  },
  {
    id: 'freelance',
    company: 'Freelance',
    role: 'Web Developer',
    duration: '2024 – Present',
    location: 'Remote',
    achievements: [
      {
        text: 'Delivered responsive web apps and landing pages with React and Next.js for clients across different industries.',
        result: 'TODO: number of clients or projects delivered',
      },
      {
        text: 'Owned projects end to end, from requirements gathering to deployment.',
        result: 'TODO: typical delivery time',
      },
      {
        text: 'Managed client communication directly to keep scope and deadlines on track.',
        result: 'TODO: e.g. on-time delivery or repeat clients',
      },
    ],
  },
  {
    id: 'bwire',
    company: 'B-wire',
    website: 'https://b-wire.co/',
    role: 'Flutter Developer',
    duration: 'Apr 2024 – Dec 2024',
    location: 'On site · Damascus (AlShalaan) · Full time',
    achievements: [
      {
        text: 'Built cross-platform Android and iOS apps in Flutter from SRS documents and UI/UX designs.',
        result: 'TODO: number of apps shipped or users reached',
      },
      {
        text: 'Integrated backend APIs together with the backend team.',
        result: 'TODO: outcome',
      },
      {
        text: 'Delivered responsive, user-friendly UI in close collaboration with designers and stakeholders.',
        result: 'TODO: outcome',
      },
    ],
  },
];
