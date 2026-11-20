import { parseActivityMeta } from './activity';
import { getAdminCompletion, reviewerLabel } from './completion';
import { currentPhaseOf, invitationState } from './constants';
import { getProjectMeetings } from './meetings';
import { getAdminStamps } from './messages';
import { latestDueDate } from './work';
import { presentMeetings } from './present';
import { getTaskComments, presentTaskComments } from './taskComments';
import {
  dayKey,
  formatBytes,
  formatDate,
  formatDateTime,
  formatDayLabel,
  formatTime,
  getPortalTimeZone,
  toDateInputValue,
} from './format';
import {
  displayName,
  getAdminProjectDetail,
  getProjectActivity,
  getMessagePage,
  getProjectFiles,
  type MessageRow,
} from './queries';

/** The admin screen's message shape (also returned by GET /api/admin/projects/[id]/messages?before=…). */
export function presentAdminMessages(projectId: string, messages: MessageRow[]) {
  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    sentAt: formatDateTime(message.createdAt, 'en'),
    createdAt: message.createdAt.toISOString(),
    time: formatTime(message.createdAt, 'en'),
    dayKey: dayKey(message.createdAt),
    dayLabel: formatDayLabel(message.createdAt, 'en'),
    senderName: displayName(message.sender),
    fromAdmin: message.sender.role === 'admin',
    emailSent: message.emailSent,
    emailError: message.emailError,
    emailBatched: message.emailBatched,
    attachments: message.attachments.map((file) => ({
      id: file.id,
      filename: file.filename,
      sizeLabel: formatBytes(file.fileSize, 'en'),
      hidden: !file.visibleToClient,
      downloadUrl: `/api/admin/projects/${projectId}/files/${file.id}`,
    })),
  }));
}

/**
 * Everything the admin project screen shows, with labels already formatted.
 * The page renders it on the server and GET /api/admin/projects/[id]/view
 * returns the same shape, which the screen re-reads after every change.
 */
export async function buildAdminProjectView(projectId: string) {
  const [project, messagePage, files, activity, meetings, comments, live, completion] = await Promise.all([
    getAdminProjectDetail(projectId),
    getMessagePage(projectId, { clientView: false }),
    getProjectFiles(projectId, { clientView: false }),
    getProjectActivity(projectId, { clientView: false }),
    getProjectMeetings(projectId),
    getTaskComments(projectId, { clientView: false }),
    getAdminStamps(projectId),
    getAdminCompletion(projectId),
  ]);
  if (!project) return null;

  const at = (date: Date | null) => (date ? formatDateTime(date, 'en') : null);
  const threads = presentTaskComments(comments, {
    viewerRole: 'admin',
    locale: 'en',
    timeZone: getPortalTimeZone(),
    projectId,
  });
  const lastDue = latestDueDate(project.milestones);

  return {
    project: {
      id: project.id,
      name: project.name,
      summary: project.summary,
      status: project.status,
      currentPhase: currentPhaseOf(project.milestones, project.currentPhase),
      /** The hand-typed phase; only shown (and editable) while the project has no milestones. */
      manualPhase: project.currentPhase,
      phaseFollowsMilestones: project.milestones.length > 0,
      estimatedCompletion: toDateInputValue(project.estimatedCompletion),
      etaLabel: project.estimatedCompletion ? formatDate(project.estimatedCompletion, 'en') : null,
      archived: Boolean(project.archivedAt),
      progress: project.progress,
      milestonesDone: project.milestones.filter((m) => m.status === 'done').length,
      milestonesTotal: project.milestones.length,
      request: project.request
        ? { id: project.request.id, title: project.request.projectTitle || project.request.clientName }
        : null,
    },
    members: project.members.map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      activated: member.user.activated,
      lastLogin: at(member.user.lastLoginAt),
    })),
    invitations: project.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      state: invitationState(invitation),
      lastSent: at(invitation.lastSentAt),
      expires: formatDateTime(invitation.expiresAt, 'en'),
      emailSent: invitation.emailSent,
      emailError: invitation.emailError,
    })),
    milestones: project.milestones.map((m) => {
      const pending = m.reviews.find((r) => r.status === 'pending');
      const answered = m.reviews.filter((r) => r.status === 'approved' || r.status === 'changes_requested');
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        dueDate: toDateInputValue(m.dueDate),
        dueLabel: m.dueDate ? formatDate(m.dueDate, 'en') : null,
        completedLabel: m.status === 'done' && m.completedAt ? formatDate(m.completedAt, 'en') : null,
        estimatedDays: m.estimatedDays ? String(m.estimatedDays) : '',
        review: {
          pending: pending
            ? {
                requested: formatDateTime(pending.requestedAt, 'en'),
                note: pending.note,
                link: pending.link,
                emailSent: pending.emailSent,
                emailError: pending.emailError,
              }
            : null,
          // Newest first: approvals and change requests, with who answered.
          history: answered.map((r) => ({
            id: r.id,
            approved: r.status === 'approved',
            by: r.respondedBy ? displayName(r.respondedBy) : 'A client',
            when: at(r.respondedAt),
            response: r.response,
          })),
          changesRounds: answered.filter((r) => r.status === 'changes_requested').length,
          /**
           * The client's latest answer, when it asked for changes and no new
           * request has replaced it: the change request and its replies.
           */
          changeRequest:
            !pending && answered[0]?.status === 'changes_requested'
              ? {
                  reviewId: answered[0].id,
                  by: answered[0].respondedBy ? displayName(answered[0].respondedBy) : 'A client',
                  when: at(answered[0].respondedAt),
                  text: answered[0].response ?? '',
                  comments: answered[0].comments.map((c) => ({
                    id: c.id,
                    body: c.body,
                    author: c.author ? displayName(c.author) : null,
                    fromLead: c.authorRole === 'admin',
                    timeLabel: formatDateTime(c.createdAt, 'en'),
                  })),
                  // The client spoke last (the request itself, or a follow-up): your turn.
                  waitingForReply: (answered[0].comments.at(-1)?.authorRole ?? 'client') === 'client',
                }
              : null,
        },
      };
    }),
    /** A new milestone is due after this (the latest due date so far), YYYY-MM-DD. */
    milestonesLastDue: lastDue ? { value: toDateInputValue(lastDue), label: formatDate(lastDue, 'en') } : null,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      milestoneId: task.milestoneId,
      visibleToClient: task.visibleToClient,
      comments: threads[task.id]?.comments ?? [],
      /** The newest comment is a client's: it waits for your reply. */
      waitingForReply: threads[task.id]?.waitingForLead ?? false,
    })),
    messages: presentAdminMessages(project.id, messagePage.messages),
    messagesHasMore: messagePage.hasMore,
    unreadMessages: live.unread,
    /** Where "New messages" starts on this screen: client messages after this instant. */
    adminLastReadAt: project.adminLastReadAt?.toISOString() ?? null,
    /** Compared with GET …/updates by the open screen, which reloads when it changes. */
    liveStamp: live.stamp,
    meetings: presentMeetings(meetings, 'admin', {
      locale: 'en',
      timeZone: getPortalTimeZone(),
      projectId: project.id,
      // Each client's own clock, for scheduling across time zones (known once they have opened the portal).
      otherZones: project.members.flatMap(({ user }) =>
        user.timeZone ? [{ name: displayName(user), timeZone: user.timeZone }] : []
      ),
    }),
    files: files.map((file) => ({
      id: file.id,
      filename: file.filename,
      size: formatBytes(file.fileSize, 'en'),
      mimeType: file.mimeType,
      uploadedAt: formatDateTime(file.createdAt, 'en'),
      uploadedBy: displayName(file.uploadedBy),
      visibleToClient: file.visibleToClient,
    })),
    signOff: presentSignOff(project.status, completion),
    activity: activity.map((entry) => {
      const meta = parseActivityMeta(entry.meta);
      return {
        id: entry.id,
        type: entry.type,
        summary: entry.summary,
        internal: !entry.visibleToClient,
        actor: entry.actor ? displayName(entry.actor) : 'System',
        timeLabel: formatDateTime(entry.createdAt, 'en'),
        emailError: meta.emailSent === false && typeof meta.emailError === 'string' ? meta.emailError : null,
      };
    }),
  };
}

