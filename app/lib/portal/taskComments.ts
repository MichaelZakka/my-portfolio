import { prisma } from '../db';
import { logActivity } from './activity';
import type { UserRole } from './constants';
import { discardUploads, type StoredUpload } from './files';
import { formatBytes, formatDateTime } from './format';
import { apiError, type Result } from './http';
import { displayName } from './queries';

/**
 * Comments on tasks. The admin comments on any task (on an internal one they
 * are internal notes); a client only on tasks shown to them. Attachments are
 * ordinary project files linked to their comment (ProjectFile.taskCommentId),
 * so they appear under Files and follow the task's visibility, like the
 * TASK_COMMENTED activity entries.
 *
 * A task waits for the admin while its newest comment is a client's; an
 * admin reply answers it. No separate "resolved" state.
 */

type Author = { id: string; name: string; role: UserRole };

/** Every comment the viewer may see, oldest first. Clients: only on tasks shown to them. */
export function getTaskComments(projectId: string, { clientView }: { clientView: boolean }) {
  return prisma.taskComment.findMany({
    where: { projectId, ...(clientView ? { task: { visibleToClient: true } } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      taskId: true,
      body: true,
      authorRole: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
      attachments: {
        where: clientView ? { visibleToClient: true } : {},
        orderBy: { createdAt: 'asc' },
        select: { id: true, filename: true, fileSize: true },
      },
    },
  });
}

type CommentRow = Awaited<ReturnType<typeof getTaskComments>>[number];

/**
 * Comments grouped by task, labels formatted for the viewer. `waitingForLead`:
 * the newest comment is a client's, so the task waits for the admin's reply.
 */
export function presentTaskComments(
  rows: CommentRow[],
  {
    viewerRole,
    locale,
    timeZone,
    projectId,
    api = viewerRole === 'admin' ? 'admin' : 'portal',
  }: { viewerRole: UserRole; locale: string; timeZone: string; projectId: string; api?: 'admin' | 'portal' }
) {
  const byTask: Record<string, { comments: PresentedComment[]; waitingForLead: boolean }> = {};
  for (const row of rows) {
    const thread = (byTask[row.taskId] ??= { comments: [], waitingForLead: false });
    thread.comments.push({
      id: row.id,
      body: row.body,
      author: row.author ? displayName(row.author) : null,
      fromLead: row.authorRole === 'admin',
      mine: row.authorRole === viewerRole,
      createdAt: row.createdAt.toISOString(),
      timeLabel: formatDateTime(row.createdAt, locale, timeZone),
      attachments: row.attachments.map((file) => ({
        id: file.id,
        filename: file.filename,
        sizeLabel: formatBytes(file.fileSize, locale),
        downloadUrl: `/api/${api}/projects/${projectId}/files/${file.id}`,
      })),
    });
    thread.waitingForLead = row.authorRole === 'client';
  }
  return byTask;
}

type PresentedComment = {
  id: string;
  body: string;
  author: string | null;
  fromLead: boolean;
  /** Written by the viewer's side (the admin, or any client of the project). */
  mine: boolean;
  createdAt: string;
  timeLabel: string;
  attachments: { id: string; filename: string; sizeLabel: string; downloadUrl: string }[];
};

export type TaskThreads = ReturnType<typeof presentTaskComments>;
export type TaskThread = TaskThreads[string];

/** The comment, its files and the activity entries in one transaction (the stored bytes are removed if that fails). */
export async function createTaskComment(input: {
  projectId: string;
  taskId: string;
  author: Author;
  content: string;
  /** Attachments already in storage (readMessageInput); removed again if the comment is not saved. */
  stored: StoredUpload[];
}): Promise<
  Result<{ commentId: string; activityId: string; taskTitle: string; taskVisible: boolean; attachments: number }>
> {
  const task = await prisma.task.findFirst({
    where: { id: input.taskId, projectId: input.projectId },
    select: { id: true, title: true, visibleToClient: true },
  });
  const files = input.stored;
  // A client cannot tell a hidden task from a missing one.
  if (!task || (input.author.role === 'client' && !task.visibleToClient)) {
    await discardUploads(files);
    return { ok: false, response: apiError(404, 'notFound', 'Task not found.') };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.taskComment.create({
        data: {
          projectId: input.projectId,
          taskId: task.id,
          authorId: input.author.id,
          authorRole: input.author.role,
          body: input.content,
        },
        select: { id: true },
      });
      for (const file of files) {
        const row = await tx.projectFile.create({
          data: {
            projectId: input.projectId,
            uploadedById: input.author.id,
            taskCommentId: comment.id,
            filename: file.filename,
            storageKey: file.storageKey,
            storageDriver: file.storageDriver,
            fileSize: file.size,
            mimeType: file.mimeType,
            visibleToClient: task.visibleToClient,
          },
          select: { id: true, filename: true },
        });
        await logActivity(
          {
            projectId: input.projectId,
            actorId: input.author.id,
            type: 'FILE_UPLOADED',
            meta: { fileId: row.id, filename: row.filename },
            visibleToClient: task.visibleToClient,
          },
          tx
        );
      }
      const activity = await logActivity(
        {
          projectId: input.projectId,
          actorId: input.author.id,
          type: 'TASK_COMMENTED',
          meta: { taskId: task.id, commentId: comment.id, title: task.title, name: input.author.name },
          visibleToClient: task.visibleToClient,
        },
        tx
      );
      return { commentId: comment.id, activityId: activity.id };
    });
    return {
      ok: true,
      data: { ...result, taskTitle: task.title, taskVisible: task.visibleToClient, attachments: files.length },
    };
  } catch (err) {
    await discardUploads(files);
    throw err;
  }
}

/** Live-update stamp for the client screen: visible comments and their visible attachments. */
export async function getClientCommentsStamp(projectId: string) {
  const [comments, files] = await Promise.all([
    prisma.taskComment.aggregate({
      where: { projectId, task: { visibleToClient: true } },
      _count: true,
      _max: { createdAt: true },
    }),
    prisma.projectFile.count({ where: { projectId, taskCommentId: { not: null }, visibleToClient: true } }),
  ]);
  return `${comments._count}:${comments._max.createdAt?.getTime() ?? 0}:${files}`;
}
