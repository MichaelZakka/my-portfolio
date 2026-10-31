import { parseActivityMeta } from './activity';
import { invitationState } from './constants';
import { getProjectMeetings } from './meetings';
import { presentMeetings } from './present';
import { formatBytes, formatDate, formatDateTime, toDateInputValue } from './format';
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
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      dueDate: toDateInputValue(m.dueDate),
      dueLabel: m.dueDate ? formatDate(m.dueDate, 'en') : null,
      completedLabel: m.status === 'done' && m.completedAt ? formatDate(m.completedAt, 'en') : null,
    })),
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
      senderName: displayName(message.sender),
      fromAdmin: message.sender.role === 'admin',
      emailSent: message.emailSent,
      emailError: message.emailError,
    })),
    meetings: presentMeetings(meetings, 'admin', { locale: 'en' }),
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
