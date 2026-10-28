/**
 * Only skills Michael has confirmed. Unconfirmed and dropped (do not re-add without confirming):
 * React Query, Zustand, Redux, Jest, React Testing Library.
 */
export type SkillGroup = { id: string; title: string; skills: string[] };

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'frontend',
    title: 'Frontend',
    // REST APIs folded in here: it was the only confirmed "State & Data" skill.
    skills: ['React', 'Next.js', 'JavaScript', 'TypeScript', 'HTML/CSS', 'REST APIs'],
  },
  { id: 'styling', title: 'Styling', skills: ['Tailwind CSS', 'Responsive design', 'RTL layouts'] },
  { id: 'ecommerce', title: 'E-commerce', skills: ['Shopify', 'Liquid'] },
  {
    id: 'tooling',
    title: 'Tooling',
    skills: ['Git & GitHub', 'Vercel', 'Postman', 'VS Code', 'Agile'],
  },
  { id: 'quality', title: 'Testing & Quality', skills: ['Lighthouse', 'Accessibility'] },
  { id: 'mobile', title: 'Mobile', skills: ['Flutter', 'Dart', 'Firebase', 'GetX', 'BLoC'] },
];

/** Top frontend skills for the hero terminal card. */
export const TOP_STACK = ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Vercel'];
