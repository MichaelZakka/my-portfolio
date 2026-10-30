import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { parseActivityMeta } from '../../../../lib/portal/activity';
import { invitationState } from '../../../../lib/portal/constants';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes, formatDate, formatDateTime, toDateInputValue } from '../../../../lib/portal/format';
import {
  displayName,
  getAdminProjectDetail,
  getProjectActivity,
  getProjectFiles,
  getProjectMessages,
} from '../../../../lib/portal/queries';
import { idSchema } from '../../../../lib/portal/validation';
import { ArchivedBadge, ProjectStatusBadge } from '../../../_components/ProjectBadges';
import ClientAccessPanel from './ClientAccessPanel';
import FilesPanel from './FilesPanel';
import MessagesPanel from './MessagesPanel';
import MilestonesPanel from './MilestonesPanel';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import TasksPanel from './TasksPanel';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ projectId: string }> };

const fmt = (date: Date | null) => (date ? formatDateTime(date, 'en') : null);

export default async function AdminProjectPage({ params }: Params) {
  const { projectId } = await params;
  if (!idSchema.safeParse(projectId).success) notFound();

  const [project, messages, files, activity] = await Promise.all([
    getAdminProjectDetail(projectId),
    getProjectMessages(projectId),
    getProjectFiles(projectId, { clientView: false }),
    getProjectActivity(projectId, { clientView: false }),
  ]);
  if (!project) notFound();

  const done = project.milestones.filter((m) => m.status === 'done').length;

  return (
    <div>
      <Link href="/admin/projects" className={projectStyles.backLink}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        Back to projects
      </Link>

      <div className={projectStyles.headerRow}>
        <div>
          <div className={projectStyles.titleRow}>
            <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
            {project.archivedAt && <ArchivedBadge />}
          </div>
          <p className={styles.pageSubtitle} style={{ marginTop: '0.4rem' }}>
            {project.currentPhase ? `Phase: ${project.currentPhase} · ` : ''}
            {project.milestones.length
              ? `${project.progress}% (${done}/${project.milestones.length} milestones done)`
              : 'No milestones yet'}
            {project.estimatedCompletion ? ` · ETA ${formatDate(project.estimatedCompletion, 'en')}` : ''}
          </p>
          {project.request && (
            <p className={projectStyles.muted} style={{ marginTop: '0.4rem' }}>
              From request{' '}
              <Link href={`/admin/requests/${project.request.id}`} className={styles.link}>
                {project.request.projectTitle || project.request.clientName}
              </Link>
            </p>
          )}
        </div>
        <a href={`/portal/projects/${project.id}`} className={`${styles.button} ${styles.buttonSecondary}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} aria-hidden="true" />
          Client view (needs a client login)
        </a>
      </div>

      <div className={styles.grid2}>
        <div>
          <MilestonesPanel
            projectId={project.id}
            milestones={project.milestones.map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              status: m.status,
              dueDate: toDateInputValue(m.dueDate),
              dueLabel: m.dueDate ? formatDate(m.dueDate, 'en') : null,
              completedLabel: m.status === 'done' && m.completedAt ? formatDate(m.completedAt, 'en') : null,
            }))}
          />
          <TasksPanel
            projectId={project.id}
            milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))}
            tasks={project.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              milestoneId: task.milestoneId,
              visibleToClient: task.visibleToClient,
            }))}
          />
          <MessagesPanel
            projectId={project.id}
            messages={messages.map((message) => ({
              id: message.id,
              content: message.content,
              sentAt: formatDateTime(message.createdAt, 'en'),
              senderName: displayName(message.sender),
              fromAdmin: message.sender.role === 'admin',
              emailSent: message.emailSent,
              emailError: message.emailError,
            }))}
          />
          <FilesPanel
            projectId={project.id}
            maxBytes={getMaxUploadBytes()}
            maxSizeLabel={formatBytes(getMaxUploadBytes(), 'en')}
            accept={ACCEPT_ATTRIBUTE}
            files={files.map((file) => ({
              id: file.id,
              filename: file.filename,
              size: formatBytes(file.fileSize, 'en'),
              uploadedAt: formatDateTime(file.createdAt, 'en'),
              uploadedBy: displayName(file.uploadedBy),
              visibleToClient: file.visibleToClient,
            }))}
          />
        </div>

        <div>
          <ProjectSettingsPanel
            project={{
              id: project.id,
              name: project.name,
              summary: project.summary,
              status: project.status,
              currentPhase: project.currentPhase,
              estimatedCompletion: toDateInputValue(project.estimatedCompletion),
              archived: Boolean(project.archivedAt),
            }}
          />
          <ClientAccessPanel
            projectId={project.id}
            members={project.members.map((member) => ({
              id: member.id,
              name: member.user.name,
              email: member.user.email,
              activated: member.user.activated,
              lastLogin: fmt(member.user.lastLoginAt),
            }))}
            invitations={project.invitations.map((invitation) => ({
              id: invitation.id,
              email: invitation.email,
              state: invitationState(invitation),
              lastSent: fmt(invitation.lastSentAt),
              expires: formatDateTime(invitation.expiresAt, 'en'),
              emailSent: invitation.emailSent,
              emailError: invitation.emailError,
            }))}
          />

          <section className={styles.card} aria-labelledby="activity-title">
            <div className={styles.cardHeader}>
              <h2 id="activity-title" className={styles.cardTitle}>
                Activity
              </h2>
              <span className={styles.cardMeta}>Internal entries are hidden from the client</span>
            </div>
            {activity.length === 0 ? (
              <p className={projectStyles.muted}>No activity yet.</p>
            ) : (
              <ol className={styles.timeline}>
                {activity.map((entry) => {
                  const meta = parseActivityMeta(entry.meta);
                  const emailError =
                    meta.emailSent === false && typeof meta.emailError === 'string' ? meta.emailError : null;
                  return (
                    <li key={entry.id} className={styles.timelineItem}>
                      <span className={styles.timelineDot} aria-hidden="true" />
                      <span>
                        {entry.summary}{' '}
                        {!entry.visibleToClient && <span className={projectStyles.internalTag}>Internal</span>}
                        <span className={projectStyles.muted} style={{ display: 'block' }}>
                          {entry.actor ? displayName(entry.actor) : 'System'} · {formatDateTime(entry.createdAt, 'en')}
                        </span>
                        {emailError && (
                          <span className={projectStyles.errorText} style={{ display: 'block' }}>
                            Email not sent: {emailError}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
