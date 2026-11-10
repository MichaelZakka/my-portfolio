import { cache } from 'react';
import type { Project } from '../../../data/projects';
import type { Role } from '../../../data/experience';
import { SCREENSHOT_SETS } from './defaults';
import { getStoredContent, resolveDocs } from './store';
import {
  SOCIAL_PLATFORMS,
  contentLocale,
  pick,
  pickList,
  type ContentLocale,
  type ProjectDoc,
  type RoleDoc,
  type SocialLink,
  type SocialPlatform,
  type StrengthIcon,
} from './schema';

/**
 * The portfolio's content for one language, resolved for the public pages:
 * saved content where it exists, the code's defaults elsewhere.
 */

export type PublicSocial = {
  id: string;
  platform: SocialPlatform;
  /** Platform name, e.g. "LinkedIn" (brand names stay in English in both languages). */
  name: string;
  url: string;
  /** Visible text, e.g. "in/michael-zakka". */
  value: string;
  external: boolean;
} & Pick<SocialLink, 'hero' | 'about' | 'contact' | 'footer'>;

export type PublicProfile = {
  email: string;
  phone: string;
  /** Set only when the phone is switched on for the site. */
  telUrl: string | null;
  whatsappUrl: string | null;
  resumeUrl: string;
  sourceRepoUrl: string | null;
  city: string;
  countryCode: string;
};

export type PublicStrength = { id: string; icon: StrengthIcon; title: string; proof: string };
export type PublicSkillGroup = { id: string; title: string; skills: string[] };

export type Portfolio = {
  profile: PublicProfile;
  socials: PublicSocial[];
  /** Published projects, in display order. */
  projects: Project[];
  experience: Role[];
  strengths: PublicStrength[];
  skillGroups: PublicSkillGroup[];
  topStack: string[];
};

const optional = (value: string) => (value === '' ? undefined : value);

export function socialValue(social: Pick<SocialLink, 'label' | 'url'>): string {
  return (
    social.label ||
    social.url
      .replace(/^(mailto:|tel:|https?:\/\/(www\.)?)/i, '')
      .replace(/\/$/, '')
  );
}

function toProject(doc: ProjectDoc, locale: ContentLocale): Project {
  const employer = doc.employer.name ? { name: doc.employer.name, url: doc.employer.url } : undefined;
  return {
    slug: doc.slug,
    title: pick(doc.title, locale),
    summary: pick(doc.summary, locale),
    overview: pick(doc.overview, locale),
    role: optional(pick(doc.role, locale)),
    team: pick(doc.team, locale),
    stack: doc.stack,
    challenges: pickList(doc.challenges, locale),
    solutions: pickList(doc.solutions, locale),
    results: pickList(doc.results, locale),
    liveUrl: optional(doc.liveUrl),
    repoUrl: optional(doc.repoUrl),
    repoPrivateNote: doc.codePrivate ? 'Client code private' : undefined,
    images: SCREENSHOT_SETS[doc.screenshots]?.images ?? [],
    featured: doc.published,
    personal: doc.personal,
    employer,
    collaborators: doc.collaborators.filter((c) => c.name),
  };
}

function toRole(doc: RoleDoc, locale: ContentLocale): Role {
  return {
    id: doc.id,
    company: pick(doc.company, locale),
    companyNote: optional(pick(doc.companyNote, locale)),
    website: optional(doc.website),
    role: pick(doc.role, locale),
    duration: pick(doc.duration, locale),
    location: pick(doc.location, locale),
    achievements: doc.achievements.map((a) => ({
      text: pick(a.text, locale),
      result: optional(pick(a.result, locale)),
    })),
  };
}

export const getPortfolio = cache(async (requestedLocale: string): Promise<Portfolio> => {
  const locale = contentLocale(requestedLocale);
  const docs = resolveDocs(await getStoredContent());
  const { profile } = docs;
  const digits = profile.phone.replace(/\D/g, '');

  return {
    profile: {
      email: profile.email,
      phone: profile.phone,
      telUrl: profile.showPhone && digits ? `tel:+${digits}` : null,
      whatsappUrl: profile.showWhatsApp && digits ? `https://wa.me/${digits}` : null,
      resumeUrl: profile.resumeUrl,
      sourceRepoUrl: profile.sourceRepoUrl || null,
      city: profile.city,
      countryCode: profile.countryCode,
    },
    socials: docs.socials.map((s) => ({
      id: s.id,
      platform: s.platform,
      name: s.platform === 'other' ? socialValue(s) : SOCIAL_PLATFORMS[s.platform],
      url: s.url,
      value: socialValue(s),
      external: /^https?:/i.test(s.url),
      hero: s.hero,
      about: s.about,
      contact: s.contact,
      footer: s.footer,
    })),
    projects: docs.projects.filter((p) => p.published).map((p) => toProject(p, locale)),
    experience: docs.experience.map((r) => toRole(r, locale)),
    strengths: docs.strengths.map((s) => ({
      id: s.id,
      icon: s.icon,
      title: pick(s.title, locale),
      proof: pick(s.proof, locale),
    })),
    skillGroups: docs.skills.groups.map((g) => ({
      id: g.id,
      title: pick(g.title, locale),
      skills: g.skills.map((s) => pick(s, locale)),
    })),
    topStack: docs.skills.topStack,
  };
});
