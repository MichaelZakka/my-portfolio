'use client';

import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileText, MessageCircle } from 'lucide-react';
import { initials, layoutThread } from '../../../../lib/portal/chat';
import { ACTIVITY_CATEGORIES, activityCategory } from '../../../../lib/portal/constants';
import { useProjectTabs } from './ProjectTabs';
import type { ClientActivity, ClientFile, ClientMeeting, ClientMessage } from '../../../../lib/portal/present';
import FileUploadForm from './FileUploadForm';
import ReplyForm from './ReplyForm';
import styles from '../../../portal.module.css';

/**
 * Messages, files and activity change while the client is on the page, so
 * they live in client state: the server renders the first version, and after
 * a client posts or uploads, the sections re-read the authorized portal APIs.
 * router.refresh() is deliberately not used: on Next 16.1.1 it silently skips
 * applying a refresh whose response arrives within a few milliseconds (as on
 * localhost), so the new message would not appear.
 */

type LiveData = {
  messages: ClientMessage[];
  files: ClientFile[];
  activity: ClientActivity[];
  meetings: ClientMeeting[];
};
type Section = keyof LiveData;
type Live = { data: LiveData; refresh: (sections: Section[]) => Promise<void> };

const LiveContext = createContext<Live | null>(null);

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) throw new Error('Live sections must be rendered inside <LiveProvider>.');
  return live;
}

export function LiveProvider({
  projectId,
  initial,
  children,
}: {
  projectId: string;
  initial: LiveData;
  children: ReactNode;
}) {
  const [data, setData] = useState(initial);
  // Per-section request counters: a slower, older response never overwrites a newer one.
  const latest = useRef<Record<Section, number>>({ messages: 0, files: 0, activity: 0, meetings: 0 });

  const refresh = useCallback(
    async (sections: Section[]) => {
      await Promise.all(
        sections.map(async (section) => {
          const ticket = ++latest.current[section];
          const response = await fetch(`/api/portal/projects/${projectId}/${section}`, { cache: 'no-store' });
          if (response.status === 401) {
            window.location.assign('/portal/login?expired=1');
            return;
          }
          if (response.status === 403 || response.status === 404) {
            window.location.reload(); // access was removed: show the 403/404 page
            return;
          }
          if (!response.ok || ticket !== latest.current[section]) return;
          const body = (await response.json()) as Partial<LiveData>;
          const items = body[section];
          if (items) setData((current) => ({ ...current, [section]: items }));
        })
      );
    },
    [projectId]
  );

  return <LiveContext.Provider value={{ data, refresh }}>{children}</LiveContext.Provider>;
}

