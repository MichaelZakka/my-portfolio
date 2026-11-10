import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Prisma } from '@prisma/client';
import { Plus } from 'lucide-react';
import { prisma } from '../../../lib/db';
import { requireAdminSession } from '../../../lib/session';
import { progressPercent } from '../../../lib/portal/constants';
import { adminUnreadByProject } from '../../../lib/portal/messages';
import { PROGRESS_MILESTONE_SELECT } from '../../../lib/portal/queries';
import { ArchivedBadge, ProjectStatusBadge } from '../../_components/ProjectBadges';
import EmptyState from '../../_components/EmptyState';
import { LoadingRegion } from '../../_components/Skeleton';
import styles from '../../admin.module.css';
import projectStyles from './projects.module.css';
import ProjectsTableSkeleton from './ProjectsTableSkeleton';

export const dynamic = 'force-dynamic';

const VIEWS = { active: 'Active', archived: 'Archived', all: 'All' } as const;
type View = keyof typeof VIEWS;

export const metadata: Metadata = { title: 'Projects' };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAdminSession();
  const { view: rawView } = await searchParams;
  const view: View = rawView && rawView in VIEWS ? (rawView as View) : 'active';

  return (
    <div>
      <div className={projectStyles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Projects</h1>
          <p className={styles.pageSubtitle}>Client projects shared through the portal at /portal.</p>
        </div>
        <Link href="/admin/projects/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          New project
        </Link>
      </div>

      <nav className={projectStyles.viewSwitch} aria-label="Project filters">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <Link
            key={key}
            href={key === 'active' ? '/admin/projects' : `/admin/projects?view=${key}`}
            className={`${styles.button} ${key === view ? styles.buttonPrimary : styles.buttonSecondary}`}
            aria-current={key === view ? 'page' : undefined}
          >
            {VIEWS[key]}
          </Link>
        ))}
      </nav>

      {/* Keyed on the view so switching it shows the skeleton instead of the old list */}
      <Suspense
        key={view}
        fallback={
          <LoadingRegion label="Loading projects…" fade={false}>
            <ProjectsTableSkeleton />
          </LoadingRegion>
        }
      >
        <ProjectsTable view={view} />
      </Suspense>
    </div>
  );
}

async function ProjectsTable({ view }: { view: View }) {
  const where: Prisma.ProjectWhereInput =
    view === 'active' ? { archivedAt: null } : view === 'archived' ? { archivedAt: { not: null } } : {};

  const unread = await adminUnreadByProject();
  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      milestones: { select: PROGRESS_MILESTONE_SELECT },
      members: { select: { user: { select: { name: true, email: true } } } },
      invitations: {
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { email: true },
      },
    },
  });

  return (
    <div className={styles.card}>
      {projects.length === 0 ? (
        <EmptyState
          title={view === 'archived' ? 'No archived projects' : 'No projects yet'}
          description="Create one here, or open a request and choose “Convert to project”."
        />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Clients</th>
                <th>Status</th>
                <th>Phase</th>
                <th>Progress</th>
                <th>Est. completion</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const progress = progressPercent(project.milestones);
                const unreadCount = unread.get(project.id) ?? 0;
                return (
                  <tr key={project.id}>
                    <td data-label="Project">
                      <Link href={`/admin/projects/${project.id}`} className={projectStyles.itemTitle}>
                        {project.name}
                      </Link>
                      {(project.archivedAt || unreadCount > 0) && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {project.archivedAt && <ArchivedBadge />}
                          {unreadCount > 0 && (
                            <Link
                              href={`/admin/projects/${project.id}?tab=messages`}
                              className={`${styles.badge} ${styles.badgeContacted}`}
                            >
                              {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
                            </Link>
                          )}
                        </div>
                      )}
                    </td>
                    <td data-label="Clients">
                      {project.members.length === 0 && project.invitations.length === 0 && '—'}
                      {project.members.map(({ user }) => (
                        <div key={user.email}>{user.name || user.email}</div>
                      ))}
                      {project.invitations.map((invitation) => (
                        <div key={invitation.email} className={projectStyles.muted}>
                          {invitation.email} (invited)
                        </div>
                      ))}
                    </td>
                    <td data-label="Status">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td data-label="Phase">{project.currentPhase || '—'}</td>
                    <td data-label="Progress">
                      <div className={projectStyles.progress}>
                        <div className={projectStyles.progressTrack}>
                          <div className={projectStyles.progressFill} style={{ width: `${progress}%` }} />
                        </div>
                        <span>{project.milestones.length ? `${progress}%` : '—'}</span>
                      </div>
                    </td>
                    <td data-label="Est. completion">
                      {project.estimatedCompletion
                        ? project.estimatedCompletion.toLocaleDateString(undefined, { timeZone: 'UTC' })
                        : '—'}
                    </td>
                    <td data-label="Updated">{project.updatedAt.toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
