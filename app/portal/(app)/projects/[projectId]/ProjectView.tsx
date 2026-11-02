import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Circle, CircleCheck, CircleDot } from 'lucide-react';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes, formatDate } from '../../../../lib/portal/format';
import { getPortalTranslations } from '../../../../lib/portal/locale';
import { getProjectMeetings } from '../../../../lib/portal/meetings';
import { presentActivity, presentFiles, presentMeetings, presentMessages } from '../../../../lib/portal/present';
import {
  displayName,
  getClientProjectDetail,
  getMessagePage,
  getProjectActivity,
  getProjectFiles,
} from '../../../../lib/portal/queries';
import { getClientReadState, getClientStamps } from '../../../../lib/portal/messages';
import ProgressBar from '../../../_components/ProgressBar';
import { ActivitySection, FilesSection, LiveProvider, MessagesSection } from './LiveSections';
import { MeetingsSection } from './MeetingsSection';
import MilestoneReviewForm from './MilestoneReviewForm';
import OverviewPanel, { type MilestoneSummary } from './OverviewPanel';
import ProjectTabs from './ProjectTabs';
import { isProjectTab } from './tabs';
import styles from '../../../portal.module.css';

const TASK_ICONS = { todo: Circle, in_progress: CircleDot, done: CircleCheck } as const;

type ProjectViewProps = {
  projectId: string;
  tab?: string;
  /**
   * Whose eyes: the signed-in client, or in the preview the client the admin
   * previews as (id null when the project has no client yet). Times are
   * formatted in this viewer's zone.
   */
  viewer: { id: string | null; timeZone: string };
  /** The admin's read-only "view as client" (/portal/preview/[projectId]): same data, no forms. */
  preview?: boolean;
};

/**
 * The client's project screen, shared by /portal/projects/[projectId] and the
 * admin preview, so the preview can never drift from what clients see.
 * Callers have already checked who may see it.
 */
