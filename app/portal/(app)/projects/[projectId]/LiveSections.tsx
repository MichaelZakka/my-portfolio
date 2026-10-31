'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileText } from 'lucide-react';
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

export function MessagesSection({ projectId, archived }: { projectId: string; archived: boolean }) {
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();

  return (
    <section id="messages" aria-labelledby="messages-title" className={`${styles.card} ${styles.section}`}>
      <h2 id="messages-title" className={styles.sectionTitle}>
        {t('messagesTitle')}
      </h2>
      {data.messages.length === 0 ? (
        <p className={styles.empty}>{t('messagesEmpty')}</p>
      ) : (
        <ol className={styles.thread}>
          {data.messages.map((message) => (
            <li key={message.id} className={`${styles.message} ${message.sender.isYou ? styles.messageMine : ''}`}>
              <div className={styles.messageHead}>
                <span className={styles.messageAuthor} dir="auto">
                  {message.sender.isYou ? t('you') : message.sender.name}
                </span>
                {message.sender.isProjectLead && <span className={styles.messageRole}>{t('projectLead')}</span>}
                <time className={styles.messageTime} dateTime={message.createdAt}>
                  {message.timeLabel}
                </time>
              </div>
              <p className={styles.messageBody} dir="auto">
                {message.content}
              </p>
            </li>
          ))}
        </ol>
      )}
      {archived ? (
        <p className={styles.empty}>{t('replyDisabledArchived')}</p>
      ) : (
        <ReplyForm projectId={projectId} onSent={() => refresh(['messages', 'activity'])} />
      )}
    </section>
  );
}

export function FilesSection({
  projectId,
  archived,
  upload,
}: {
  projectId: string;
  archived: boolean;
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
      {!archived && (
        <FileUploadForm projectId={projectId} {...upload} onUploaded={() => refresh(['files', 'activity'])} />
      )}
    </section>
  );
}

export function ActivitySection() {
  const t = useTranslations('portal.project');
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
          {data.activity.map((entry) => (
            <li key={entry.id} className={styles.activityItem}>
              <span className={styles.activityDot} aria-hidden="true" />
              <div>
                <span dir="auto">{entry.text}</span>
                <time className={styles.activityTime} dateTime={entry.createdAt}>
                  {entry.timeLabel}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
