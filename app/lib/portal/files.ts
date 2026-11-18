import { randomUUID } from 'crypto';
import { prisma } from '../db';
import { reportError } from '../monitoring';
import { logActivity } from './activity';
import { apiError, type Result } from './http';
import { getDriverFor, getUploadDriver, type StorageDriverName, type StoredObject } from './storage';

/**
 * Upload validation and storage for project files.
 *
 * The stored MIME type is derived from the file extension (allow-list below)
 * and checked against the file's leading bytes; the browser-supplied type is
 * ignored because it is client-controlled. Downloads are always sent as
 * attachments with nosniff, so even a mislabelled file is never rendered.
 */

type FileKind = {
  mimeType: string;
  extensions: string[];
  matches: (bytes: Uint8Array) => boolean;
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, i) => bytes[offset + i] === value);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const isZip = (b: Uint8Array) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) || startsWith(b, [0x50, 0x4b, 0x05, 0x06]);

/** Plain text: no NUL bytes in the first 8 KB rules out binaries renamed to .txt/.csv. */
const isText = (b: Uint8Array) => !b.subarray(0, 8192).includes(0);

const FILE_KINDS: FileKind[] = [
  { mimeType: 'application/pdf', extensions: ['pdf'], matches: (b) => startsWith(b, ascii('%PDF-')) },
  { mimeType: 'image/png', extensions: ['png'], matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mimeType: 'image/jpeg', extensions: ['jpg', 'jpeg'], matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { mimeType: 'image/gif', extensions: ['gif'], matches: (b) => startsWith(b, ascii('GIF87a')) || startsWith(b, ascii('GIF89a')) },
  { mimeType: 'image/webp', extensions: ['webp'], matches: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8) },
  { mimeType: 'application/zip', extensions: ['zip'], matches: isZip },
  { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], matches: isZip },
  { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], matches: isZip },
  { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['pptx'], matches: isZip },
  { mimeType: 'text/plain', extensions: ['txt'], matches: isText },
  { mimeType: 'text/csv', extensions: ['csv'], matches: isText },
];

export const ALLOWED_MIME_TYPES = FILE_KINDS.map((kind) => kind.mimeType);

/** Value for <input type="file" accept>. */
export const ACCEPT_ATTRIBUTE = FILE_KINDS.flatMap((kind) => kind.extensions.map((ext) => `.${ext}`)).join(',');

/**
 * The size limit per file: PORTAL_MAX_UPLOAD_MB, default 25. Vercel Functions
 * reject request bodies over 4.5 MB, so with Vercel Blob the browser uploads
 * straight to the store (see claimDirectUploads) and only a reference passes
 * through the app; the local disk driver still takes the bytes in the request.
 */
export function getMaxUploadBytes(): number {
  const mb = Number(process.env.PORTAL_MAX_UPLOAD_MB);
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 100) : 25;
  return Math.floor(safe * 1024 * 1024);
}

// Path separators, control characters and bidi overrides (which can disguise
// "invoice\u202Efdp.exe" as "invoiceexe.pdf") are removed from display names.
const UNSAFE_FILENAME_CHARS = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069<>:"|?*]/g;

export function sanitizeFilename(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(UNSAFE_FILENAME_CHARS, '').trim();
  const cleaned = base.replace(/^\.+/, '') || 'file';
  if (cleaned.length <= 150) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, 150 - ext.length) + ext;
}

function detectKind(filename: string, bytes: Uint8Array): FileKind | null {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  const kind = FILE_KINDS.find((k) => k.extensions.includes(ext));
  return kind && kind.matches(bytes) ? kind : null;
}

export type ValidUpload = { filename: string; mimeType: string; bytes: Uint8Array };

const tooLarge = (max: number) =>
  apiError(413, 'fileTooLarge', `Files can be at most ${Math.round(max / 1024 / 1024)} MB.`, { maxBytes: max });

/** Rejects obviously oversized bodies before buffering them (multipart adds a little overhead). */
export function declaredBodyTooLarge(request: Request, max = getMaxUploadBytes(), files = 1): Result<null> {
  const declared = Number(request.headers.get('content-length') || 0);
  return declared > max * files + 64 * 1024 ? { ok: false, response: tooLarge(max) } : { ok: true, data: null };
}

/** Size and type allow-list for one uploaded file (the stored type comes from the extension, checked against the bytes). */
export async function validateUploadFile(file: File, max = getMaxUploadBytes()): Promise<Result<ValidUpload>> {
  if (file.size === 0) return { ok: false, response: apiError(400, 'emptyFile', 'The file is empty.') };
  if (file.size > max) return { ok: false, response: tooLarge(max) };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = sanitizeFilename(file.name);
  const kind = detectKind(filename, bytes);
  if (!kind) {
    return {
      ok: false,
      response: apiError(415, 'fileTypeNotAllowed', 'This file type is not allowed.', {
        allowed: ALLOWED_MIME_TYPES,
      }),
    };
  }
  return { ok: true, data: { filename, mimeType: kind.mimeType, bytes } };
}

