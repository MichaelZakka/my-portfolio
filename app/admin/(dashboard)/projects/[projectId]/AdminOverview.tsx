'use client';

import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileText,
  Flag,
  MessageCircle,
  Users,
} from 'lucide-react';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import { MEETING_STATUS_LABELS, PROJECT_STATUS_LABELS, WORK_STATUS_LABELS } from '../../../../lib/portal/constants';
import { useAdminProjectTabs, type AdminProjectTab } from './AdminProjectTabs';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

const SNIPPET_LENGTH = 180;

const label = <T extends string>(labels: Record<T, string>, value: string) =>
  (labels as Record<string, string>)[value] ?? value;

/** Things waiting on the admin, each linking to the tab where it is handled. */
function attentionItems(view: AdminProjectView) {
  const items: { tab: AdminProjectTab; text: string; danger?: boolean }[] = [];
  const awaiting = view.meetings.filter((m) => m.canAccept).length;
  if (awaiting) {
    items.push({ tab: 'meetings', text: `${awaiting} meeting proposal${awaiting === 1 ? '' : 's'} waiting for your reply` });
  }
  const last = view.messages[view.messages.length - 1];
  if (last && !last.fromAdmin) items.push({ tab: 'messages', text: `${last.senderName} is waiting for a reply` });
  if (view.members.length === 0) {
    const pending = view.invitations.filter((i) => i.state === 'pending').length;
    items.push({
      tab: 'clients',
      text: pending ? 'The client has not accepted the invitation yet' : 'No client has access to this project',
    });
  }
  const expired = view.invitations.filter((i) => i.state === 'expired').length;
  if (expired) items.push({ tab: 'clients', text: `${expired} invitation${expired === 1 ? '' : 's'} expired` });
  const failedEmails = view.activity.filter((a) => a.emailError).length;
  if (failedEmails) {
    items.push({
      tab: 'activity',
      text: `${failedEmails} notification email${failedEmails === 1 ? '' : 's'} not sent`,
      danger: true,
    });
  }
  return items;
}

