import type { StaticImageData } from 'next/image';
import ar from '../../../messages/ar.json';
import { PROJECTS } from '../../../data/projects';
import { EXPERIENCE } from '../../../data/experience';
import { STRENGTHS } from '../../../data/strengths';
import { SKILL_GROUPS, TOP_STACK } from '../../../data/skills';
import { EMAIL, GITHUB_URL, LINKEDIN_URL, RESUME_URL, SOURCE_REPO_URL } from '../site';
import { PERSON } from '../seo';
import type {
  ContentDocs,
  Profile,
  ProjectDoc,
  RoleDoc,
  SkillsDoc,
  SocialLink,
  StrengthDoc,
  StrengthIcon,
} from './schema';

/**
 * The content as it is in the code (data/*.ts, messages/*.json, lib/site.ts),
 * in the editable shapes. Used for any part never saved from the admin, and by
 * "Reset to original". An empty Arabic value means "show the English".
 */

type ArOverlay = {
  strengths?: Record<string, { title?: string; proof?: string }>;
  projects?: Record<
    string,
    Partial<Record<'title' | 'summary' | 'overview' | 'role' | 'team', string>> &
      Partial<Record<'challenges' | 'solutions' | 'results', string[]>>
  >;
  experience?: Record<
    string,
    Partial<Record<'company' | 'companyNote' | 'role' | 'duration' | 'location', string>> & { achievements?: string[] }
  >;
  skills?: { groups?: Record<string, string>; names?: Record<string, string> };
};
const AR = ((ar as { content?: ArOverlay }).content ?? {}) as ArOverlay;

/** Screenshot sets bundled with the site, by key (the project's original slug). */
export const SCREENSHOT_SETS: Record<string, { label: string; images: StaticImageData[] }> = Object.fromEntries(
  PROJECTS.filter((p) => p.images.length > 0).map((p) => [
    p.slug,
    { label: `${p.title} (${p.images.length} image${p.images.length === 1 ? '' : 's'})`, images: p.images },
  ])
);

export function defaultProfile(): Profile {
  return {
    email: EMAIL,
    phone: PERSON.telephone,
    showPhone: false,
    showWhatsApp: false,
    resumeUrl: RESUME_URL,
    sourceRepoUrl: SOURCE_REPO_URL ?? '',
    city: PERSON.addressLocality,
    countryCode: PERSON.addressCountry,
  };
}

export function defaultSocials(): SocialLink[] {
  return [
    {
      id: 'linkedin',
      platform: 'linkedin',
      url: LINKEDIN_URL,
      label: 'in/michael-zakka',
      hero: false,
      about: true,
      contact: true,
      footer: true,
    },
    ...(GITHUB_URL
      ? [
          {
            id: 'github',
            platform: 'github' as const,
            url: GITHUB_URL,
            label: GITHUB_URL.replace(/^https?:\/\//, ''),
            hero: true,
            about: false,
            contact: true,
            footer: true,
          },
        ]
      : []),
  ];
}

export function defaultProjects(): ProjectDoc[] {
  return PROJECTS.map((p) => {
    const t = AR.projects?.[p.slug] ?? {};
    return {
      slug: p.slug,
      published: p.featured,
      personal: Boolean(p.personal),
      title: { en: p.title, ar: t.title ?? '' },
      summary: { en: p.summary, ar: t.summary ?? '' },
      overview: { en: p.overview, ar: t.overview ?? '' },
      role: { en: p.role ?? '', ar: t.role ?? '' },
      team: { en: p.team, ar: t.team ?? '' },
      challenges: { en: p.challenges, ar: t.challenges ?? [] },
      solutions: { en: p.solutions, ar: t.solutions ?? [] },
      results: { en: p.results, ar: t.results ?? [] },
      stack: p.stack,
      liveUrl: p.liveUrl ?? '',
      repoUrl: p.repoUrl ?? '',
      codePrivate: Boolean(p.repoPrivateNote),
      screenshots: SCREENSHOT_SETS[p.slug] ? p.slug : '',
      employer: p.employer ?? { name: '', url: '' },
      collaborators: p.collaborators ?? [],
    };
  });
}

export function defaultExperience(): RoleDoc[] {
  return EXPERIENCE.map((r) => {
    const t = AR.experience?.[r.id] ?? {};
    return {
      id: r.id,
      company: { en: r.company, ar: t.company ?? '' },
      companyNote: { en: r.companyNote ?? '', ar: t.companyNote ?? '' },
      website: r.website ?? '',
      role: { en: r.role, ar: t.role ?? '' },
      duration: { en: r.duration, ar: t.duration ?? '' },
      location: { en: r.location, ar: t.location ?? '' },
      achievements: r.achievements.map((a, i) => ({
        text: { en: a.text, ar: t.achievements?.[i] ?? '' },
        result: { en: a.result ?? '', ar: '' },
      })),
    };
  });
}

const STRENGTH_ICON_BY_ID: Record<string, StrengthIcon> = {
  nextjs: 'code',
  rtl: 'languages',
  performance: 'gauge',
  shopify: 'shopping-bag',
};

export function defaultStrengths(): StrengthDoc[] {
  return STRENGTHS.map((s) => {
    const t = AR.strengths?.[s.id] ?? {};
    return {
      id: s.id,
      icon: STRENGTH_ICON_BY_ID[s.id] ?? 'sparkles',
      title: { en: s.title, ar: t.title ?? '' },
      proof: { en: s.proof, ar: t.proof ?? '' },
    };
  });
}

export function defaultSkills(): SkillsDoc {
  return {
    groups: SKILL_GROUPS.map((g) => ({
      id: g.id,
      title: { en: g.title, ar: AR.skills?.groups?.[g.id] ?? '' },
      skills: g.skills.map((name) => ({ en: name, ar: AR.skills?.names?.[name] ?? '' })),
    })),
    topStack: [...TOP_STACK],
  };
}

export const DEFAULTS: { [K in keyof ContentDocs]: () => ContentDocs[K] } = {
  profile: defaultProfile,
  socials: defaultSocials,
  projects: defaultProjects,
  experience: defaultExperience,
  strengths: defaultStrengths,
  skills: defaultSkills,
};