/** preview: the admin's read-only "view as client" (no composer, no archived notice). */
export function MessagesSection({
  projectId,
  archived,
  preview = false,
}: {
  projectId: string;
  archived: boolean;
  preview?: boolean;
}) {
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();
  const threadRef = useRef<HTMLOListElement>(null);
  const tabs = useProjectTabs();
  const visible = !tabs || tabs.active === 'messages';
  const items = layoutThread(data.messages, (m) => (m.sender.isYou ? 'you' : `${m.sender.isProjectLead}:${m.sender.name}`));

  // Open at the newest message, and follow new ones.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread && visible) thread.scrollTop = thread.scrollHeight;
  }, [data.messages.length, visible]);

  return (
    <section id="messages" aria-labelledby="messages-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="messages-title" className={styles.sectionTitle}>
        {t('messagesTitle')}
      </h2>
      <div className={styles.chat}>
        {data.messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <MessageCircle size={28} strokeWidth={1.5} aria-hidden="true" />
            <p>{t('messagesEmpty')}</p>
          </div>
        ) : (
          // Focusable so keyboard users can scroll the thread.
          <ol ref={threadRef} className={styles.thread} tabIndex={0} aria-labelledby="messages-title">
            {items.map(({ message, dayLabel, startsGroup, endsGroup }) => {
              const mine = message.sender.isYou;
              const author = mine ? t('you') : message.sender.name;
              return (
                <Fragment key={message.id}>
                  {dayLabel && (
                    <li className={styles.daySeparator}>
                      <span>{dayLabel}</span>
                    </li>
                  )}
                  <li
                    className={`${styles.message} ${mine ? styles.messageMine : ''}`}
                    data-group-start={startsGroup || undefined}
                    data-group-end={endsGroup || undefined}
                  >
                    {!mine && (
                      <span className={styles.avatar} data-lead={message.sender.isProjectLead || undefined} aria-hidden="true">
                        {startsGroup ? initials(message.sender.name) : ''}
                      </span>
                    )}
                    <div className={styles.bubbleStack}>
                      {startsGroup && !mine ? (
                        <span className={styles.messageAuthor} dir="auto">
                          {author}
                          {message.sender.isProjectLead && <span className={styles.messageRole}>{t('projectLead')}</span>}
                        </span>
                      ) : (
                        <span className="visually-hidden">{author}: </span>
                      )}
                      <p className={styles.bubble} dir="auto">
                        {message.content}
                      </p>
                      <time
                        className={endsGroup ? styles.messageTime : 'visually-hidden'}
                        dateTime={message.createdAt}
                        title={message.timeLabel}
                      >
                        {message.time}
                      </time>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
        {archived ? (
          <p className={styles.chatClosed}>{t('replyDisabledArchived')}</p>
        ) : (
          !preview && <ReplyForm projectId={projectId} onSent={() => refresh(['messages', 'activity'])} />
        )}
      </div>
    </section>
  );
}

export function FilesSection({
  projectId,
  archived,
  preview = false,
  upload,
}: {
  projectId: string;
  archived: boolean;
  preview?: boolean;
  upload: { maxBytes: number; maxSizeLabel: string; accept: string };
}) {
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();

  return (
    <section id="files" aria-labelledby="files-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="files-title" className={styles.sectionTitle}>
        {t('filesTitle')}
      </h2>
      {data.files.length === 0 ? (
        <p className={styles.empty}>{t('filesEmpty')}</p>
      ) : (
        <ul className={styles.fileList}>
          {data.files.map((file) => (
            <li key={file.id} className={styles.fileItem}>
              <FileText size={22} strokeWidth={1.75} aria-hidden="true" className={styles.fileIcon} />
              <div className={styles.fileInfo}>
                <span className={styles.fileName} dir="auto">
                  {file.filename}
                </span>
                <span className={styles.fileMeta}>
                  {t('fileMeta', { size: file.sizeLabel, name: file.uploadedBy.name, date: file.dateLabel })}
                </span>
              </div>
              <a
                href={file.downloadUrl}
                className={styles.iconButton}
                aria-label={t('downloadFile', { name: file.filename })}
                download
              >
                <Download size={18} strokeWidth={2} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {!archived && !preview && (
        <FileUploadForm projectId={projectId} {...upload} onUploaded={() => refresh(['files', 'activity'])} />
      )}
    </section>
  );
}

export function ActivitySection() {
  const t = useTranslations('portal.project');
  const categories = useTranslations('portal.activityCategories');
  const { data } = useLive();

  return (
    <section id="activity" aria-labelledby="activity-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="activity-title" className={styles.sectionTitle}>
        {t('activityTitle')}
      </h2>
      {data.activity.length === 0 ? (
        <p className={styles.empty}>{t('activityEmpty')}</p>
      ) : (
        <ol className={styles.activityList}>
          {data.activity.map((entry) => {
            const category = activityCategory(entry.type);
            return (
              <li key={entry.id} className={styles.activityItem} data-category={category}>
                <span className={styles.activityDot} aria-hidden="true" />
                <div>
                  <span dir="auto">{entry.text}</span>
                  <span className={styles.activityMeta}>
                    <span className={styles.activityTag}>{categories(category)}</span>
                    <time className={styles.activityTime} dateTime={entry.createdAt}>
                      {entry.timeLabel}
                    </time>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className={styles.activityLegend}>
        <h3 className={styles.activityLegendTitle}>{t('activityLegend')}</h3>
        <ul>
          {ACTIVITY_CATEGORIES.map((category) => (
            <li key={category} data-category={category}>
              <span className={styles.activityDot} aria-hidden="true" />
              {categories(category)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
