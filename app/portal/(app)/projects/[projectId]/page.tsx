import type { Metadata } from 'next';
import Link from 'next/link';
import { forbidden, notFound, redirect } from 'next/navigation';
import { ArrowLeft, Circle, CircleCheck, CircleDot } from 'lucide-react';
import { getClientProjectAccess } from '../../../../lib/portal/access';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes, formatDate } from '../../../../lib/portal/format';
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
import { ActivitySection, FilesSection, LiveProvider, MessagesSection } from './LiveSections';
import styles from '../../../portal.module.css';

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const user = await getPortalUser();
  // Never put another client's project name in the <title>.
  const access = user ? await getClientProjectAccess(user.id, projectId) : null;
  return access?.status === 'ok' ? { title: access.project.name } : {};
}

const TASK_ICONS = { todo: Circle, in_progress: CircleDot, done: CircleCheck } as const;

export default async function PortalProjectPage({ params }: Props) {
  const { projectId } = await params;
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const access = await getClientProjectAccess(user.id, projectId);
  if (access.status === 'not_found') notFound();
  if (access.status === 'forbidden') forbidden();

  const [project, messages, files, activity, labels] = await Promise.all([
    getClientProjectDetail(projectId),
    getProjectMessages(projectId),
    getProjectFiles(projectId, { clientView: true }),
    getProjectActivity(projectId, { clientView: true }),
    getPortalTranslations('portal'),
  ]);
  if (!project) notFound();
  const { t, locale } = labels;

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

      <nav aria-label={t('project.sectionsNav')} className={styles.sectionNav}>
        <a href="#milestones">{t('project.milestonesTitle')}</a>
        <a href="#messages">{t('project.messagesTitle')}</a>
        <a href="#files">{t('project.filesTitle')}</a>
        <a href="#activity">{t('project.activityTitle')}</a>
      </nav>

      <LiveProvider
        projectId={project.id}
        initial={{
          messages: presentMessages(messages, user.id, { locale }),
          files: presentFiles(files, project.id, { locale }),
          activity: presentActivity(activity, labels),
        }}
      >
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

            <MessagesSection projectId={project.id} archived={archived} />
          </div>

          <div className={styles.stack}>
            <FilesSection
              projectId={project.id}
              archived={archived}
              upload={{
                maxBytes: getMaxUploadBytes(),
                maxSizeLabel: formatBytes(getMaxUploadBytes(), locale),
                accept: ACCEPT_ATTRIBUTE,
              }}
            />
            <ActivitySection />
          </div>
        </div>
      </LiveProvider>
    </>
  );
}
