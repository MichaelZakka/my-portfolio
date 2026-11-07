import { prisma } from '../db';
import { logActivity } from './activity';
import { MESSAGE_MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from './constants';
import {
  declaredBodyTooLarge,
  discardUploads,
  getMaxUploadBytes,
  validateUploadFile,
  writeUploads,
  type ValidUpload,
} from './files';
import { apiError, parseJsonBody, type Result } from './http';
import { messageSchema } from './validation';

/**
 * Messages: posting (text and/or attachments), read markers, unread counts,
 * and the cheap "stamps" the project screens poll for live updates.
 *
 * Attachments are ordinary project files linked to their message
 * (ProjectFile.messageId), so they also appear under Files, follow the same
 * visibility switch and download through the same authorized routes. They
 * travel in the message request itself, so together they share the upload
 * size limit.
 */

export type MessageInput = { content: string; uploads: ValidUpload[] };

/** JSON `{ content }`, or multipart with `content` and up to MESSAGE_MAX_ATTACHMENTS `files`. */
export async function readMessageInput(request: Request): Promise<Result<MessageInput>> {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const body = await parseJsonBody(request, messageSchema);
    return body.ok ? { ok: true, data: { content: body.data.content, uploads: [] } } : body;
  }

  const max = getMaxUploadBytes();
  const sizeCheck = declaredBodyTooLarge(request, max);
  if (!sizeCheck.ok) return sizeCheck;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, response: apiError(400, 'invalidInput', 'Expected a multipart/form-data body.') };
  }

  const content = String(form.get('content') ?? '').trim();
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > MESSAGE_MAX_ATTACHMENTS) {
    return {
      ok: false,
      response: apiError(400, 'tooManyFiles', `Attach at most ${MESSAGE_MAX_ATTACHMENTS} files.`, {
        max: MESSAGE_MAX_ATTACHMENTS,
      }),
    };
  }
  if (content.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, response: apiError(400, 'invalidInput', 'The message is too long.') };
  }
  if (!content && files.length === 0) {
    return { ok: false, response: apiError(400, 'invalidInput', 'Write a message or attach a file.') };
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > max) {
    return {
      ok: false,
      response: apiError(413, 'fileTooLarge', `Attachments can be at most ${Math.round(max / 1024 / 1024)} MB together.`, {
        maxBytes: max,
      }),
    };
  }

  const uploads: ValidUpload[] = [];
  for (const file of files) {
    const upload = await validateUploadFile(file, max);
    if (!upload.ok) return upload;
    uploads.push(upload.data);
  }
  return { ok: true, data: { content, uploads } };
}

/**
 * Stores the attachments' bytes first, then the message, its files and their
 * activity in one transaction (the bytes are removed again if that fails).
 */
export async function createMessage(input: {
  projectId: string;
  sender: { id: string; name: string };
  content: string;
  uploads: ValidUpload[];
}): Promise<Result<{ id: string; createdAt: Date; attachments: number }>> {
  const written = input.uploads.length ? await writeUploads(input.projectId, input.uploads) : null;
  if (written && !written.ok) return written;
  const files = written?.data ?? [];

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { projectId: input.projectId, senderId: input.sender.id, content: input.content },
        select: { id: true, createdAt: true },
      });
      for (const file of files) {
        const row = await tx.projectFile.create({
          data: {
            projectId: input.projectId,
            uploadedById: input.sender.id,
            messageId: created.id,
            filename: file.filename,
            storageKey: file.storageKey,
            storageDriver: file.storageDriver,
            fileSize: file.bytes.byteLength,
            mimeType: file.mimeType,
            visibleToClient: true,
          },
          select: { id: true, filename: true },
        });
        await logActivity(
          {
            projectId: input.projectId,
            actorId: input.sender.id,
            type: 'FILE_UPLOADED',
            meta: { fileId: row.id, filename: row.filename },
            visibleToClient: true,
          },
          tx
        );
      }
      await logActivity(
        {
          projectId: input.projectId,
          actorId: input.sender.id,
          type: 'MESSAGE_SENT',
          meta: { messageId: created.id, senderName: input.sender.name },
          visibleToClient: true,
        },
        tx
      );
      return created;
    });
    return { ok: true, data: { ...message, attachments: files.length } };
  } catch (err) {
    await discardUploads(files);
    throw err;
  }
}

// --- Read markers and unread counts -------------------------------------------

