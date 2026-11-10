import { z } from 'zod';

/**
 * Shapes of the portfolio content edited in /admin/content. Each part is one
 * JSON document in the SiteContent table; text overrides live in "text.en" and
 * "text.ar". No server-only imports: the admin editors share these types.
 */

export const CONTENT_LOCALES = ['en', 'ar'] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function contentLocale(locale: string): ContentLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export type Localized = { en: string; ar: string };
export type LocalizedList = { en: string[]; ar: string[] };

/** The value for a locale; an empty translation falls back to English. */
export function pick(value: Localized, locale: ContentLocale): string {
  return (locale === 'ar' && value.ar.trim()) || value.en;
}

export function pickList(value: LocalizedList, locale: ContentLocale): string[] {
  return locale === 'ar' && value.ar.length > 0 ? value.ar : value.en;
}

// ---- Field rules -------------------------------------------------------------

/** Plain text: control characters removed (newlines and tabs kept), trimmed. */
function clean(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

const text = (max: number) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().max(max, `Keep it under ${max} characters`));

const WEB_URL = /^https?:\/\/[^\s<>"']+$/i;
const LINK = /^(https?:\/\/[^\s<>"']+|mailto:[^\s@<>"']+@[^\s@<>"']+|tel:\+?[\d\s().-]+)$/i;
const PATH = /^\/[^\s<>"']*$/;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** An optional https:// link. */
const webUrl = text(500).refine((v) => v === '' || WEB_URL.test(v), 'Use a full link starting with https://');
/** A required link: https://, mailto: or tel:. */
const link = text(500).refine((v) => LINK.test(v), 'Use a full link (https://…, mailto:… or tel:…)');
/** An optional https:// link or a path on this site (/…). */
const urlOrPath = text(500).refine(
  (v) => v === '' || WEB_URL.test(v) || PATH.test(v),
  'Use a full link (https://…) or a path on this site (/…)'
);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z
  .string()
  .max(60, 'Keep it under 60 characters')
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and dashes');

const localized = (max: number) => z.object({ en: text(max), ar: text(max) });
const nonEmpty = (list: string[]) => list.filter((item) => item !== '');
const list = (items: number, max: number) =>
  z.array(text(max)).max(items, `At most ${items} items`).transform(nonEmpty);
const localizedList = (items: number, max: number) => z.object({ en: list(items, max), ar: list(items, max) });

function uniqueBy<T>(key: (item: T) => string, what: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const value = key(item);
      if (seen.has(value)) ctx.addIssue({ code: 'custom', message: `Duplicate ${what} "${value}"`, path: [index] });
      seen.add(value);
    });
  };
}

// ---- Profile & contact -------------------------------------------------------

export const profileSchema = z.object({
  email: text(200).refine((v) => v === '' || EMAIL.test(v), 'Enter a valid email address'),
  phone: text(40).refine((v) => v === '' || /^\+?[\d\s().-]{6,}$/.test(v), 'Use digits, spaces and an optional leading +'),
  /** The phone stays private (admin only) unless these are on. */
  showPhone: z.boolean(),
  showWhatsApp: z.boolean(),
  resumeUrl: urlOrPath,
  sourceRepoUrl: webUrl,
  /** For search engines (structured data), in English. */
  city: text(80),
  countryCode: text(2).refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Use a two-letter country code, e.g. SY'),
});
export type Profile = z.output<typeof profileSchema>;

/** Profile fields that are translated text (stored with the other text overrides). */
export const PROFILE_TEXT_KEYS = {
  name: 'hero.name',
  jobTitle: 'meta.jobTitle',
  location: 'about.locationValue',
  languages: 'about.languagesValue',
} as const;

// ---- Social links ------------------------------------------------------------

export const SOCIAL_PLATFORMS = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  gitlab: 'GitLab',
  x: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  dribbble: 'Dribbble',
  behance: 'Behance',
  figma: 'Figma',
  codepen: 'CodePen',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'Email',
  website: 'Website',
  other: 'Other link',
} as const;
export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;
const SOCIAL_PLATFORM_IDS = Object.keys(SOCIAL_PLATFORMS) as [SocialPlatform, ...SocialPlatform[]];

export const SOCIAL_PLACEMENTS = {
  hero: 'Hero',
  about: 'About card',
  contact: 'Contact section',
  footer: 'Footer',
} as const;
export type SocialPlacement = keyof typeof SOCIAL_PLACEMENTS;

export const socialSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  platform: z.enum(SOCIAL_PLATFORM_IDS),
  url: link,
  /** Visible text, e.g. "in/michael-zakka"; blank shows the link without https://. */
  label: text(80),
  hero: z.boolean(),
  about: z.boolean(),
  contact: z.boolean(),
  footer: z.boolean(),
});
export type SocialLink = z.output<typeof socialSchema>;

export const socialsSchema = z
  .array(socialSchema)
  .max(20, 'At most 20 links')
  .superRefine(uniqueBy((s: SocialLink) => s.id, 'link'));

