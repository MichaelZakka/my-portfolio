import { prisma } from './db';
import { adminUnreadByProject } from './portal/messages';
import type { ActivityType } from './portal/constants';

/**
 * The admin's notifications: everything that happened on the platform without
 * the admin doing it — new requests, client actions on projects (the Activity
 * log already records them with the actor), proposal answers and new problems.
 * "New" means newer than AdminState.noticesSeenAt, which opening the
 * notifications screen updates.
 */

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export type AdminNotice = {
  id: string;
  kind: 'request' | 'message' | 'milestones' | 'meetings' | 'files' | 'clients' | 'project' | 'proposal' | 'problem';
  at: Date;
  /** What happened, e.g. "Milestone approved". */
  title: string;
  /** The specifics, e.g. "Alexandria approved: Design". */
  detail: string;
  /** Project name, when the event belongs to one. */
  project?: string;
  href: string;
  tone: NoticeTone;
};

/** Never opened: only the last week counts as new, not all history. */
function defaultSeenAt(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

/** Prisma's "table does not exist": the AdminState migration hasn't run yet. */
function isMissingTable(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'P2021';
}

export async function getNoticesSeenAt(): Promise<Date> {
  try {
    const row = await prisma.adminState.findUnique({ where: { id: 1 }, select: { noticesSeenAt: true } });
    return row?.noticesSeenAt ?? defaultSeenAt();
  } catch (error) {
    if (isMissingTable(error)) return defaultSeenAt();
    throw error;
  }
}

/** Everything shown now has been seen; the bell starts again from this moment. */
export async function markNoticesSeen(now = new Date()): Promise<void> {
  try {
    await prisma.adminState.upsert({
      where: { id: 1 },
      create: { id: 1, noticesSeenAt: now },
      update: { noticesSeenAt: now },
    });
  } catch (error) {
    // Before the migration runs the bell simply keeps its time-based default
    if (!isMissingTable(error)) throw error;
  }
}

const ADMIN = '/admin-jfaygpory6';

type ActivityKind = Exclude<AdminNotice['kind'], 'request' | 'proposal' | 'problem'>;

/** Which project tab an activity type belongs to (also the notice's kind). */
function activityKind(type: string): ActivityKind {
  if (type === 'MESSAGE_SENT') return 'message';
  if (type.startsWith('MILESTONE_') || type.startsWith('TASK_')) return 'milestones';
  if (type.startsWith('MEETING_')) return 'meetings';
  if (type.startsWith('FILE_')) return 'files';
  if (type.startsWith('INVITE_') || type === 'MEMBER_REMOVED') return 'clients';
  return 'project';
}

const ACTIVITY_TITLES: Partial<Record<ActivityType, { title: string; tone: NoticeTone }>> = {
  MESSAGE_SENT: { title: 'New message', tone: 'info' },
  MILESTONE_APPROVED: { title: 'Milestone approved', tone: 'success' },
  MILESTONE_CHANGES_REQUESTED: { title: 'Changes requested', tone: 'warning' },
  TASK_COMMENTED: { title: 'Comment on a task', tone: 'info' },
  MILESTONE_CHANGES_COMMENTED: { title: 'Reply about requested changes', tone: 'warning' },
  MEETING_PROPOSED: { title: 'Meeting proposed', tone: 'info' },
  MEETING_CONFIRMED: { title: 'Meeting confirmed', tone: 'success' },
  MEETING_CANCELLED: { title: 'Meeting cancelled', tone: 'warning' },
  MEETING_RESCHEDULED: { title: 'Meeting rescheduled', tone: 'info' },
  MEETING_UPDATED: { title: 'Meeting details updated', tone: 'info' },
  MEETING_NOTES_ACKNOWLEDGED: { title: 'Meeting notes confirmed', tone: 'success' },
  MEETING_NOTES_COMMENTED: { title: 'Comment on meeting notes', tone: 'info' },
  MEETING_ACTION_ITEM_DONE: { title: 'Action item done', tone: 'success' },
  FILE_UPLOADED: { title: 'File uploaded', tone: 'info' },
  INVITE_ACCEPTED: { title: 'Client joined the portal', tone: 'success' },
  PROPOSAL_ACCEPTED: { title: 'Proposal accepted', tone: 'success' },
};

const PROPOSAL_ANSWERS: Record<string, { title: string; tone: NoticeTone; verb: string }> = {
  declined: { title: 'Proposal declined', tone: 'danger', verb: 'declined' },
  changes_requested: { title: 'Proposal: changes requested', tone: 'warning', verb: 'asked for changes to' },
};

/** The project tab a notice opens ('message' → the messages tab, and so on). */
function projectHref(projectId: string, kind: ActivityKind): string {
  const tab = kind === 'message' ? 'messages' : kind === 'project' ? 'overview' : kind;
  return `${ADMIN}/projects/${projectId}${tab === 'overview' ? '' : `?tab=${tab}`}`;
}

/** The latest events, newest first. */
export async function getAdminNotices(limit = 50): Promise<AdminNotice[]> {
  const [activity, leads, proposals, problems] = await Promise.all([
    prisma.activity.findMany({
      where: { actor: { role: 'client' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        projectId: true,
        type: true,
        summary: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, projectTitle: true, clientName: true, createdAt: true },
    }),
    prisma.proposal.findMany({
      where: { respondedAt: { not: null }, status: { in: Object.keys(PROPOSAL_ANSWERS) } },
      orderBy: { respondedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        respondedAt: true,
        recipientName: true,
        lead: { select: { clientName: true } },
      },
    }),
    prisma.errorEvent.findMany({
      where: { resolvedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
      select: { id: true, message: true, source: true, count: true, lastSeenAt: true },
    }),
  ]);

  const notices: AdminNotice[] = [
    ...activity.map((entry): AdminNotice => {
      const kind = activityKind(entry.type);
      const known = ACTIVITY_TITLES[entry.type as ActivityType];
      return {
        id: `activity-${entry.id}`,
        kind,
        at: entry.createdAt,
        title: known?.title ?? 'Project update',
        detail: entry.summary,
        project: entry.project.name,
        href: projectHref(entry.projectId, kind),
        tone: known?.tone ?? 'info',
      };
    }),
    ...leads.map((lead): AdminNotice => ({
      id: `lead-${lead.id}`,
      kind: 'request',
      at: lead.createdAt,
      title: 'New project request',
      detail: `“${lead.projectTitle || 'Untitled'}” — ${lead.clientName}`,
      href: `${ADMIN}/requests/${lead.id}`,
      tone: 'info',
    })),
    ...proposals.map((proposal): AdminNotice => {
      const answer = PROPOSAL_ANSWERS[proposal.status];
      const who = proposal.recipientName || proposal.lead.clientName;
      return {
        id: `proposal-${proposal.id}`,
        kind: 'proposal',
        at: proposal.respondedAt as Date,
        title: answer.title,
        detail: `${who} ${answer.verb} “${proposal.title}” (version ${proposal.version})`,
        href: `${ADMIN}/proposals/${proposal.id}`,
        tone: answer.tone,
      };
    }),
    ...problems.map((problem): AdminNotice => ({
      id: `problem-${problem.id}`,
      kind: 'problem',
      at: problem.lastSeenAt,
      title: 'Problem on the site',
      detail: `${problem.message}${problem.count > 1 ? ` (${problem.count}×)` : ''}`,
      href: `${ADMIN}/site#errors`,
      tone: 'danger',
    })),
  ];

  return notices.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type AdminBadges = {
  /** Unread client messages (clears when the messages are read). */
  messages: number;
  /** Open problems on the Site page (clears when resolved). */
  problems: number;
  /** Requests still in the "new" status (clears when the status changes). */
  requests: number;
  /** Client project events other than messages since the feed was last opened. */
  updates: number;
  /** Everything new since the feed was last opened (the bell). */
  notices: number;
};

/** The numbers behind the sidebar badges, in one round trip. */
export async function getAdminBadges(): Promise<AdminBadges> {
  const seenAt = await getNoticesSeenAt();
  const [unread, problems, requests, updates, messageEvents, newLeads, proposalAnswers, newProblems] =
    await Promise.all([
      adminUnreadByProject(),
      prisma.errorEvent.count({ where: { resolvedAt: null } }),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.activity.count({
        where: { actor: { role: 'client' }, type: { not: 'MESSAGE_SENT' }, createdAt: { gt: seenAt } },
      }),
      prisma.activity.count({
        where: { actor: { role: 'client' }, type: 'MESSAGE_SENT', createdAt: { gt: seenAt } },
      }),
      prisma.lead.count({ where: { createdAt: { gt: seenAt } } }),
      prisma.proposal.count({
        where: { respondedAt: { gt: seenAt }, status: { in: Object.keys(PROPOSAL_ANSWERS) } },
      }),
      prisma.errorEvent.count({ where: { resolvedAt: null, lastSeenAt: { gt: seenAt } } }),
    ]);

  return {
    messages: [...unread.values()].reduce((sum, n) => sum + n, 0),
    problems,
    requests,
    updates,
    notices: updates + messageEvents + newLeads + proposalAnswers + newProblems,
  };
}
