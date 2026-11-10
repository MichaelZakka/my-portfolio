import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { DEFAULTS } from './defaults';
import { mergeTextEdits } from './text';
import {
  CONTENT_PARTS,
  type ContentDocs,
  type ContentLocale,
  type ContentPart,
  type TextEdits,
  type TextOverrides,
} from './schema';

/**
 * Reading and writing the SiteContent table. The public pages are static:
 * they read it when built and when a save revalidates them, so there is no
 * extra cache layer to go stale.
 */

const TEXT_ROW: Record<ContentLocale, string> = { en: 'text.en', ar: 'text.ar' };

export type StoredContent = {
  docs: Partial<ContentDocs>;
  text: Record<ContentLocale, TextOverrides>;
  updatedAt: Partial<Record<ContentPart | 'text', Date>>;
  /** Parts whose stored JSON no longer validates; they show the defaults. */
  invalid: string[];
  /** False until the SiteContent migration has run (nothing can be saved yet). */
  available: boolean;
};

type Row = { key: string; data: string; updatedAt: Date };

function parseRows(rows: Row[] | null): StoredContent {
  const stored: StoredContent = { docs: {}, text: { en: {}, ar: {} }, updatedAt: {}, invalid: [], available: rows !== null };
  if (rows === null) return stored;
  for (const row of rows) {
    let json: unknown;
    try {
      json = JSON.parse(row.data);
    } catch {
      stored.invalid.push(row.key);
      continue;
    }
    if (row.key === TEXT_ROW.en || row.key === TEXT_ROW.ar) {
      const locale: ContentLocale = row.key === TEXT_ROW.en ? 'en' : 'ar';
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        stored.text[locale] = Object.fromEntries(
          Object.entries(json).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        );
        const previous = stored.updatedAt.text;
        if (!previous || previous < row.updatedAt) stored.updatedAt.text = row.updatedAt;
      }
      continue;
    }
    if (!(row.key in CONTENT_PARTS)) continue;
    const part = row.key as ContentPart;
    const parsed = CONTENT_PARTS[part].safeParse(json);
    if (parsed.success) {
      (stored.docs as Record<string, unknown>)[part] = parsed.data;
      stored.updatedAt[part] = row.updatedAt;
    } else {
      stored.invalid.push(part);
      console.error(`[content] stored "${part}" no longer validates; showing the defaults`, parsed.error.issues[0]);
    }
  }
  return stored;
}

/** Prisma's "table does not exist": the migration hasn't run yet, so nothing was ever saved. */
function isMissingTable(error: unknown): boolean {
  // By code, not instanceof: in dev (Turbopack) the error can come from another copy of the Prisma module
  return (error as { code?: unknown } | null)?.code === 'P2021';
}

/** null when the table doesn't exist yet. */
async function readRows(): Promise<Row[] | null> {
  try {
    return await prisma.siteContent.findMany({ select: { key: true, data: true, updatedAt: true } });
  } catch (error) {
    if (isMissingTable(error)) return null;
    // Anything else propagates: a failed regeneration keeps the last good page
    // instead of quietly publishing the defaults over the admin's edits.
    throw error;
  }
}

/** The public site's read: once per request (React cache). */
export const getStoredContent = cache(async (): Promise<StoredContent> => parseRows(await readRows()));

/** The admin's read: always fresh. */
export async function readStoredContent(): Promise<StoredContent> {
  return parseRows(await readRows());
}

export function resolveDocs(stored: StoredContent): ContentDocs {
  return {
    profile: stored.docs.profile ?? DEFAULTS.profile(),
    socials: stored.docs.socials ?? DEFAULTS.socials(),
    projects: stored.docs.projects ?? DEFAULTS.projects(),
    experience: stored.docs.experience ?? DEFAULTS.experience(),
    strengths: stored.docs.strengths ?? DEFAULTS.strengths(),
    skills: stored.docs.skills ?? DEFAULTS.skills(),
  };
}

function upsert(key: string, value: unknown) {
  const data = JSON.stringify(value);
  return prisma.siteContent.upsert({ where: { key }, create: { key, data }, update: { data } });
}

/** Rebuilds every public page on its next visit. */
export function revalidatePublicSite() {
  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');
}

/** Saves a part (already validated) and/or text edits, then republishes the site. */
export async function saveContent(input: { part?: ContentPart; data?: unknown; text?: TextEdits }) {
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  if (input.part) writes.push(upsert(input.part, input.data));
  if (input.text && Object.keys(input.text).length > 0) {
    const next = mergeTextEdits((await readStoredContent()).text, input.text);
    writes.push(upsert(TEXT_ROW.en, next.en), upsert(TEXT_ROW.ar, next.ar));
  }
  if (writes.length === 0) return;
  await prisma.$transaction(writes);
  revalidatePublicSite();
}

/** Back to the code's content: drops the saved part and/or resets text keys. */
export async function resetContent(input: { part?: ContentPart; textKeys?: string[] }) {
  if (input.part) await prisma.siteContent.deleteMany({ where: { key: input.part } });
  if (input.textKeys?.length) {
    const blank = Object.fromEntries(input.textKeys.map((key) => [key, { en: '', ar: '' }]));
    const next = mergeTextEdits((await readStoredContent()).text, blank);
    await prisma.$transaction([upsert(TEXT_ROW.en, next.en), upsert(TEXT_ROW.ar, next.ar)]);
  }
  revalidatePublicSite();
}