export type AdminProjectView = NonNullable<Awaited<ReturnType<typeof buildAdminProjectView>>>;

export type SignOffState = 'unanswered' | 'not_yet' | 'confirmed' | 'reviewed';

/**
 * The end-of-project sign-off on the admin screen: the latest round (open
 * while the project is Completed) with each client's answer, or null when the
 * project was never completed.
 */
function presentSignOff(status: string, { rounds, members }: Awaited<ReturnType<typeof getAdminCompletion>>) {
  const latest = rounds[0];
  if (!latest) return null;
  const open = status === 'completed' && !latest.closedAt;
  const answered = new Map(latest.responses.map((r) => [r.userId, r]));
  const people = [
    ...members.map((member) => ({ userId: member.userId, name: displayName(member.user), response: answered.get(member.userId) })),
    // Answers from clients who have since left the project.
    ...latest.responses
      .filter((r) => !members.some((m) => m.userId === r.userId))
      .map((r) => ({ userId: r.userId, name: reviewerLabel(r), response: r })),
  ];
  return {
    open,
    openedLabel: formatDateTime(latest.openedAt, 'en'),
    closedLabel: latest.closedAt ? formatDateTime(latest.closedAt, 'en') : null,
    clients: people.map(({ userId, name, response }) => {
      const state: SignOffState = !response
        ? 'unanswered'
        : response.submittedAt
          ? 'reviewed'
          : response.completion === 'not_yet'
            ? 'not_yet'
            : 'confirmed';
      return {
        key: userId ?? response?.id ?? name,
        name,
        state,
        missingNote: response?.completion === 'not_yet' ? response.missingNote : '',
        when: response ? formatDateTime(response.submittedAt ?? response.answeredAt, 'en') : null,
        reviewId: response?.submittedAt ? response.id : null,
        overall: response?.submittedAt ? response.overall : null,
      };
    }),
    /** Submitted reviews from earlier completions of this project. */
    earlierReviews: rounds.slice(1).reduce((sum, round) => sum + round.responses.filter((r) => r.submittedAt).length, 0),
  };
}
