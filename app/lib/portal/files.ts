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
 * PORTAL_MAX_UPLOAD_MB, default 4. Vercel Functions reject request bodies over
 * 4.5 MB, so raising this only helps on other hosts.
 */
export function getMaxUploadBytes(): number {
  const mb = Number(process.env.PORTAL_MAX_UPLOAD_MB);
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 100) : 4;
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
export function declaredBodyTooLarge(request: Request, max = getMaxUploadBytes()): Result<null> {
  const declared = Number(request.headers.get('content-length') || 0);
  return declared > max + 64 * 1024 ? { ok: false, response: tooLarge(max) } : { ok: true, data: null };
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

/** Parses a multipart body with a `file` field and enforces the size limit and type allow-list. */
export async function readUpload(
  request: Request
): Promise<Result<{ upload: ValidUpload; form: FormData }>> {
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
  return { ok: true, data: { upload: upload.data, form } };
}

export type WrittenUpload = ValidUpload & { storageKey: string; storageDriver: StorageDriverName };

/** Writes the bytes of every upload. If any write fails, the ones already written are removed again. */
export async function writeUploads(projectId: string, uploads: ValidUpload[]): Promise<Result<WrittenUpload[]>> {
  const choice = getUploadDriver();
  if (!choice.driver) {
    await reportError({ source: 'storage', message: `File upload refused: ${choice.reason}` });
    return { ok: false, response: apiError(503, 'storageUnavailable', 'File storage is not configured.') };
  }
  const driver = choice.driver;
  const written: WrittenUpload[] = [];
  for (const upload of uploads) {
    const storageKey = `projects/${projectId}/${randomUUID()}`;
    try {
      await driver.put(storageKey, upload.bytes, upload.mimeType);
    } catch (err) {
      await discardUploads(written);
      await reportError({ source: 'storage', message: `Storage write failed (${driver.name})`, error: err });
      return { ok: false, response: apiError(502, 'storageUnavailable', 'Could not store the file.') };
    }
    written.push({ ...upload, storageKey, storageDriver: driver.name });
  }
  return { ok: true, data: written };
}

/** Removes stored bytes whose database rows were never written. */
export async function discardUploads(written: WrittenUpload[]) {
  await Promise.all(written.map((file) => deleteStoredFile(file)));
}

/** Writes the bytes, then the ProjectFile row and its FILE_UPLOADED activity (bytes are removed again if the DB write fails). */
export async function storeProjectFile(input: {
  projectId: string;
  uploadedById: string;
  upload: ValidUpload;
  visibleToClient: boolean;
}): Promise<Result<{ id: string; filename: string }>> {
  const stored = await writeUploads(input.projectId, [input.upload]);
  if (!stored.ok) return stored;
  const [upload] = stored.data;

  try {
    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.projectFile.create({
        data: {
          projectId: input.projectId,
          uploadedById: input.uploadedById,
          filename: upload.filename,
          storageKey: upload.storageKey,
          storageDriver: upload.storageDriver,
          fileSize: upload.bytes.byteLength,
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
    await discardUploads(stored.data);
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
