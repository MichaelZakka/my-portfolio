/** "What I bring to a team" cards. Each proof line must stay verifiably true. */
export type Strength = {
  id: 'nextjs' | 'rtl' | 'performance' | 'shopify';
  title: string;
  proof: string;
};

export const STRENGTHS: Strength[] = [
  {
    id: 'nextjs',
    title: 'Production Next.js apps',
    proof:
      'Shipped four client sites on Next.js and Vercel, from first commit to live domain.',
  },
  {
    id: 'rtl',
    title: 'Bilingual RTL/LTR UI',
    proof:
      'Built Arabic/English layouts that mirror correctly across bilingual client sites.',
  },
  {
    id: 'performance',
    title: 'Performance & SEO',
    proof:
      'Use next/image, next/font, metadata and structured data by default; this portfolio is built the same way.',
  },
  {
    id: 'shopify',
    title: 'E-commerce / Shopify',
    proof: 'Create and manage Shopify stores as part of my current role.',
  },
];
