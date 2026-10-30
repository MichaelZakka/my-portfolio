import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate, formatDateTime } from '../../../lib/portal/format';
import { getPortalTranslations } from '../../../lib/portal/locale';
import { listClientProjects } from '../../../lib/portal/queries';
import { getPortalUser } from '../../../lib/portal/session';
import ProgressBar from '../../_components/ProgressBar';
import styles from '../../portal.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('projects') };
}

type Project = Awaited<ReturnType<typeof listClientProjects>>[number];

export default async function PortalProjectsPage() {
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const { t, locale } = await getPortalTranslations('portal');
  const projects = await listClientProjects(user.id);
  const active = projects.filter((p) => !p.archivedAt);
  const archived = projects.filter((p) => p.archivedAt);

  const card = (project: Project) => (
    <li key={project.id} className={`${styles.card} ${styles.projectCard}`}>
      <div className={styles.titleRow}>
        <span className={styles.badge} data-tone={project.archivedAt ? 'archived' : project.status}>
          {project.archivedAt ? t('projects.archivedBadge') : t(`status.${project.status}`)}
        </span>
      </div>
      <h2 className={styles.projectCardTitle}>
        <Link href={`/portal/projects/${project.id}`} className={styles.projectCardLink}>
          {project.name}
        </Link>
      </h2>
      {project.summary && <p className={styles.muted}>{project.summary.slice(0, 180)}</p>}
      <ProgressBar
        percent={project.progress}
        label={t('project.progressAria')}
        caption={
          project.milestoneCount
            ? t('projects.progress', { percent: project.progress })
            : t('projects.noMilestones')
        }
      />
      <div className={styles.metaList}>
        {project.currentPhase && <span>{t('projects.phase', { phase: project.currentPhase })}</span>}
        {project.estimatedCompletion && (
          <span>{t('projects.eta', { date: formatDate(project.estimatedCompletion, locale) })}</span>
        )}
        <span>{t('projects.updated', { date: formatDateTime(project.updatedAt, locale) })}</span>
      </div>
    </li>
  );

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('projects.title')}</h1>
        <p className={styles.pageSubtitle}>{t('projects.subtitle')}</p>
      </div>

      {projects.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyPanel}`}>
          <h2>{t('projects.emptyTitle')}</h2>
          <p className={styles.muted}>{t('projects.emptyText')}</p>
        </div>
      ) : (
        <>
          {active.length > 0 && <ul className={styles.projectGrid}>{active.map(card)}</ul>}
          {archived.length > 0 && (
            <section aria-labelledby="archived-projects">
              <h2 id="archived-projects" className={styles.archivedHeading}>
                {t('projects.archivedTitle')}
              </h2>
              <ul className={styles.projectGrid}>{archived.map(card)}</ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
