import en from '../../../messages/en.json';
import ar from '../../../messages/ar.json';
import { PROFILE_TEXT_KEYS, type ContentLocale, type TextEdits, type TextOverrides } from './schema';

/**
 * The portfolio's translatable text (messages/<locale>.json) as editable
 * sections. Overrides are stored per locale and merged over the files in
 * i18n/request.ts, so every component's t() picks them up unchanged.
 */

export type TextSection = {
  id: string;
  label: string;
  description: string;
  namespaces: string[];
  /** Where the text shows on the public site. */
  view: string;
};

export const TEXT_SECTIONS: TextSection[] = [
  { id: 'hero', label: 'Hero', description: 'Greeting, introduction and buttons at the top of the home page.', namespaces: ['hero'], view: '/#hero' },
  { id: 'about', label: 'About', description: 'The About paragraph and its info card labels.', namespaces: ['about'], view: '/#about' },
  { id: 'strengths', label: 'Strengths', description: 'Heading of the “What I bring” cards.', namespaces: ['strengths'], view: '/#strengths' },
  { id: 'projects', label: 'Projects & case studies', description: 'Project card labels and the case-study page.', namespaces: ['projects', 'caseStudy'], view: '/#projects' },
  { id: 'experience', label: 'Experience', description: 'Heading of the work history.', namespaces: ['experience'], view: '/#experience' },
  { id: 'skills', label: 'Skills', description: 'Heading of the skills section.', namespaces: ['skills'], view: '/#skills' },
  { id: 'education', label: 'Education & certificates', description: 'Degree and certificate details.', namespaces: ['education'], view: '/#education' },
  { id: 'volunteering', label: 'Volunteering', description: 'The volunteering card.', namespaces: ['volunteering'], view: '/#volunteering' },
  { id: 'contact', label: 'Contact', description: 'Contact section text and the contact form.', namespaces: ['contact'], view: '/#contact' },
  { id: 'footer', label: 'Footer', description: 'Copyright line and footer links.', namespaces: ['footer'], view: '/#contact' },
  { id: 'navigation', label: 'Navigation & intro', description: 'Menu labels, the intro screen and shared labels.', namespaces: ['nav', 'intro', 'common'], view: '/' },
  { id: 'seo', label: 'Search & sharing', description: 'Page title and description shown by Google and in link previews.', namespaces: ['meta'], view: '/' },
  { id: 'work-with-me', label: 'Work with me page', description: 'Headings of the project brief page.', namespaces: ['workWithMe'], view: '/work-with-me' },
  { id: 'blog', label: 'Blog', description: 'Blog page labels.', namespaces: ['blog'], view: '/blog' },
  { id: 'not-found', label: 'Page not found', description: 'The 404 page.', namespaces: ['notFound'], view: '/this-page-does-not-exist' },
];

/** Sub-headings inside a section that spans several namespaces. */
export const NAMESPACE_LABELS: Record<string, string> = {
  projects: 'Project cards',
  caseStudy: 'Case-study page',
  nav: 'Menu',
  intro: 'Intro screen',
  common: 'Shared labels',
};

type Messages = Record<string, unknown>;
const FILES: Record<ContentLocale, Messages> = { en: en as Messages, ar: ar as Messages };

/** Edited under Profile & contact, so the section editors leave them out. */
const PROFILE_KEYS = new Set<string>(Object.values(PROFILE_TEXT_KEYS));

function leaves(value: unknown, prefix: string): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, `${prefix}.${key}`));
}

function readPath(messages: Messages, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Messages)[part] : undefined), messages);
}

export function defaultText(key: string, locale: ContentLocale): string {
  const value = readPath(FILES[locale], key);
  return typeof value === 'string' ? value : '';
}

export function sectionKeys(section: TextSection): string[] {
  return section.namespaces
    .flatMap((ns) => leaves(FILES.en[ns], ns))
    .filter((key) => !PROFILE_KEYS.has(key));
}

const EDITABLE = new Set<string>([...TEXT_SECTIONS.flatMap(sectionKeys), ...PROFILE_KEYS]);

