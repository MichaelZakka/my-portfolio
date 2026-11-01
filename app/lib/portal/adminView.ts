import { parseActivityMeta } from './activity';
import { invitationState } from './constants';
import { getProjectMeetings } from './meetings';
import { presentMeetings } from './present';
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
  getProjectFiles,
  getProjectMessages,
} from './queries';

/**
 * Everything the admin project screen shows, with labels already formatted.
 * The page renders it on the server and GET /api/admin/projects/[id]/view
 * returns the same shape, which the screen re-reads after every change.
 */
export async function buildAdminProjectView(projectId: string) {
  const [project, messages, files, activity, meetings] = await Promise.all([
    getAdminProjectDetail(projectId),
    getProjectMessages(projectId),
    getProjectFiles(projectId, { clientView: false }),
    getProjectActivity(projectId, { clientView: false }),
    getProjectMeetings(projectId),
  ]);
  if (!project) return null;

  const at = (date: Date | null) => (date ? formatDateTime(date, 'en') : null);

  return {
    project: {
      id: project.id,
      name: project.name,
      summary: project.summary,
      status: project.status,
      currentPhase: project.currentPhase,
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
        },
      };
    }),
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      milestoneId: task.milestoneId,
      visibleToClient: task.visibleToClient,
    })),
    messages: messages.map((message) => ({
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
    })),
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
      uploadedAt: formatDateTime(file.createdAt, 'en'),
      uploadedBy: displayName(file.uploadedBy),
      visibleToClient: file.visibleToClient,
    })),
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