/** A file whose bytes are in storage, ready for its ProjectFile row. */
export type StoredUpload = {
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  storageDriver: StorageDriverName;
};

/** What the browser sends after uploading straight to Vercel Blob. */
export type DirectUploadRef = { pathname: string; filename: string };

/** Where browsers may upload directly: a folder per project, checked again when the file is claimed. */
export const directUploadPrefix = (projectId: string) => `projects/${projectId}/incoming/`;

const stringFields = (entries: Iterable<[string, unknown]>) =>
  Object.fromEntries([...entries].flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])));

/**
 * One upload request: multipart with a `file` field (bytes through the app,
 * local driver), or JSON `{ pathname, filename, ...fields }` for a file the
 * browser already put in Vercel Blob. Either way the bytes end up stored and
 * checked; other string fields (e.g. visibleToClient) are returned as-is.
 */
export async function readUpload(
  request: Request,
  projectId: string
): Promise<Result<{ stored: StoredUpload; fields: Record<string, string> }>> {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // handled below
    }
    if (!body || typeof body.pathname !== 'string' || typeof body.filename !== 'string') {
      return { ok: false, response: apiError(400, 'noFile', 'No file was uploaded.') };
    }
    const claimed = await claimDirectUploads(projectId, [{ pathname: body.pathname, filename: body.filename }]);
    if (!claimed.ok) return claimed;
    return { ok: true, data: { stored: claimed.data[0], fields: stringFields(Object.entries(body)) } };
  }

  const sizeCheck = declaredBodyTooLarge(request);
  if (!sizeCheck.ok) return sizeCheck;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, response: apiError(400, 'invalidInput', 'Expected a multipart/form-data upload.') };
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return { ok: false, response: apiError(400, 'noFile', 'No file was uploaded.') };
  }
  const upload = await validateUploadFile(file);
  if (!upload.ok) return upload;
  const written = await writeUploads(projectId, [upload.data]);
  if (!written.ok) return written;
  return { ok: true, data: { stored: written.data[0], fields: stringFields(form.entries()) } };
}

/** Writes the bytes of every upload. If any write fails, the ones already written are removed again. */
export async function writeUploads(projectId: string, uploads: ValidUpload[]): Promise<Result<StoredUpload[]>> {
  const choice = getUploadDriver();
  if (!choice.driver) {
    await reportError({ source: 'storage', message: `File upload refused: ${choice.reason}` });
    return { ok: false, response: apiError(503, 'storageUnavailable', 'File storage is not configured.') };
  }
  const driver = choice.driver;
  const written: StoredUpload[] = [];
  for (const upload of uploads) {
    const storageKey = `projects/${projectId}/${randomUUID()}`;
    try {
      await driver.put(storageKey, upload.bytes, upload.mimeType);
    } catch (err) {
      await discardUploads(written);
      await reportError({ source: 'storage', message: `Storage write failed (${driver.name})`, error: err });
      return { ok: false, response: apiError(502, 'storageUnavailable', 'Could not store the file.') };
    }
    written.push({
      filename: upload.filename,
      mimeType: upload.mimeType,
      size: upload.bytes.byteLength,
      storageKey,
      storageDriver: driver.name,
    });
  }
  return { ok: true, data: written };
}

/** Removes stored bytes whose database rows were never written. */
export async function discardUploads(written: StoredUpload[]) {
  await Promise.all(written.map((file) => deleteStoredFile(file)));
}

const SNIFF_BYTES = 8192;

