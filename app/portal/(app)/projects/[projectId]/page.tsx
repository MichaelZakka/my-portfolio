import type { Metadata } from 'next';
import Link from 'next/link';
import { forbidden, notFound, redirect } from 'next/navigation';
import { ArrowLeft, Circle, CircleCheck, CircleDot, Download, FileText } from 'lucide-react';
import { getClientProjectAccess } from '../../../../lib/portal/access';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes, formatDate, formatDateTime } from '../../../../lib/portal/format';
import { getPortalTranslations } from '../../../../lib/portal/locale';
import { presentActivity, presentFiles, presentMessages } from '../../../../lib/portal/present';
import {
  getClientProjectDetail,
  getProjectActivity,
  getProjectFiles,
  getProjectMessages,
} from '../../../../lib/portal/queries';
import { getPortalUser } from '../../../../lib/portal/session';
import ProgressBar from '../../../_components/ProgressBar';
import FileUploadForm from './FileUploadForm';
import ReplyForm from './ReplyForm';
import styles from '../../../portal.module.css';

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const user = await getPortalUser();
  // Never put another client's project name in the <title>.
  const access = user ? await getClientProjectAccess(user.id, projectId) : null;
  return access?.status === 'ok' ? { title: access.project.name } : {};
}

/** Placeholders each activity sentence needs; rows missing them (legacy data) use the fallback. */
const ACTIVITY_PARAMS: Record<string, string[]> = {
  INVITE_ACCEPTED: ['name'],
  MILESTONE_CREATED: ['title'],
  MILESTONE_COMPLETED: ['title'],
  TASK_CREATED: ['title'],
  TASK_COMPLETED: ['title'],
  MESSAGE_SENT: ['senderName'],
  FILE_UPLOADED: ['filename'],
  STATUS_CHANGED: ['to'],
};

const TASK_ICONS = { todo: Circle, in_progress: CircleDot, done: CircleCheck } as const;