export function isEditableTextKey(key: string): boolean {
  return EDITABLE.has(key);
}

/** "downloadResume" → "Download resume"; nested keys read "Bands · Listening". */
export function keyLabel(key: string): string {
  return key
    .split('.')
    .slice(1)
    .map((part) => {
      const words = part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
      return words.charAt(0).toUpperCase() + words.slice(1);
    })
    .join(' · ');
}

// ---- Safety ------------------------------------------------------------------

const PLACEHOLDER = /\{\s*([a-zA-Z0-9_]+)\s*\}/g;

/** The {placeholders} a text must keep, e.g. ["title"] for "{title} live site". */
export function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();
}

/**
 * Why a text can't replace the default, or null when it's fine. Overrides go
 * through ICU message formatting (next-intl), so they must keep the default's
 * {placeholders}, add no other braces and no tags.
 */
export function textProblem(key: string, value: string): string | null {
  const expected = placeholders(defaultText(key, 'en'));
  const found = placeholders(value);
  if (expected.join() !== found.join()) {
    return expected.length
      ? `Keep ${expected.map((p) => `{${p}}`).join(', ')} exactly as written`
      : 'Remove the {…} placeholder';
  }
  if (/[{}]/.test(value.replace(PLACEHOLDER, ''))) return 'Curly braces { } are reserved for placeholders';
  if (/<\/?[a-zA-Z]/.test(value)) return 'Tags like <b> are not supported';
  return null;
}

/** Applies stored overrides, skipping any key that isn't editable text or is no longer safe. */
export function applyTextOverrides<T extends Messages>(messages: T, overrides: TextOverrides | undefined): T {
  const usable = Object.entries(overrides ?? {}).filter(
    ([key, value]) => isEditableTextKey(key) && typeof value === 'string' && textProblem(key, value) === null
  );
  if (usable.length === 0) return messages;
  const copy = structuredClone(messages);
  for (const [key, value] of usable) {
    const parts = key.split('.');
    const parent = parts.slice(0, -1).reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], copy);
    const last = parts[parts.length - 1];
    if (parent && typeof parent === 'object' && typeof (parent as Messages)[last] === 'string') {
      (parent as Messages)[last] = value;
    }
  }
  return copy;
}

/** Validates edits; returns issues in the same shape as the API's zod errors. */
export function textEditIssues(edits: TextEdits): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  for (const [key, values] of Object.entries(edits)) {
    if (!isEditableTextKey(key)) {
      issues.push({ path: key, message: 'This text is not editable' });
      continue;
    }
    for (const locale of ['en', 'ar'] as const) {
      const value = values[locale];
      if (value === '') continue;
      const problem = textProblem(key, value);
      if (problem) issues.push({ path: `${keyLabel(key) || key} (${locale === 'en' ? 'English' : 'Arabic'})`, message: problem });
    }
  }
  return issues;
}

/**
 * New stored overrides after applying edits: a value equal to the file's text
 * (or left blank) is dropped, so the file stays the source until it's changed.
 */
export function mergeTextEdits(
  current: Record<ContentLocale, TextOverrides>,
  edits: TextEdits
): Record<ContentLocale, TextOverrides> {
  const next = { en: { ...current.en }, ar: { ...current.ar } };
  for (const [key, values] of Object.entries(edits)) {
    for (const locale of ['en', 'ar'] as const) {
      const value = values[locale];
      if (value === '' || value === defaultText(key, locale)) delete next[locale][key];
      else next[locale][key] = value;
    }
  }
  return next;
}

/** Current text for each key in both languages (stored override, else the file). */
export function currentText(keys: string[], overrides: Record<ContentLocale, TextOverrides>) {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        en: overrides.en[key] ?? defaultText(key, 'en'),
        ar: overrides.ar[key] ?? defaultText(key, 'ar'),
        defaultEn: defaultText(key, 'en'),
        defaultAr: defaultText(key, 'ar'),
      },
    ])
  );
}