/** The first bytes of a stored file (enough to check its type), then stops reading. */
async function readHead(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const head = new Uint8Array(SNIFF_BYTES);
  let length = 0;
  try {
    while (length < SNIFF_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const part = value.subarray(0, SNIFF_BYTES - length);
      head.set(part, length);
      length += part.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return head.subarray(0, length);
}

/**
 * Accepts files the browser uploaded straight to Vercel Blob (with a client
 * token from the project's /uploads route). Each must sit in this project's
 * incoming folder, be unclaimed, within the size limit, and have bytes that
 * match its extension, exactly as for an upload through the app. If any
 * fails, all of them are deleted. Nothing is written to the database here.
 */
export async function claimDirectUploads(projectId: string, refs: DirectUploadRef[]): Promise<Result<StoredUpload[]>> {
  const driver = getDriverFor('vercel-blob');
  if (!driver || !process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, response: apiError(503, 'storageUnavailable', 'File storage is not configured.') };
  }
  const max = getMaxUploadBytes();
  const prefix = directUploadPrefix(projectId);
  const notFound = apiError(400, 'noFile', 'That upload was not found.');
  const accepted: StoredUpload[] = [];
  const reject = async (response: Response, failedKey?: string): Promise<Result<never>> => {
    // None of them will get a row: remove the bytes (but never a file this project does not own).
    await discardUploads(accepted);
    if (failedKey) await deleteStoredFile({ storageKey: failedKey, storageDriver: 'vercel-blob' });
    return { ok: false, response: response as ReturnType<typeof apiError> };
  };

  for (const ref of refs) {
    const pathname = ref.pathname;
    if (!pathname.startsWith(prefix) || !/^[A-Za-z0-9._-]{1,200}$/.test(pathname.slice(prefix.length))) {
      return reject(notFound);
    }
    // Claimed once: a reference cannot be replayed into a second file row.
    if (await prisma.projectFile.findFirst({ where: { storageKey: pathname }, select: { id: true } })) {
      return reject(notFound);
    }
    let object: StoredObject | null;
    try {
      object = await driver.get(pathname);
    } catch (err) {
      await reportError({ source: 'storage', message: 'Could not read a direct upload', error: err });
      return reject(apiError(502, 'storageUnavailable', 'Could not store the file.'));
    }
    if (!object) return reject(notFound);
    const size = object.size ?? 0;
    if (size === 0 || size > max) {
      await object.stream.cancel().catch(() => {});
      return reject(size === 0 ? apiError(400, 'emptyFile', 'The file is empty.') : tooLarge(max), pathname);
    }
    const filename = sanitizeFilename(ref.filename);
    const kind = detectKind(filename, await readHead(object.stream));
    if (!kind) {
      return reject(
        apiError(415, 'fileTypeNotAllowed', 'This file type is not allowed.', { allowed: ALLOWED_MIME_TYPES }),
        pathname
      );
    }
    accepted.push({ filename, mimeType: kind.mimeType, size, storageKey: pathname, storageDriver: 'vercel-blob' });
  }
  return { ok: true, data: accepted };
}

/** True when browsers upload straight to Vercel Blob and the app only claims the result. */
export function usesDirectUploads(): boolean {
  return getUploadDriver().driver?.name === 'vercel-blob';
}

/** The ProjectFile row and its FILE_UPLOADED activity for stored bytes (removed again if the DB write fails). */
export async function storeProjectFile(input: {
  projectId: string;
  uploadedById: string;
  upload: StoredUpload;
  visibleToClient: boolean;
}): Promise<Result<{ id: string; filename: string }>> {
  const upload = input.upload;

  try {
    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.projectFile.create({
        data: {
          projectId: input.projectId,
          uploadedById: input.uploadedById,
          filename: upload.filename,
          storageKey: upload.storageKey,
          storageDriver: upload.storageDriver,
          fileSize: upload.size,
          mimeType: upload.mimeType,
          visibleToClient: input.visibleToClient,
        },
        select: { id: true, filename: true },
      });
      await logActivity(
        {
          projectId: input.projectId,
          actorId: input.uploadedById,
          type: 'FILE_UPLOADED',
          meta: { fileId: created.id, filename: created.filename },
          visibleToClient: input.visibleToClient,
        },
        tx
      );
      return created;
    });
    return { ok: true, data: file };
  } catch (err) {
    await discardUploads([upload]);
    throw err;
  }
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** attachment with an ASCII fallback plus the UTF-8 name (Arabic filenames survive). */
export function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}

/** Streams a stored file through an authorized route; callers have already checked access. */
export async function fileDownloadResponse(file: {
  filename: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  storageDriver: string;
}): Promise<Response> {
  const driver = getDriverFor(file.storageDriver);
  let object: StoredObject | null = null;
  try {
    object = driver ? await driver.get(file.storageKey) : null;
  } catch (err) {
    await reportError({ source: 'storage', message: `Storage read failed (${file.storageDriver})`, error: err });
    return apiError(410, 'fileUnavailable', 'This file is no longer available.');
  }
  if (!object) {
    // A row without its bytes: someone sees "no longer available" for a file that should exist.
    await reportError({
      source: 'storage',
      message: `Stored file is missing (${file.storageDriver})`,
      context: { filename: file.filename },
    });
    return apiError(410, 'fileUnavailable', 'This file is no longer available.');
  }

  return new Response(object.stream, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(object.size ?? file.fileSize),
      'Content-Disposition': contentDisposition(file.filename),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function deleteStoredFile(file: { storageKey: string; storageDriver: string }) {
  const driver = getDriverFor(file.storageDriver);
  if (!driver) return;
  try {
    await driver.delete(file.storageKey);
  } catch (err) {
    await reportError({ source: 'storage', message: `Storage delete failed (${file.storageDriver})`, error: err });
  }
}
