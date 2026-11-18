import { upload } from '@vercel/blob/client';
import { UPLOAD_TYPES } from './constants';

/**
 * Browser side of uploads (Files, message and task-comment attachments).
 *
 * With Vercel Blob (`direct`), Vercel Functions cannot take bodies over
 * 4.5 MB, so each file goes straight to the store with a short-lived token
 * from the project's /uploads route, and the app request only carries
 * references, which the server checks before saving (claimDirectUploads).
 * Otherwise (local disk driver) the bytes travel in a multipart request.
 */

export type UploadTarget = {
  /** Upload straight to Vercel Blob. */
  direct: boolean;
  /** The project's token route: /api/portal|admin/projects/<id>/uploads. */
  tokenUrl: string;
  /** Matches directUploadPrefix() on the server. */
  projectId: string;
};

export type UploadResult = { ok: true; init: RequestInit } | { ok: false; code: string };

const extensionOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

/** Uploads one file to Vercel Blob; returns the reference the app claims. */
async function uploadDirect(file: File, target: UploadTarget) {
  const ext = extensionOf(file.name);
  const contentType = UPLOAD_TYPES[ext as keyof typeof UPLOAD_TYPES];
  if (!contentType) throw new UploadFailed('fileTypeNotAllowed');
  const pathname = `projects/${target.projectId}/incoming/${crypto.randomUUID()}.${ext}`;
  try {
    const blob = await upload(pathname, file, {
      access: 'private',
      handleUploadUrl: target.tokenUrl,
      contentType,
      // Large files go up in parallel parts (and retry a failed part).
      multipart: file.size > 8 * 1024 * 1024,
    });
    return { pathname: blob.pathname, filename: file.name };
  } catch {
    throw new UploadFailed('storageUnavailable');
  }
}

class UploadFailed extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** English messages for a failed direct upload (the admin dashboard; the portal uses portal.errors.<code>). */
export function uploadErrorText(code: string): string {
  if (code === 'fileTypeNotAllowed') return 'This file type is not allowed.';
  if (code === 'network') return 'Network error — please try again.';
  return 'The upload failed — please try again.';
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** A message or task comment with attachments: the request to POST, after any direct uploads. */
export async function attachmentsRequest(content: string, files: File[], target: UploadTarget): Promise<UploadResult> {
  if (!files.length) return { ok: true, init: json({ content }) };
  if (!target.direct) {
    const body = new FormData();
    body.append('content', content);
    for (const file of files) body.append('files', file);
    return { ok: true, init: { method: 'POST', body } };
  }
  try {
    const uploads = await Promise.all(files.map((file) => uploadDirect(file, target)));
    return { ok: true, init: json({ content, uploads }) };
  } catch (err) {
    return { ok: false, code: err instanceof UploadFailed ? err.code : 'network' };
  }
}

/** One file for the Files section (plus form fields such as visibleToClient). */
export async function fileRequest(file: File, fields: Record<string, string>, target: UploadTarget): Promise<UploadResult> {
  if (!target.direct) {
    const body = new FormData();
    body.append('file', file);
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    return { ok: true, init: { method: 'POST', body } };
  }
  try {
    const ref = await uploadDirect(file, target);
    return { ok: true, init: json({ ...fields, ...ref }) };
  } catch (err) {
    return { ok: false, code: err instanceof UploadFailed ? err.code : 'network' };
  }
}