// ---- Projects ----------------------------------------------------------------

export const projectSchema = z
  .object({
    slug,
    /** Listed on the home page with its own case-study page. */
    published: z.boolean(),
    /** Shows the "Personal project" badge. */
    personal: z.boolean(),
    title: localized(120),
    summary: localized(300),
    overview: localized(4000),
    role: localized(200),
    team: localized(200),
    challenges: localizedList(20, 500),
    solutions: localizedList(20, 500),
    results: localizedList(20, 500),
    stack: list(25, 40),
    liveUrl: webUrl,
    repoUrl: webUrl,
    /** Shows "Client code private" instead of a Code button. */
    codePrivate: z.boolean(),
    /** Key of a bundled screenshot set (data/projects.ts), or "" for none. */
    screenshots: z.string().max(60),
    employer: z.object({ name: text(120), url: webUrl }),
    collaborators: z.array(z.object({ name: text(120), url: webUrl })).max(10),
  })
  .refine((p) => p.title.en !== '', { message: 'An English title is required', path: ['title', 'en'] });
export type ProjectDoc = z.output<typeof projectSchema>;

export const projectsSchema = z
  .array(projectSchema)
  .max(40, 'At most 40 projects')
  .superRefine(uniqueBy((p: ProjectDoc) => p.slug, 'web address'));

// ---- Experience --------------------------------------------------------------

export const roleSchema = z
  .object({
    id: slug,
    company: localized(120),
    companyNote: localized(500),
    website: webUrl,
    role: localized(120),
    duration: localized(80),
    location: localized(120),
    achievements: z
      .array(z.object({ text: localized(500), result: localized(160) }))
      .max(15, 'At most 15 achievements')
      .transform((items) => items.filter((a) => a.text.en !== '' || a.text.ar !== '')),
  })
  .refine((r) => r.company.en !== '' && r.role.en !== '', {
    message: 'A company and a job title (English) are required',
    path: ['company', 'en'],
  });
export type RoleDoc = z.output<typeof roleSchema>;

export const experienceSchema = z
  .array(roleSchema)
  .max(20, 'At most 20 roles')
  .superRefine(uniqueBy((r: RoleDoc) => r.id, 'role'));

// ---- Strengths ---------------------------------------------------------------

export const STRENGTH_ICONS = [
  'code',
  'languages',
  'gauge',
  'shopping-bag',
  'smartphone',
  'palette',
  'server',
  'database',
  'search',
  'accessibility',
  'rocket',
  'layers',
  'zap',
  'shield',
  'users',
  'sparkles',
  'wrench',
  'cloud',
  'lightbulb',
  'workflow',
] as const;
export type StrengthIcon = (typeof STRENGTH_ICONS)[number];

export const strengthSchema = z
  .object({
    id: slug,
    icon: z.enum(STRENGTH_ICONS),
    title: localized(100),
    proof: localized(400),
  })
  .refine((s) => s.title.en !== '', { message: 'An English title is required', path: ['title', 'en'] });
export type StrengthDoc = z.output<typeof strengthSchema>;

export const strengthsSchema = z
  .array(strengthSchema)
  .max(12, 'At most 12 strengths')
  .superRefine(uniqueBy((s: StrengthDoc) => s.id, 'strength'));

// ---- Skills ------------------------------------------------------------------

export const skillsSchema = z.object({
  groups: z
    .array(
      z.object({
        id: slug,
        title: localized(60),
        skills: z
          .array(z.object({ en: text(50), ar: text(50) }))
          .max(30, 'At most 30 skills per group')
          .transform((items) => items.filter((s) => s.en !== '')),
      })
    )
    .max(12, 'At most 12 groups')
    .superRefine(uniqueBy((g: { id: string }) => g.id, 'group')),
  /** The terminal card in the hero. */
  topStack: list(10, 30),
});
export type SkillsDoc = z.output<typeof skillsSchema>;

// ---- Parts -------------------------------------------------------------------

export const CONTENT_PARTS = {
  profile: profileSchema,
  socials: socialsSchema,
  projects: projectsSchema,
  experience: experienceSchema,
  strengths: strengthsSchema,
  skills: skillsSchema,
} as const;
export type ContentPart = keyof typeof CONTENT_PARTS;

export type ContentDocs = {
  profile: Profile;
  socials: SocialLink[];
  projects: ProjectDoc[];
  experience: RoleDoc[];
  strengths: StrengthDoc[];
  skills: SkillsDoc;
};

export function isContentPart(value: string): value is ContentPart {
  return Object.prototype.hasOwnProperty.call(CONTENT_PARTS, value);
}

/** Text edits sent with a save: message key → both translations. */
export const textEditsSchema = z.record(z.string().max(80), z.object({ en: text(2000), ar: text(2000) }));
export type TextEdits = z.output<typeof textEditsSchema>;

/** Stored text overrides for one locale: message key → text (only keys that differ from the files). */
export type TextOverrides = Record<string, string>;