export default function AdminOverview({ view }: { view: AdminProjectView }) {
  const { project } = view;
  const tabs = useAdminProjectTabs();
  const attention = attentionItems(view);

  const current = view.milestones.find((m) => m.status !== 'done');
  const openTasks = view.tasks.filter((task) => task.status !== 'done');
  const hiddenTasks = view.tasks.filter((task) => !task.visibleToClient).length;
  const upcoming = view.meetings.filter((m) => !m.past && m.status !== 'cancelled');
  const nextMeeting = upcoming[0];
  const lastMessage = view.messages[view.messages.length - 1];
  const pendingInvites = view.invitations.filter((i) => i.state === 'pending');

  return (
    <div>
      <div className={projectStyles.statGrid}>
        <Stat label="Status" value={label(PROJECT_STATUS_LABELS, project.status)} />
        <Stat label="Phase" value={project.currentPhase || '—'} />
        <Stat label="Est. completion" value={project.etaLabel ?? '—'} />
        <div className={projectStyles.stat}>
          <span className={projectStyles.statLabel}>Progress</span>
          <div className={projectStyles.progress}>
            <div className={projectStyles.progressTrack}>
              <div className={projectStyles.progressFill} style={{ width: `${project.progress}%` }} />
            </div>
            <span className={projectStyles.statValue}>{project.progress}%</span>
          </div>
          <span className={projectStyles.muted}>
            {project.milestonesTotal
              ? `${project.milestonesDone} of ${project.milestonesTotal} milestones done`
              : 'No milestones yet'}
          </span>
        </div>
      </div>

      <div className={projectStyles.overviewGrid}>
        <section
          className={`${styles.card} ${projectStyles.summaryCard}`}
          data-wide
          data-tone={attention.length ? 'alert' : 'ok'}
          aria-label="Needs your attention"
        >
          <h2 className={projectStyles.summaryHeading}>
            <span className={projectStyles.summaryIcon}>
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            Needs your attention
          </h2>
          {attention.length === 0 ? (
            <p className={projectStyles.muted}>Nothing is waiting on you. 🎉</p>
          ) : (
            <ul className={projectStyles.attentionList}>
              {attention.map((item) => (
                <li key={item.text} data-danger={item.danger || undefined}>
                  <span>{item.text}</span>
                  {tabs && (
                    <button type="button" className={projectStyles.summaryLink} onClick={() => tabs.select(item.tab)}>
                      Open
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <SummaryCard tab="milestones" icon={<Flag size={16} aria-hidden="true" />} title="Milestones & tasks">
          {view.milestones.length === 0 ? (
            <p className={projectStyles.muted}>No milestones yet. Add the first one to show progress to the client.</p>
          ) : current ? (
            <>
              <p className={projectStyles.summaryKicker}>Current milestone</p>
              <p className={projectStyles.summaryTitle}>{current.title}</p>
              <p className={projectStyles.summaryMeta}>
                {label(WORK_STATUS_LABELS, current.status)}
                {current.dueLabel ? ` · due ${current.dueLabel}` : ''}
              </p>
            </>
          ) : (
            <p className={projectStyles.summaryTitle}>All milestones are done.</p>
          )}
          <p className={projectStyles.summaryMeta}>
            {openTasks.length} open task{openTasks.length === 1 ? '' : 's'}
            {hiddenTasks ? ` · ${hiddenTasks} hidden from the client` : ''}
          </p>
        </SummaryCard>

        <SummaryCard tab="meetings" icon={<CalendarClock size={16} aria-hidden="true" />} title="Meetings">
          {nextMeeting ? (
            <>
              <p className={projectStyles.summaryKicker}>Next meeting</p>
              <p className={projectStyles.summaryTitle}>{nextMeeting.title}</p>
              <p className={projectStyles.summaryMeta}>
                {nextMeeting.whenLabel} · {label(MEETING_STATUS_LABELS, nextMeeting.status)}
              </p>
              {upcoming.length > 1 && (
                <p className={projectStyles.summaryMeta}>+{upcoming.length - 1} more upcoming</p>
              )}
            </>
          ) : (
            <p className={projectStyles.muted}>No upcoming meetings.</p>
          )}
        </SummaryCard>

        <SummaryCard tab="messages" icon={<MessageCircle size={16} aria-hidden="true" />} title="Messages">
          {lastMessage ? (
            <>
              <p className={projectStyles.summaryKicker}>
                Latest · {view.messages.length} message{view.messages.length === 1 ? '' : 's'}
              </p>
              <p className={projectStyles.summaryQuote} dir="auto">
                {lastMessage.content.length > SNIPPET_LENGTH
                  ? `${lastMessage.content.slice(0, SNIPPET_LENGTH).trimEnd()}…`
                  : lastMessage.content}
              </p>
              <p className={projectStyles.summaryMeta}>
                {lastMessage.fromAdmin ? 'You' : lastMessage.senderName} · {lastMessage.sentAt}
              </p>
            </>
          ) : (
            <p className={projectStyles.muted}>No messages yet.</p>
          )}
        </SummaryCard>

        <SummaryCard tab="files" icon={<FileText size={16} aria-hidden="true" />} title="Files">
          {view.files.length === 0 ? (
            <p className={projectStyles.muted}>No files yet.</p>
          ) : (
            <>
              <p className={projectStyles.summaryKicker}>
                {view.files.length} file{view.files.length === 1 ? '' : 's'}
              </p>
              <ul className={projectStyles.summaryList}>
                {view.files.slice(0, 3).map((file) => (
                  <li key={file.id}>
                    <span className={projectStyles.summaryListMain}>
                      {file.filename}
                      {!file.visibleToClient && <span className={projectStyles.internalTag}>Hidden</span>}
                    </span>
                    <span className={projectStyles.summaryListSide}>{file.uploadedBy}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SummaryCard>

        <SummaryCard tab="clients" icon={<Users size={16} aria-hidden="true" />} title="Clients">
          {view.members.length === 0 && pendingInvites.length === 0 ? (
            <p className={projectStyles.muted}>Nobody has been invited yet.</p>
          ) : (
            <ul className={projectStyles.summaryList}>
              {view.members.map((member) => (
                <li key={member.id}>
                  <span className={projectStyles.summaryListMain}>{member.name || member.email}</span>
                  <span className={projectStyles.summaryListSide}>
                    {member.lastLogin ? `seen ${member.lastLogin}` : 'never signed in'}
                  </span>
                </li>
              ))}
              {pendingInvites.map((invitation) => (
                <li key={invitation.id}>
                  <span className={projectStyles.summaryListMain}>{invitation.email}</span>
                  <span className={projectStyles.summaryListSide}>invited</span>
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>

        <SummaryCard tab="activity" icon={<Activity size={16} aria-hidden="true" />} title="Recent activity" wide>
          {view.activity.length === 0 ? (
            <p className={projectStyles.muted}>No activity yet.</p>
          ) : (
            <ul className={projectStyles.summaryList}>
              {view.activity.slice(0, 5).map((entry) => (
                <li key={entry.id}>
                  <span className={projectStyles.summaryListMain}>
                    {entry.summary}
                    {entry.internal && <span className={projectStyles.internalTag}>Internal</span>}
                  </span>
                  <span className={projectStyles.summaryListSide}>{entry.timeLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>
      </div>
    </div>
  );
}

function Stat({ label: name, value }: { label: string; value: string }) {
  return (
    <div className={projectStyles.stat}>
      <span className={projectStyles.statLabel}>{name}</span>
      <span className={projectStyles.statValue}>{value}</span>
    </div>
  );
}

function SummaryCard({
  tab,
  icon,
  title,
  wide,
  children,
}: {
  tab: AdminProjectTab;
  icon: ReactNode;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const tabs = useAdminProjectTabs();
  return (
    <section className={`${styles.card} ${projectStyles.summaryCard}`} data-wide={wide || undefined} aria-label={title}>
      <h2 className={projectStyles.summaryHeading}>
        <span className={projectStyles.summaryIcon}>{icon}</span>
        {title}
      </h2>
      <div className={projectStyles.summaryBody}>{children}</div>
      {tabs && (
        <button type="button" className={projectStyles.summaryLink} onClick={() => tabs.select(tab)}>
          View {title.toLowerCase()}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
