import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdmin } from '../../../../lib/portal/access';
import { apiError, parseJsonBody } from '../../../../lib/portal/http';
import { reportError } from '../../../../lib/monitoring';
import { DEFAULTS, SCREENSHOT_SETS } from '../../../../lib/content/defaults';
import { readStoredContent, resetContent, resolveDocs, saveContent } from '../../../../lib/content/store';
import { currentText, isEditableTextKey, textEditIssues } from '../../../../lib/content/text';
import {
  CONTENT_PARTS,
  isContentPart,
  textEditsSchema,
  type ContentPart,
  type ProjectDoc,
} from '../../../../lib/content/schema';

/**
 * Saves (PUT) or resets (DELETE) one part of the portfolio content, plus any
 * text edits sent with it. "text" is the part for the section text editors.
 */

type Params = { params: Promise<{ part: string }> };
type Issue = { path: string; message: string };

function invalid(issues: Issue[]) {
  return apiError(400, 'invalidInput', 'Invalid input.', { issues });
}

function projectIssues(projects: ProjectDoc[]): Issue[] {
  return projects.flatMap((p, i) =>
    p.screenshots && !SCREENSHOT_SETS[p.screenshots]
      ? [{ path: `${i}.screenshots`, message: 'Unknown screenshot set' }]
      : []
  );
}

/** The saved state the editor continues from. */
async function snapshot(part: ContentPart | 'text', textKeys: string[]) {
  const stored = await readStoredContent();
  return {
    data: part === 'text' ? undefined : (stored.docs[part] ?? DEFAULTS[part]()),
    text: currentText(textKeys, stored.text),
    savedAt: new Date().toISOString(),
  };
}

function failed(error: unknown, action: string) {
  void reportError({ source: 'request', message: `Saving site content failed (${action})`, error });
  return apiError(500, 'serverError', 'The content could not be saved. Please try again.');
}

/** The current content of a part (saved, else the original) and whether it was ever saved. */
export async function GET(request: Request, { params }: Params) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const { part } = await params;
  if (!isContentPart(part)) return apiError(404, 'notFound', 'Unknown content.');
  const stored = await readStoredContent();
  return NextResponse.json(
    { data: resolveDocs(stored)[part], edited: Boolean(stored.docs[part]) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const { part } = await params;
  if (part !== 'text' && !isContentPart(part)) return apiError(404, 'notFound', 'Unknown content.');

  // The section text editor sends only text; the other editors send their part's data (and maybe text)
  const body = await parseJsonBody(
    request,
    part === 'text'
      ? z.object({ text: textEditsSchema })
      : z.object({ data: CONTENT_PARTS[part], text: textEditsSchema.optional() })
  );
  if (!body.ok) return body.response;
  const data = 'data' in body.data ? body.data.data : undefined;
  const text = body.data.text;

  const issues = [
    ...(text ? textEditIssues(text) : []),
    ...(part === 'projects' ? projectIssues(data as ProjectDoc[]) : []),
  ];
  if (issues.length) return invalid(issues);

  try {
    await saveContent({ part: part === 'text' ? undefined : part, data, text });
    return NextResponse.json(await snapshot(part, Object.keys(text ?? {})));
  } catch (error) {
    return failed(error, part);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const { part } = await params;
  if (part !== 'text' && !isContentPart(part)) return apiError(404, 'notFound', 'Unknown content.');

  const body = await parseJsonBody(request, z.object({ textKeys: z.array(z.string().max(80)).max(400).optional() }));
  if (!body.ok) return body.response;
  const textKeys = (body.data.textKeys ?? []).filter(isEditableTextKey);

  try {
    await resetContent({ part: part === 'text' ? undefined : part, textKeys });
    return NextResponse.json(await snapshot(part, textKeys));
  } catch (error) {
    return failed(error, `reset ${part}`);
  }
}