/** Never in the future (clock skew), and never moves backwards. */
function readMark(until: Date): Date {
  const now = new Date();
  return until.getTime() > now.getTime() ? now : until;
}

/** A client has read everything up to `until` (the newest message their screen showed). */
export async function markReadByClient(projectId: string, userId: string, until: Date) {
  const mark = readMark(until);
  await prisma.projectMember.updateMany({
    where: { projectId, userId, OR: [{ lastReadAt: null }, { lastReadAt: { lt: mark } }] },
    data: { lastReadAt: mark },
  });
}

export async function markReadByAdmin(projectId: string, until: Date) {
  const mark = readMark(until);
  await prisma.project.updateMany({
    where: { id: projectId, OR: [{ adminLastReadAt: null }, { adminLastReadAt: { lt: mark } }] },
    data: { adminLastReadAt: mark },
  });
}

/** Unread for a client: anyone else's messages after their read marker. */
export function countUnreadForClient(projectId: string, userId: string, lastReadAt: Date | null) {
  return prisma.message.count({
    where: { projectId, senderId: { not: userId }, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) },
  });
}

/** Unread for the admin: clients' messages after the admin's read marker. */
export function countUnreadForAdmin(projectId: string, adminLastReadAt: Date | null) {
  return prisma.message.count({
    where: {
      projectId,
      sender: { role: 'client' },
      ...(adminLastReadAt ? { createdAt: { gt: adminLastReadAt } } : {}),
    },
  });
}

export async function getClientReadState(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { lastReadAt: true },
  });
  const lastReadAt = member?.lastReadAt ?? null;
  return { lastReadAt, unread: await countUnreadForClient(projectId, userId, lastReadAt) };
}

/** Unread client messages per project, for the admin's lists (a count per project; there are few). */
export async function adminUnreadByProject(): Promise<Map<string, number>> {
  const projects = await prisma.project.findMany({ select: { id: true, adminLastReadAt: true } });
  const counts = await Promise.all(projects.map((p) => countUnreadForAdmin(p.id, p.adminLastReadAt)));
  return new Map(projects.map((p, i) => [p.id, counts[i]]));
}

// --- Live updates ---------------------------------------------------------------

const stamp = (count: number, latest: Date | null | undefined) => `${count}:${latest?.getTime() ?? 0}`;

/**
 * What the client's project screen shows, reduced to "count:latest" strings.
 * The screen polls these and re-reads only the sections whose stamp changed.
 */
export async function getClientStamps(projectId: string, userId: string) {
  const [messages, files, activity, meetings, read] = await Promise.all([
    prisma.message.aggregate({ where: { projectId }, _count: true, _max: { createdAt: true } }),
    prisma.projectFile.aggregate({ where: { projectId, visibleToClient: true }, _count: true, _max: { createdAt: true } }),
    prisma.activity.aggregate({ where: { projectId, visibleToClient: true }, _count: true, _max: { createdAt: true } }),
    prisma.meeting.aggregate({ where: { projectId }, _count: true, _max: { updatedAt: true } }),
    getClientReadState(projectId, userId),
  ]);
  return {
    stamps: {
      messages: stamp(messages._count, messages._max.createdAt),
      files: stamp(files._count, files._max.createdAt),
      activity: stamp(activity._count, activity._max.createdAt),
      meetings: stamp(meetings._count, meetings._max.updatedAt),
    },
    unread: read.unread,
  };
}

export type ClientStamps = Awaited<ReturnType<typeof getClientStamps>>['stamps'];

/**
 * The admin screen shows everything, and every change by either side logs an
 * activity entry, so one stamp over all activity (plus files, whose deletion
 * leaves no newer entry for the client view) tells it when to reload.
 */
export async function getAdminStamps(projectId: string) {
  const [activity, files, project] = await Promise.all([
    prisma.activity.aggregate({ where: { projectId }, _count: true, _max: { createdAt: true } }),
    prisma.projectFile.aggregate({ where: { projectId }, _count: true, _max: { createdAt: true } }),
    prisma.project.findUnique({ where: { id: projectId }, select: { adminLastReadAt: true } }),
  ]);
  return {
    stamp: `${stamp(activity._count, activity._max.createdAt)}|${stamp(files._count, files._max.createdAt)}`,
    unread: await countUnreadForAdmin(projectId, project?.adminLastReadAt ?? null),
  };
}
