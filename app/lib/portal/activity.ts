import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db';
import { PROJECT_STATUS_LABELS, isProjectStatus, type ActivityType } from './constants';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Structured details for each event. Clients see a localized sentence built
 * from these (messages portal.activity.<TYPE>), the admin sees `summary`.
 * taskId / fileId let visibility follow the task or file (see syncActivityVisibility).
 */
export type ActivityMeta = {
  PROJECT_CREATED: { name: string };
  CLIENT_INVITED: { email: string; invitationId: string; emailSent?: boolean; emailError?: string | null };
  INVITE_ACCEPTED: { name: string };
  MILESTONE_CREATED: { milestoneId: string; title: string };
  MILESTONE_COMPLETED: { milestoneId: string; title: string };
  TASK_CREATED: { taskId: string; title: string };
  TASK_COMPLETED: { taskId: string; title: string };
  MESSAGE_SENT: { messageId: string; senderName: string };
  FILE_UPLOADED: { fileId: string; filename: string };
  STATUS_CHANGED: { from: string; to: string; emailSent?: boolean; emailError?: string | null };
};

const statusLabel = (status: string) => (isProjectStatus(status) ? PROJECT_STATUS_LABELS[status] : status);

const SUMMARIES: { [T in ActivityType]: (meta: ActivityMeta[T]) => string } = {
  PROJECT_CREATED: (m) => `Project "${m.name}" created`,
  CLIENT_INVITED: (m) => `Invited ${m.email}`,
  INVITE_ACCEPTED: (m) => `${m.name || 'A client'} accepted the invitation`,
  MILESTONE_CREATED: (m) => `Milestone added: ${m.title}`,
  MILESTONE_COMPLETED: (m) => `Milestone completed: ${m.title}`,
  TASK_CREATED: (m) => `Task added: ${m.title}`,
  TASK_COMPLETED: (m) => `Task completed: ${m.title}`,
  MESSAGE_SENT: (m) => `${m.senderName} sent a message`,
  FILE_UPLOADED: (m) => `File uploaded: ${m.filename}`,
  STATUS_CHANGED: (m) => `Status changed from ${statusLabel(m.from)} to ${statusLabel(m.to)}`,
};

/** The one place portal events are recorded. Pass a transaction client to log atomically with the change. */
export async function logActivity<T extends ActivityType>(
  input: {
    projectId: string;
    actorId: string | null;
    type: T;
    meta: ActivityMeta[T];
    visibleToClient: boolean;
  },
  db: Db = prisma
) {
  return db.activity.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId,
      type: input.type,
      summary: SUMMARIES[input.type](input.meta).slice(0, 500),
      meta: JSON.stringify(input.meta),
      visibleToClient: input.visibleToClient,
    },
  });
}

/** Merges extra fields (e.g. email results recorded after sending) into an activity's meta. */
export async function updateActivityMeta(activityId: string, extra: Record<string, unknown>) {
  const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { meta: true } });
  if (!activity) return;
  await prisma.activity.update({
    where: { id: activityId },
    data: { meta: JSON.stringify({ ...parseActivityMeta(activity.meta), ...extra }) },
  });
}

/**
 * When a task or file is hidden from (or shown to) the client, its earlier
 * TASK_* / FILE_UPLOADED events follow, so the feed never leaks hidden titles.
 */
export async function syncActivityVisibility(
  projectId: string,
  ref: { taskId: string } | { fileId: string },
  visibleToClient: boolean,
  db: Db = prisma
) {
  const [key, id] = 'taskId' in ref ? ['taskId', ref.taskId] : ['fileId', ref.fileId];
  const types = 'taskId' in ref ? ['TASK_CREATED', 'TASK_COMPLETED'] : ['FILE_UPLOADED'];
  await db.activity.updateMany({
    where: { projectId, type: { in: types }, meta: { contains: `"${key}":"${id}"` } },
    data: { visibleToClient },
  });
}

/**
 * The only meta fields a client may see. Raw meta also holds internal
 * bookkeeping (invitee emails, delivery errors naming other recipients).
 */
const CLIENT_SAFE_META_KEYS = ['name', 'title', 'filename', 'from', 'to', 'senderName'] as const;

export function clientActivityParams(meta: string | null): Record<string, string> {
  const parsed = parseActivityMeta(meta);
  const params: Record<string, string> = {};
  for (const key of CLIENT_SAFE_META_KEYS) {
    if (typeof parsed[key] === 'string') params[key] = parsed[key];
  }
  return params;
}

export function parseActivityMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
