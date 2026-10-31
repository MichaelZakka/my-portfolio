'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, ArrowRight, CalendarClock, FileText, Flag, MessageCircle } from 'lucide-react';
import { useLive } from './LiveSections';
import { useProjectTabs, type ProjectTab } from './ProjectTabs';
import styles from '../../../portal.module.css';

export type MilestoneSummary = {
  done: number;
  total: number;
  current: { title: string; status: string; statusLabel: string; dueLabel: string | null; tasksLeft: number } | null;
};

const SNIPPET_LENGTH = 160;

/** The Overview tab: the project's figures, then a short card per tab with a link into it. */
export default function OverviewPanel({ stats, milestones }: { stats: ReactNode; milestones: MilestoneSummary }) {
  const t = useTranslations('portal.project');
  const status = useTranslations('portal.meetingStatus');
  const { data } = useLive();

  const upcoming = data.meetings.filter((m) => !m.past && m.status !== 'cancelled');
  const awaiting = upcoming.filter((m) => m.canAccept).length;
  const nextMeeting = upcoming[0];
  const lastMessage = data.messages[data.messages.length - 1];

  return (
    <div className={styles.stack}>
      {stats}

      <div className={styles.overviewGrid}>
        <SummaryCard tab="milestones" icon={<Flag size={18} aria-hidden="true" />} title={t('milestonesTitle')}>
          {milestones.total === 0 ? (
            <p className={styles.empty}>{t('milestonesEmpty')}</p>
          ) : milestones.current ? (
            <>
              <p className={styles.summaryKicker}>{t('overviewCurrentMilestone')}</p>
              <p className={styles.summaryTitle} dir="auto">
                {milestones.current.title}
              </p>
              <p className={styles.summaryMeta}>
                <span className={styles.badge} data-tone={milestones.current.status}>
                  {milestones.current.statusLabel}
                </span>
                {milestones.current.dueLabel && <span>{t('due', { date: milestones.current.dueLabel })}</span>}
              </p>
              <p className={styles.summaryMeta}>
                {t('overviewMilestonesDone', { done: milestones.done, total: milestones.total })}
              </p>
            </>
          ) : (
            <p className={styles.summaryTitle}>{t('overviewAllDone')}</p>
          )}
        </SummaryCard>

        <SummaryCard tab="meetings" icon={<CalendarClock size={18} aria-hidden="true" />} title={t('meetingsTitle')}>
          {awaiting > 0 && <p className={styles.summaryAlert}>{t('overviewMeetingsAwaiting', { count: awaiting })}</p>}
          {nextMeeting ? (
            <>
              <p className={styles.summaryKicker}>{t('overviewNextMeeting')}</p>
              <p className={styles.summaryTitle} dir="auto">
                {nextMeeting.title}
              </p>
              <p className={styles.summaryMeta}>
                <span className={styles.badge} data-tone={nextMeeting.status}>
                  {status(nextMeeting.status)}
                </span>
                <time dateTime={nextMeeting.startsAt}>{nextMeeting.whenLabel}</time>
              </p>
            </>
          ) : (
            <p className={styles.empty}>{t('overviewNoMeetings')}</p>
          )}
        </SummaryCard>

        <SummaryCard tab="messages" icon={<MessageCircle size={18} aria-hidden="true" />} title={t('messagesTitle')}>
          {lastMessage ? (
            <>
              <p className={styles.summaryKicker}>{t('overviewLatestMessage')}</p>
              <p className={styles.summaryQuote} dir="auto">
                {lastMessage.content.length > SNIPPET_LENGTH
                  ? `${lastMessage.content.slice(0, SNIPPET_LENGTH).trimEnd()}…`
                  : lastMessage.content}
              </p>
              <p className={styles.summaryMeta}>
                <span dir="auto">{lastMessage.sender.isYou ? t('you') : lastMessage.sender.name}</span>
                <time dateTime={lastMessage.createdAt}>{lastMessage.timeLabel}</time>
              </p>
            </>
          ) : (
            <p className={styles.empty}>{t('overviewNoMessages')}</p>
          )}
        </SummaryCard>

        <SummaryCard tab="files" icon={<FileText size={18} aria-hidden="true" />} title={t('filesTitle')}>
          {data.files.length === 0 ? (
            <p className={styles.empty}>{t('filesEmpty')}</p>
          ) : (
            <>
              <p className={styles.summaryKicker}>{t('overviewFilesCount', { count: data.files.length })}</p>
              <ul className={styles.summaryList}>
                {data.files.slice(0, 3).map((file) => (
                  <li key={file.id}>
                    <span className={styles.summaryListMain} dir="auto">
                      {file.filename}
                    </span>
                    <span className={styles.summaryListSide}>{file.dateLabel}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SummaryCard>

        <SummaryCard
          tab="activity"
          icon={<Activity size={18} aria-hidden="true" />}
          title={t('activityTitle')}
          wide
        >
          {data.activity.length === 0 ? (
            <p className={styles.empty}>{t('activityEmpty')}</p>
          ) : (
            <ul className={styles.summaryList}>
              {data.activity.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <span className={styles.summaryListMain} dir="auto">
                    {entry.text}
                  </span>
                  <time className={styles.summaryListSide} dateTime={entry.createdAt}>
                    {entry.timeLabel}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </SummaryCard>
      </div>
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
  tab: ProjectTab;
  icon: ReactNode;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('portal.project');
  const tabs = useProjectTabs();

  return (
    <section className={`${styles.card} ${styles.summaryCard}`} data-wide={wide || undefined} aria-label={title}>
      <h2 className={styles.summaryHeading}>
        <span className={styles.summaryIcon}>{icon}</span>
        {title}
      </h2>
      <div className={styles.summaryBody}>{children}</div>
      {tabs && (
        <button type="button" className={styles.summaryLink} onClick={() => tabs.select(tab)}>
          {t('overviewViewAll', { section: title })}
          <ArrowRight size={15} aria-hidden="true" className="flip-rtl" />
        </button>
      )}
    </section>
  );
}
