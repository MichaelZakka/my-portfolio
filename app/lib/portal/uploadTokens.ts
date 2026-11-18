import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { reportError } from '../monitoring';
import { ALLOWED_MIME_TYPES, directUploadPrefix, getMaxUploadBytes, usesDirectUploads } from './files';
import { apiError } from './http';

const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Issues a short-lived Vercel Blob client token for one direct upload into the
 * project's incoming folder (callers have checked the session and project
 * access). The token itself enforces the size limit and allowed types; the
 * app checks the bytes again when the file is claimed. Upload-completed
 * callbacks are not used (the browser reports the upload instead), so only
 * token requests are accepted.
 */
export async function issueUploadToken(request: Request, projectId: string): Promise<Response> {
  if (!usesDirectUploads()) {
    return apiError(409, 'storageUnavailable', 'Direct uploads are only used with Vercel Blob.');
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return apiError(400, 'invalidInput', 'Invalid upload request.');
  }
  if (body?.type !== 'blob.generate-client-token') return apiError(400, 'invalidInput', 'Invalid upload request.');

  const prefix = directUploadPrefix(projectId);
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(prefix) || !/^[A-Za-z0-9-]{1,64}\.[a-z0-9]{1,8}$/.test(pathname.slice(prefix.length))) {
          throw new Error('Invalid upload path.');
        }
        return {
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: getMaxUploadBytes(),
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + TOKEN_TTL_MS,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid upload path.') {
      return apiError(400, 'invalidInput', 'Invalid upload path.');
    }
    await reportError({ source: 'storage', message: 'Could not issue an upload token', error: err });
    return apiError(502, 'storageUnavailable', 'Uploads are unavailable right now.');
  }
}
