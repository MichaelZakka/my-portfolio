'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { AdminProjectView as View } from '../../../../lib/portal/adminView';
import { ArchivedBadge, ProjectStatusBadge } from '../../../_components/ProjectBadges';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  activityCategory,
} from '../../../../lib/portal/constants';
import { ProjectViewContext } from '../projectViewContext';
import AdminOverview from './AdminOverview';
import AdminProjectTabs, { type AdminProjectTab } from './AdminProjectTabs';
import ClientAccessPanel from './ClientAccessPanel';
import FilesPanel from './FilesPanel';
import MeetingsPanel from './MeetingsPanel';
import MessagesPanel from './MessagesPanel';
import MilestonesPanel from './MilestonesPanel';
import ProjectSettingsPanel from './ProjectSettingsPanel';
import TasksPanel from './TasksPanel';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Props = {
  initialView: View;
  initialTab: AdminProjectTab;
  upload: { maxBytes: number; maxSizeLabel: string; accept: string };
};

/** The admin project screen. Panels call reload() after a change; the newest response wins. */
export default function AdminProjectView({ initialView, initialTab, upload }: Props) {
  const [view, setView] = useState(initialView);
  const latest = useRef(0);
  const projectId = initialView.project.id;

  const reload = useCallback(async () => {
    const ticket = ++latest.current;
    const response = await fetch(`/api/admin/projects/${projectId}/view`, { cache: 'no-store' });
    if (response.status === 401) {
      window.location.assign('/admin/login');
      return;
    }
    if (!response.ok || ticket !== latest.current) return;
    const body = (await response.json()) as { view: View };
    setView(body.view);
  }, [projectId]);
  const context = useMemo(() => ({ reload }), [reload]);

  const { project } = view;

  return (
    <ProjectViewContext.Provider value={context}>
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
            {project.archived && <ArchivedBadge />}
          </div>
          <p className={styles.pageSubtitle} style={{ marginTop: '0.4rem' }}>
            {project.currentPhase ? `Phase: ${project.currentPhase} · ` : ''}
            {project.milestonesTotal
              ? `${project.progress}% (${project.milestonesDone}/${project.milestonesTotal} milestones done)`
              : 'No milestones yet'}
            {project.etaLabel ? ` · ETA ${project.etaLabel}` : ''}
          </p>
          {project.request && (
            <p className={projectStyles.muted} style={{ marginTop: '0.4rem' }}>
              From request{' '}
              <Link href={`/admin/requests/${project.request.id}`} className={styles.link}>
                {project.request.title}
              </Link>
            </p>
          )}
        </div>
        <a
          href={`/portal/projects/${project.id}`}
          className={`${styles.button} ${styles.buttonSecondary}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Client view (needs a client login)
        </a>
      </div>

      <AdminProjectTabs
        initialTab={initialTab}
        badges={{
          meetings: { value: view.meetings.filter((m) => m.canAccept).length, tone: 'alert' },
          messages: { value: view.messages.length },
          files: { value: view.files.length },
          clients: { value: view.members.length },
          activity: { value: view.activity.filter((a) => a.emailError).length, tone: 'danger' },
        }}
        panels={{
          overview: <AdminOverview view={view} />,
          milestones: (
            <div className={projectStyles.tabColumns}>
              <MilestonesPanel projectId={project.id} milestones={view.milestones} />
              <TasksPanel
                projectId={project.id}
                milestones={view.milestones.map((m) => ({ id: m.id, title: m.title }))}
                tasks={view.tasks}
              />
            </div>
          ),
          meetings: (
            <MeetingsPanel
              projectId={project.id}
              meetings={view.meetings}
              milestones={view.milestones.map((m) => ({ id: m.id, title: m.title }))}
            />
          ),
          messages: <MessagesPanel projectId={project.id} messages={view.messages} />,
          files: <FilesPanel projectId={project.id} files={view.files} {...upload} />,
          clients: (
            <ClientAccessPanel projectId={project.id} members={view.members} invitations={view.invitations} />
          ),
          activity: (
            <section className={styles.card} aria-labelledby="activity-title">
              <div className={styles.cardHeader}>
                <h2 id="activity-title" className={styles.cardTitle}>
                  Activity
                </h2>
                <span className={styles.cardMeta}>Internal entries are hidden from the client</span>
              </div>
              {view.activity.length === 0 ? (
                <p className={projectStyles.muted}>No activity yet.</p>
              ) : (
                <ol className={styles.timeline}>
                  {view.activity.map((entry) => (
                    <li
                      key={entry.id}
                      className={`${styles.timelineItem} ${projectStyles.activityItem}`}
                      data-category={activityCategory(entry.type)}
                    >
                      <span className={projectStyles.activityDot} aria-hidden="true" />
                      <span>
                        <span className={projectStyles.activityTag}>
                          {ACTIVITY_CATEGORY_LABELS[activityCategory(entry.type)]}
                        </span>
                        {entry.summary}{' '}
                        {entry.internal && <span className={projectStyles.internalTag}>Internal</span>}
                        <span className={projectStyles.muted} style={{ display: 'block' }}>
                          {entry.actor} · {entry.timeLabel}
                        </span>
                        {entry.emailError && (
                          <span className={projectStyles.errorText} style={{ display: 'block' }}>
                            Email not sent: {entry.emailError}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <div className={projectStyles.activityLegend}>
                <h3 className={projectStyles.activityLegendTitle}>Colour key</h3>
                <ul>
                  {ACTIVITY_CATEGORIES.map((category) => (
                    <li key={category} data-category={category}>
                      <span className={projectStyles.activityDot} aria-hidden="true" />
                      {ACTIVITY_CATEGORY_LABELS[category]}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ),
          settings: <ProjectSettingsPanel project={project} />,
        }}
      />
    </ProjectViewContext.Provider>
  );
}