export default async function PortalProjectPage({ params }: Props) {
  const { projectId } = await params;
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const access = await getClientProjectAccess(user.id, projectId);
  if (access.status === 'not_found') notFound();
  if (access.status === 'forbidden') forbidden();

  const [project, messages, files, activity, { t, locale }] = await Promise.all([
    getClientProjectDetail(projectId),
    getProjectMessages(projectId),
    getProjectFiles(projectId, { clientView: true }),
    getProjectActivity(projectId, { clientView: true }),
    getPortalTranslations('portal'),
  ]);
  if (!project) notFound();

  const archived = Boolean(project.archivedAt);
  const doneMilestones = project.milestones.filter((m) => m.status === 'done').length;
  const statusLabel = (status: string) => (t.has(`status.${status}`) ? t(`status.${status}`) : status);
  const workStatusLabel = (status: string) => (t.has(`workStatus.${status}`) ? t(`workStatus.${status}`) : status);

  const tasksByMilestone = new Map<string, typeof project.tasks>();
  const otherTasks: typeof project.tasks = [];
  for (const task of project.tasks) {
    if (task.milestoneId) {
      tasksByMilestone.set(task.milestoneId, [...(tasksByMilestone.get(task.milestoneId) ?? []), task]);
    } else {
      otherTasks.push(task);
    }
  }

  const renderTask = (task: (typeof project.tasks)[number]) => {
    const Icon = TASK_ICONS[task.status as keyof typeof TASK_ICONS] ?? Circle;
    return (
      <li key={task.id} className={styles.task} data-status={task.status}>
        <Icon size={18} strokeWidth={2} aria-hidden="true" className={styles.taskIcon} />
        <span>
          <span className={styles.taskTitle} dir="auto">
            {task.title}
          </span>
          <span className="visually-hidden"> ({workStatusLabel(task.status)})</span>
          {task.description && (
            <span className={styles.taskDescription} dir="auto">
              {task.description}
            </span>
          )}
        </span>
      </li>
    );
  };

  const activityText = (entry: ReturnType<typeof presentActivity>[number]) => {
    const required = ACTIVITY_PARAMS[entry.type] ?? [];
    if (!t.has(`activity.${entry.type}`) || required.some((key) => !entry.params[key])) {
      return t('activity.fallback');
    }
    const params = { ...entry.params };
    if (params.to) params.to = statusLabel(params.to);
    return t(`activity.${entry.type}`, params);
  };

  return (
    <>
      <Link href="/portal" className={styles.backLink}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" className="flip-rtl" />
        {t('common.backToProjects')}
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle} dir="auto">
            {project.name}
          </h1>
          <span className={styles.badge} data-tone={project.status}>
            {statusLabel(project.status)}
          </span>
          {archived && (
            <span className={styles.badge} data-tone="archived">
              {t('projects.archivedBadge')}
            </span>
          )}
        </div>
        {project.summary && (
          <p className={styles.summary} dir="auto">
            {project.summary}
          </p>
        )}
        {archived && (
          <p className={`${styles.alert} ${styles.alertInfo}`}>{t('project.archivedNotice')}</p>
        )}
      </div>

      <section className={`${styles.card} ${styles.overview}`} aria-label={t('project.progressAria')}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('project.statusLabel')}</span>
          <span className={styles.statValue}>{statusLabel(project.status)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('project.phaseLabel')}</span>
          <span className={styles.statValue} dir="auto">
            {project.currentPhase || t('common.notSet')}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('project.etaLabel')}</span>
          <span className={styles.statValue}>
            {project.estimatedCompletion ? formatDate(project.estimatedCompletion, locale) : t('common.notSet')}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('project.progressLabel')}</span>
          <ProgressBar
            percent={project.progress}
            label={t('project.progressAria')}
            caption={
              project.milestones.length
                ? `${t('projects.progress', { percent: project.progress })} · ${t('project.progressDetail', {
                    done: doneMilestones,
                    total: project.milestones.length,
                  })}`
                : t('project.progressEmpty')
            }
          />
        </div>
      </section>

      <nav aria-label={t('project.sectionsNav')} className={styles.sectionNav}>
        <a href="#milestones">{t('project.milestonesTitle')}</a>
        <a href="#messages">{t('project.messagesTitle')}</a>
        <a href="#files">{t('project.filesTitle')}</a>
        <a href="#activity">{t('project.activityTitle')}</a>
      </nav>

      <div className={styles.projectLayout}>
        <div className={styles.stack}>
          <section id="milestones" aria-labelledby="milestones-title" className={`${styles.card} ${styles.section}`}>
            <h2 id="milestones-title" className={styles.sectionTitle}>
              {t('project.milestonesTitle')}
            </h2>
            {project.milestones.length === 0 ? (
              <p className={styles.empty}>{t('project.milestonesEmpty')}</p>
            ) : (
              <ol className={styles.timeline}>
                {project.milestones.map((milestone) => {
                  const Icon = TASK_ICONS[milestone.status as keyof typeof TASK_ICONS] ?? Circle;
                  const tasks = tasksByMilestone.get(milestone.id) ?? [];
                  return (
                    <li key={milestone.id} className={styles.milestone}>
                      <span className={styles.milestoneDot} data-status={milestone.status} aria-hidden="true">
                        <Icon size={14} strokeWidth={2.5} />
                      </span>
                      <div className={styles.milestoneHead}>
                        <h3 className={styles.milestoneTitle} dir="auto">
                          {milestone.title}
                        </h3>
                        <span className={styles.badge} data-tone={milestone.status}>
                          {workStatusLabel(milestone.status)}
                        </span>
                      </div>
                      {milestone.status === 'done' && milestone.completedAt ? (
                        <p className={styles.milestoneMeta}>
                          {t('project.completedOn', { date: formatDate(milestone.completedAt, locale) })}
                        </p>
                      ) : (
                        milestone.dueDate && (
                          <p className={styles.milestoneMeta}>
                            {t('project.due', { date: formatDate(milestone.dueDate, locale) })}
                          </p>
                        )
                      )}
                      {milestone.description && (
                        <p className={styles.milestoneDescription} dir="auto">
                          {milestone.description}
                        </p>
                      )}
                      {tasks.length > 0 && (
                        <ul
                          className={styles.taskList}
                          aria-label={t('project.tasksForMilestone', { milestone: milestone.title })}
                        >
                          {tasks.map(renderTask)}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {otherTasks.length > 0 && (
              <>
                <h3 className={styles.subheading}>{t('project.otherTasks')}</h3>
                <ul className={styles.taskList}>{otherTasks.map(renderTask)}</ul>
              </>
            )}
            {project.milestones.length > 0 && project.tasks.length === 0 && (
              <p className={styles.empty}>{t('project.noTasks')}</p>
            )}
          </section>

          <section id="messages" aria-labelledby="messages-title" className={`${styles.card} ${styles.section}`}>
            <h2 id="messages-title" className={styles.sectionTitle}>
              {t('project.messagesTitle')}
            </h2>
            {messages.length === 0 ? (
              <p className={styles.empty}>{t('project.messagesEmpty')}</p>
            ) : (
              <ol className={styles.thread}>
                {presentMessages(messages, user.id).map((message) => (
                  <li
                    key={message.id}
                    className={`${styles.message} ${message.sender.isYou ? styles.messageMine : ''}`}
                  >
                    <div className={styles.messageHead}>
                      <span className={styles.messageAuthor} dir="auto">
                        {message.sender.isYou ? t('project.you') : message.sender.name}
                      </span>
                      {message.sender.isProjectLead && (
                        <span className={styles.messageRole}>{t('project.projectLead')}</span>
                      )}
                      <time className={styles.messageTime} dateTime={message.createdAt.toISOString()}>
                        {formatDateTime(message.createdAt, locale)}
                      </time>
                    </div>
                    <p className={styles.messageBody} dir="auto">
                      {message.content}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {archived ? (
              <p className={styles.empty}>{t('project.replyDisabledArchived')}</p>
            ) : (
              <ReplyForm projectId={project.id} />
            )}
          </section>
        </div>

        <div className={styles.stack}>
          <section id="files" aria-labelledby="files-title" className={`${styles.card} ${styles.section}`}>
            <h2 id="files-title" className={styles.sectionTitle}>
              {t('project.filesTitle')}
            </h2>
            {files.length === 0 ? (
              <p className={styles.empty}>{t('project.filesEmpty')}</p>
            ) : (
              <ul className={styles.fileList}>
                {presentFiles(files, project.id).map((file) => (
                  <li key={file.id} className={styles.fileItem}>
                    <FileText size={22} strokeWidth={1.75} aria-hidden="true" className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName} dir="auto">
                        {file.filename}
                      </span>
                      <span className={styles.fileMeta}>
                        {t('project.fileMeta', {
                          size: formatBytes(file.fileSize, locale),
                          name: file.uploadedBy.name,
                          date: formatDate(file.createdAt, locale),
                        })}
                      </span>
                    </div>
                    <a
                      href={file.downloadUrl}
                      className={styles.iconButton}
                      aria-label={t('project.downloadFile', { name: file.filename })}
                      download
                    >
                      <Download size={18} strokeWidth={2} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!archived && (
              <FileUploadForm
                projectId={project.id}
                maxBytes={getMaxUploadBytes()}
                maxSizeLabel={formatBytes(getMaxUploadBytes(), locale)}
                accept={ACCEPT_ATTRIBUTE}
              />
            )}
          </section>

          <section id="activity" aria-labelledby="activity-title" className={`${styles.card} ${styles.section}`}>
            <h2 id="activity-title" className={styles.sectionTitle}>
              {t('project.activityTitle')}
            </h2>
            {activity.length === 0 ? (
              <p className={styles.empty}>{t('project.activityEmpty')}</p>
            ) : (
              <ol className={styles.activityList}>
                {presentActivity(activity).map((entry) => (
                  <li key={entry.id} className={styles.activityItem}>
                    <span className={styles.activityDot} aria-hidden="true" />
                    <div>
                      <span dir="auto">{activityText(entry)}</span>
                      <time className={styles.activityTime} dateTime={entry.createdAt.toISOString()}>
                        {formatDateTime(entry.createdAt, locale)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
