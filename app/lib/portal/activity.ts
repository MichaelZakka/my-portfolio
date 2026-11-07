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
  INVITE_ACCEPTED: { name: string; emailSent?: boolean; emailError?: string | null };
  MILESTONE_CREATED: { milestoneId: string; title: string };
  MILESTONE_COMPLETED: { milestoneId: string; title: string };
  MILESTONE_REVIEW_REQUESTED: ReviewMeta;
  MILESTONE_APPROVED: ReviewMeta & { name: string };
  MILESTONE_CHANGES_REQUESTED: ReviewMeta & { name: string };
  TASK_CREATED: { taskId: string; title: string };
  TASK_COMPLETED: { taskId: string; title: string };
  MESSAGE_SENT: { messageId: string; senderName: string };
  FILE_UPLOADED: { fileId: string; filename: string };
  STATUS_CHANGED: { from: string; to: string; emailSent?: boolean; emailError?: string | null };
  MEETING_PROPOSED: MeetingMeta;
  MEETING_RESCHEDULED: MeetingMeta;
  MEETING_CONFIRMED: MeetingMeta;
  MEETING_CANCELLED: MeetingMeta;
  PROPOSAL_ACCEPTED: { proposalId: string; version: number; title: string; name: string };
  PROJECT_UPDATED: { fields: string };
  PROJECT_ARCHIVED: { name: string };
  PROJECT_RESTORED: { name: string };
  MILESTONE_DELETED: { milestoneId: string; title: string };
  MILESTONE_REVIEW_WITHDRAWN: ReviewMeta;
  TASK_DELETED: { taskId: string; title: string };
  TASK_VISIBILITY_CHANGED: { taskId: string; title: string; visible: boolean };
  FILE_DELETED: { fileId: string; filename: string };
  FILE_VISIBILITY_CHANGED: { fileId: string; filename: string; visible: boolean };
  MEMBER_REMOVED: { email: string; name: string };
  INVITE_REVOKED: { email: string; invitationId: string };
  INVITE_RESENT: { email: string; invitationId: string; emailSent?: boolean; emailError?: string | null };
};

type MeetingMeta = { meetingId: string; title: string; emailSent?: boolean; emailError?: string | null };
type ReviewMeta = { milestoneId: string; reviewId: string; title: string };

const statusLabel = (status: string) => (isProjectStatus(status) ? PROJECT_STATUS_LABELS[status] : status);

const SUMMARIES: { [T in ActivityType]: (meta: ActivityMeta[T]) => string } = {
  PROJECT_CREATED: (m) => `Project "${m.name}" created`,
  CLIENT_INVITED: (m) => `Invited ${m.email}`,
  INVITE_ACCEPTED: (m) => `${m.name || 'A client'} accepted the invitation`,
  MILESTONE_CREATED: (m) => `Milestone added: ${m.title}`,
  MILESTONE_COMPLETED: (m) => `Milestone completed: ${m.title}`,
  MILESTONE_REVIEW_REQUESTED: (m) => `Approval requested: ${m.title}`,
  MILESTONE_APPROVED: (m) => `${m.name} approved: ${m.title}`,
  MILESTONE_CHANGES_REQUESTED: (m) => `${m.name} asked for changes: ${m.title}`,
  TASK_CREATED: (m) => `Task added: ${m.title}`,
  TASK_COMPLETED: (m) => `Task completed: ${m.title}`,
  MESSAGE_SENT: (m) => `${m.senderName} sent a message`,
  FILE_UPLOADED: (m) => `File uploaded: ${m.filename}`,
  STATUS_CHANGED: (m) => `Status changed from ${statusLabel(m.from)} to ${statusLabel(m.to)}`,
  MEETING_PROPOSED: (m) => `Meeting proposed: ${m.title}`,
  MEETING_RESCHEDULED: (m) => `New time proposed for meeting: ${m.title}`,
  MEETING_CONFIRMED: (m) => `Meeting confirmed: ${m.title}`,
  MEETING_CANCELLED: (m) => `Meeting cancelled: ${m.title}`,
  PROPOSAL_ACCEPTED: (m) => `${m.name} accepted proposal v${m.version}`,
  PROJECT_UPDATED: (m) => `Project details edited: ${m.fields}`,
  PROJECT_ARCHIVED: (m) => `Project archived: ${m.name}`,
  PROJECT_RESTORED: (m) => `Project restored from the archive: ${m.name}`,
  MILESTONE_DELETED: (m) => `Milestone deleted: ${m.title}`,
  MILESTONE_REVIEW_WITHDRAWN: (m) => `Approval request withdrawn: ${m.title}`,
  TASK_DELETED: (m) => `Task deleted: ${m.title}`,
  TASK_VISIBILITY_CHANGED: (m) => `${m.visible ? 'Task shown to the client' : 'Task hidden from the client'}: ${m.title}`,
  FILE_DELETED: (m) => `File deleted: ${m.filename}`,
  FILE_VISIBILITY_CHANGED: (m) => `${m.visible ? 'File shared with the client' : 'File hidden from the client'}: ${m.filename}`,
  MEMBER_REMOVED: (m) => `Removed ${m.name ? `${m.name} (${m.email})` : m.email} from the project`,
  INVITE_REVOKED: (m) => `Invitation revoked: ${m.email}`,
  INVITE_RESENT: (m) => `Invitation resent: ${m.email}`,
};

/** Admin-side changes that are recorded for the audit trail only; clients never see them. */
export const AUDIT_ACTIVITY_TYPES = [
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'PROJECT_RESTORED',
  'MILESTONE_DELETED',
  'MILESTONE_REVIEW_WITHDRAWN',
  'TASK_DELETED',
  'TASK_VISIBILITY_CHANGED',
  'FILE_DELETED',
  'FILE_VISIBILITY_CHANGED',
  'MEMBER_REMOVED',
  'INVITE_REVOKED',
  'INVITE_RESENT',
] as const satisfies readonly ActivityType[];

type AuditType = (typeof AUDIT_ACTIVITY_TYPES)[number];

/** Records an audit entry (internal, never shown to clients). */
export function logAudit<T extends AuditType>(
  input: { projectId: string; actorId: string | null; type: T; meta: ActivityMeta[T] },
  db: Db = prisma
) {
  return logActivity({ ...input, visibleToClient: false }, db);
}

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
