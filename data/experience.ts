/** Work history, newest first. Add an optional `result` (a real number or outcome) to any achievement. */
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
        text: 'Built and launched bilingual Arabic/English client sites and the company website with React and Next.js on Vercel.'
      },
      {
        text: 'Set up and managed Shopify stores for agency clients.'
      },
      {
        text: 'Evaluated technical options with the team to choose the stack for client projects.'
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
        text: 'Delivered responsive web apps and landing pages with React and Next.js for clients across different industries.'
      },
      {
        text: 'Owned projects end to end, from requirements gathering to deployment.'
      },
      {
        text: 'Managed client communication directly to keep scope and deadlines on track.'
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
        text: 'Built cross-platform Android and iOS apps in Flutter from SRS documents and UI/UX designs.'
      },
      {
        text: 'Integrated backend APIs together with the backend team.'
      },
      {
        text: 'Delivered responsive, user-friendly UI in close collaboration with designers and stakeholders.'
      },
    ],
  },
];