export default async function ProjectView({ projectId, tab, viewer, preview = false }: ProjectViewProps) {
  // Only a signed-in client's own screen is live (polls, marks messages read); the preview is a snapshot.
  const live = !preview && viewer.id !== null;
  const [project, messagePage, files, activity, meetings, labels, readState, stamps] = await Promise.all([
    getClientProjectDetail(projectId),
    getMessagePage(projectId, { clientView: true }),
    getProjectFiles(projectId, { clientView: true }),
    getProjectActivity(projectId, { clientView: true }),
    getProjectMeetings(projectId),
    getPortalTranslations('portal'),
    viewer.id ? getClientReadState(projectId, viewer.id) : null,
    live && viewer.id ? getClientStamps(projectId, viewer.id) : null,
  ]);
  if (!project) notFound();
  const upload = {
    maxBytes: getMaxUploadBytes(),
    maxSizeLabel: formatBytes(getMaxUploadBytes(), labels.locale),
    accept: ACCEPT_ATTRIBUTE,
  };
  const { t, locale } = labels;

  const archived = Boolean(project.archivedAt);
  const readOnly = archived || preview;
  const api = preview ? 'admin' : 'portal';
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

  // Reviews come newest first (withdrawn ones are left out): the open round, if any, then the last answer.
  const pendingReview = (milestone: (typeof project.milestones)[number]) =>
    milestone.reviews.find((review) => review.status === 'pending');
  const lastAnswer = (milestone: (typeof project.milestones)[number]) =>
    milestone.reviews.find((review) => review.status === 'approved' || review.status === 'changes_requested');
  // An open approval request outranks the work status in badges.
  const milestoneTone = (milestone: (typeof project.milestones)[number]) =>
    pendingReview(milestone) ? 'review' : milestone.status;
  const milestoneLabel = (milestone: (typeof project.milestones)[number]) =>
    pendingReview(milestone) ? t('project.reviewAwaiting') : workStatusLabel(milestone.status);

  const currentMilestone = project.milestones.find((m) => m.status !== 'done');
  const milestoneSummary: MilestoneSummary = {
    done: doneMilestones,
    total: project.milestones.length,
    awaitingApproval: archived ? 0 : project.milestones.filter((m) => pendingReview(m)).length,
    current: currentMilestone
      ? {
          title: currentMilestone.title,
          status: milestoneTone(currentMilestone),
          statusLabel: milestoneLabel(currentMilestone),
          dueLabel: currentMilestone.dueDate ? formatDate(currentMilestone.dueDate, locale) : null,
          tasksLeft: (tasksByMilestone.get(currentMilestone.id) ?? []).filter((task) => task.status !== 'done').length,
        }
      : null,
  };

  const milestoneTitles = new Map(project.milestones.map((m) => [m.id, m.title]));

  // Each task opens in place (native <details>: keyboard and screen-reader friendly, no JS).
  const renderTask = (task: (typeof project.tasks)[number]) => {
    const Icon = TASK_ICONS[task.status as keyof typeof TASK_ICONS] ?? Circle;
    const milestoneTitle = task.milestoneId ? milestoneTitles.get(task.milestoneId) : undefined;
    return (
      <li key={task.id} className={styles.task} data-status={task.status}>
        <details className={styles.taskDetails}>
          <summary className={styles.taskSummary}>
            <Icon size={18} strokeWidth={2} aria-hidden="true" className={styles.taskIcon} />
            <span className={styles.taskTitle} dir="auto">
              {task.title}
            </span>
            <span className={styles.badge} data-tone={task.status}>
              {workStatusLabel(task.status)}
            </span>
          </summary>
          <div className={styles.taskBody}>
            {task.description ? (
              <p className={styles.taskDescription} dir="auto">
                {task.description}
              </p>
            ) : (
              <p className={styles.taskDescription}>{t('project.taskNoDescription')}</p>
            )}
            <dl className={styles.taskMeta}>
              {milestoneTitle && (
                <div>
                  <dt>{t('project.taskMilestone')}</dt>
                  <dd dir="auto">{milestoneTitle}</dd>
                </div>
              )}
              <div>
                <dt>{t('project.statusLabel')}</dt>
                <dd>{workStatusLabel(task.status)}</dd>
              </div>
              <div>
                <dt>{task.status === 'done' && task.completedAt ? t('project.taskCompleted') : t('project.taskUpdated')}</dt>
                <dd>{formatDate(task.status === 'done' && task.completedAt ? task.completedAt : task.updatedAt, locale)}</dd>
              </div>
            </dl>
          </div>
        </details>
      </li>
    );
  };

  return (
    <>
      {!preview && (
        <Link href="/portal" className={styles.backLink}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" className="flip-rtl" />
          {t('common.backToProjects')}
        </Link>
      )}

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

      <LiveProvider
        projectId={project.id}
        live={live}
        stamps={stamps?.stamps ?? null}
        unread={preview ? 0 : (readState?.unread ?? 0)}
        lastReadAt={readState?.lastReadAt?.toISOString() ?? null}
        hasOlderMessages={messagePage.hasMore}
        initial={{
          messages: presentMessages(messagePage.messages, viewer.id, {
            locale,
            timeZone: viewer.timeZone,
            projectId: project.id,
            api,
          }),
          files: presentFiles(files, project.id, { locale, api }),
          activity: presentActivity(activity, { ...labels, timeZone: viewer.timeZone }),
          meetings: presentMeetings(meetings, 'client', { locale, timeZone: viewer.timeZone, projectId: project.id, api }),
        }}
      >
        <ProjectTabs
          initialTab={isProjectTab(tab) ? tab : 'overview'}
          panels={{
            overview: (
              <OverviewPanel
                milestones={milestoneSummary}
                stats={
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
                        ? t('project.progressCaption', {
                            percent: project.progress,
                            done: doneMilestones,
                            total: project.milestones.length,
                          })
                        : t('project.progressEmpty')
                    }
                  />
                </div>
              </section>
                }
              />
            ),
            milestones: (
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
                      const pending = pendingReview(milestone);
                      const answer = pending ? undefined : lastAnswer(milestone);
                      const answeredBy = answer?.respondedBy ? displayName(answer.respondedBy) : '';
                      const answeredOn = answer?.respondedAt ? formatDate(answer.respondedAt, locale) : '';
                      return (
                        <li key={milestone.id} id={`milestone-${milestone.id}`} className={styles.milestone}>
                          <span className={styles.milestoneDot} data-status={milestone.status} aria-hidden="true">
                            <Icon size={14} strokeWidth={2.5} />
                          </span>
                          <div className={styles.milestoneHead}>
                            <h3 className={styles.milestoneTitle} dir="auto">
                              {milestone.title}
                            </h3>
                            <span className={styles.badge} data-tone={milestoneTone(milestone)}>
                              {milestoneLabel(milestone)}
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
                          {answer && (
                            <p className={styles.milestoneMeta}>
                              {answer.status === 'approved'
                                ? t('project.reviewApprovedBy', { name: answeredBy, date: answeredOn })
                                : t('project.reviewChangesBy', { name: answeredBy, date: answeredOn })}
                            </p>
                          )}
                          {milestone.description && (
                            <p className={styles.milestoneDescription} dir="auto">
                              {milestone.description}
                            </p>
                          )}
                          {pending && (
                            <div className={styles.reviewBox}>
                              <p className={styles.reviewTitle}>{t('project.reviewReadyTitle')}</p>
                              <p className={styles.milestoneMeta}>
                                {t('project.reviewSentOn', { date: formatDate(pending.requestedAt, locale) })}
                              </p>
                              {pending.note && (
                                <p className={styles.milestoneDescription} dir="auto">
                                  {pending.note}
                                </p>
                              )}
                              {/^https?:\/\//i.test(pending.link) && (
                                <a href={pending.link} target="_blank" rel="noopener noreferrer" className={styles.textLink}>
                                  {t('project.reviewOpenLink')}
                                </a>
                              )}
                              {!readOnly && (
                                <>
                                  <p className={styles.hint}>{t('project.reviewApproveHint')}</p>
                                  <MilestoneReviewForm projectId={project.id} milestoneId={milestone.id} />
                                </>
                              )}
                            </div>
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
            ),
            meetings: (
              <MeetingsSection
                projectId={project.id}
                archived={archived}
                preview={preview}
                timeZone={viewer.timeZone}
                milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))}
              />
            ),
            messages: <MessagesSection projectId={project.id} archived={archived} preview={preview} upload={upload} />,
            files: (
              <FilesSection
                projectId={project.id}
                archived={archived}
                preview={preview}
                upload={upload}
              />
            ),
            activity: <ActivitySection />,
          }}
        />
      </LiveProvider>
    </>
  );
}
