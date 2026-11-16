import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarDays,
  FileText,
  Flag,
  FolderKanban,
  Inbox,
  MessageCircle,
  Paperclip,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { requireAdminSession } from '../../../lib/session';
import { getAdminNotices, getNoticesSeenAt, type AdminNotice } from '../../../lib/notices';
import { formatDayLabel, formatTime } from '../../../lib/portal/format';
import EmptyState from '../../_components/EmptyState';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';
import MarkSeen from './MarkSeen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Notifications' };

const ICONS: Record<AdminNotice['kind'], LucideIcon> = {
  request: Inbox,
  message: MessageCircle,
  milestones: Flag,
  meetings: CalendarDays,
  files: Paperclip,
  clients: UserRound,
  project: FolderKanban,
  proposal: FileText,
  problem: TriangleAlert,
};

export default async function NotificationsPage() {
  await requireAdminSession();
  // The cut-off is read before MarkSeen moves it, so this render still shows the "New" chips
  const [seenAt, notices] = await Promise.all([getNoticesSeenAt(), getAdminNotices(50)]);

  const days: { label: string; items: AdminNotice[] }[] = [];
  for (const notice of notices) {
    const label = formatDayLabel(notice.at, 'en');
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(notice);
    else days.push({ label, items: [notice] });
  }

  return (
    <div>
      <MarkSeen />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Notifications</h1>
        <p className={styles.pageSubtitle}>
          New requests, client activity on projects, proposal answers and site problems — newest first.
        </p>
      </div>

      {notices.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="New project requests and client activity will show up here."
        />
      ) : (
        <div className={pageStyles.feed}>
          {days.map((day) => (
            <section key={day.label} className={pageStyles.day} aria-label={day.label}>
              <h2 className={pageStyles.dayTitle}>{day.label}</h2>
              <ul className={pageStyles.list}>
                {day.items.map((notice) => {
                  const Icon = ICONS[notice.kind];
                  const isNew = notice.at > seenAt;
                  return (
                    <li key={notice.id}>
                      <Link
                        href={notice.href}
                        className={pageStyles.item}
                        data-tone={notice.tone}
                        {...(isNew ? { 'data-new': '' } : {})}
                      >
                        <span className={pageStyles.icon} aria-hidden="true">
                          <Icon size={17} strokeWidth={2} />
                        </span>
                        <span className={pageStyles.body}>
                          <span className={pageStyles.titleRow}>
                            <span className={pageStyles.title}>{notice.title}</span>
                            {isNew && <span className={pageStyles.new}>New</span>}
                          </span>
                          <p className={pageStyles.detail}>{notice.detail}</p>
                          {notice.project && (
                            <span className={pageStyles.meta}>
                              <span className={pageStyles.project}>{notice.project}</span>
                            </span>
                          )}
                        </span>
                        <time className={pageStyles.time} dateTime={notice.at.toISOString()}>
                          {formatTime(notice.at, 'en')}
                        </time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className={pageStyles.note}>Showing the latest {notices.length === 50 ? '50 events' : 'events'}.</p>
        </div>
      )}
    </div>
  );
}
