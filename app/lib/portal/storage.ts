import { createReadStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

/**
 * Where project file bytes live. ProjectFile.storageDriver records the driver
 * per file, so switching STORAGE_DRIVER later does not orphan older uploads.
 * Nothing here ever hands out a storage URL: downloads stream through the
 * authorized API routes.
 *
 * - local:       files on disk under STORAGE_LOCAL_DIR (default .uploads). Dev only.
 * - vercel-blob: a private Vercel Blob store (BLOB_READ_WRITE_TOKEN).
 *
 * Another backend (e.g. S3-compatible) only needs to implement StorageDriver
 * and be added to createDriver().
 */

export const STORAGE_DRIVERS = ['local', 'vercel-blob'] as const;
export type StorageDriverName = (typeof STORAGE_DRIVERS)[number];

export type StoredObject = { stream: ReadableStream<Uint8Array>; size: number | null };

export interface StorageDriver {
  readonly name: StorageDriverName;
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

class LocalDriver implements StorageDriver {
  readonly name = 'local' as const;
  private readonly root = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR?.trim() || '.uploads');

  /** Keys are generated server-side, but never let one escape the storage root. */
  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error('Invalid storage key.');
    return target;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  }

  async get(key: string): Promise<StoredObject | null> {
    const target = this.resolve(key);
    try {
      const info = await stat(target);
      const stream = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;
      return { stream, size: info.size };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

class VercelBlobDriver implements StorageDriver {
  readonly name = 'vercel-blob' as const;

  async put(key: string, data: Uint8Array, contentType: string): Promise<void> {
    const { put } = await import('@vercel/blob');
    await put(key, Buffer.from(data), {
      access: 'private',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  }

  async get(key: string): Promise<StoredObject | null> {
    const { get } = await import('@vercel/blob');
    const result = await get(key, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return { stream: result.stream, size: result.blob.size };
  }

  async delete(key: string): Promise<void> {
    const { del } = await import('@vercel/blob');
    await del(key);
  }
}

function createDriver(name: StorageDriverName): StorageDriver {
  return name === 'vercel-blob' ? new VercelBlobDriver() : new LocalDriver();
}

function isDriverName(value: string): value is StorageDriverName {
  return (STORAGE_DRIVERS as readonly string[]).includes(value);
}

/**
 * The driver new uploads go to, or null with a reason when uploads must be refused.
 * STORAGE_DRIVER picks it explicitly; otherwise a configured Blob token selects
 * vercel-blob and everything else falls back to local disk.
 */
export function getUploadDriver(): { driver: StorageDriver } | { driver: null; reason: string } {
  const configured = process.env.STORAGE_DRIVER?.trim();
  const name = configured || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local');

  if (!isDriverName(name)) {
    return { driver: null, reason: `Unknown STORAGE_DRIVER "${name}".` };
  }
  if (name === 'vercel-blob' && !process.env.BLOB_READ_WRITE_TOKEN) {
    return { driver: null, reason: 'STORAGE_DRIVER is vercel-blob but BLOB_READ_WRITE_TOKEN is not set.' };
  }
  // Vercel's filesystem is read-only and per-instance: local storage would lose files.
  if (name === 'local' && process.env.VERCEL) {
    return { driver: null, reason: 'Local file storage is not available on Vercel. Configure Vercel Blob.' };
  }
  return { driver: createDriver(name) };
}

/** The driver that holds an existing file, regardless of the current upload driver. */
export function getDriverFor(name: string): StorageDriver | null {
  return isDriverName(name) ? createDriver(name) : null;
}
