import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { Plus } from 'lucide-react';
import { prisma } from '../../../lib/db';
import { progressPercent } from '../../../lib/portal/constants';
import { ArchivedBadge, ProjectStatusBadge } from '../../_components/ProjectBadges';
import EmptyState from '../../_components/EmptyState';
import styles from '../../admin.module.css';
import projectStyles from './projects.module.css';

export const dynamic = 'force-dynamic';

const VIEWS = { active: 'Active', archived: 'Archived', all: 'All' } as const;
type View = keyof typeof VIEWS;

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: View = rawView && rawView in VIEWS ? (rawView as View) : 'active';
  const where: Prisma.ProjectWhereInput =
    view === 'active' ? { archivedAt: null } : view === 'archived' ? { archivedAt: { not: null } } : {};

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      milestones: { select: { status: true } },
      members: { select: { user: { select: { name: true, email: true } } } },
      invitations: {
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { email: true },
      },
    },
  });

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

      <nav className={styles.filtersBar} aria-label="Project filters">
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

      <div className={styles.card}>
        {projects.length === 0 ? (
          <EmptyState
            title={view === 'archived' ? 'No archived projects' : 'No projects yet'}
            description="Create one here, or open a request and choose “Convert to project”."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                  return (
                    <tr key={project.id}>
                      <td>
                        <Link href={`/admin/projects/${project.id}`} className={projectStyles.itemTitle}>
                          {project.name}
                        </Link>
                        {project.archivedAt && (
                          <div style={{ marginTop: 4 }}>
                            <ArchivedBadge />
                          </div>
                        )}
                      </td>
                      <td>
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
                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td>{project.currentPhase || '—'}</td>
                      <td>
                        <div className={projectStyles.progress}>
                          <div className={projectStyles.progressTrack}>
                            <div className={projectStyles.progressFill} style={{ width: `${progress}%` }} />
                          </div>
                          <span>{project.milestones.length ? `${progress}%` : '—'}</span>
                        </div>
                      </td>
                      <td>
                        {project.estimatedCompletion
                          ? project.estimatedCompletion.toLocaleDateString(undefined, { timeZone: 'UTC' })
                          : '—'}
                      </td>
                      <td>{project.updatedAt.toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
