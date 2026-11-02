'use client';

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileText, MessageCircle, Paperclip } from 'lucide-react';
import { initials, layoutThread } from '../../../../lib/portal/chat';
import { ACTIVITY_CATEGORIES, activityCategory } from '../../../../lib/portal/constants';
import { jsonRequest } from '../../../_components/useErrorMessage';
import { useProjectTabs } from './ProjectTabs';
import type { ClientActivity, ClientFile, ClientMeeting, ClientMessage } from '../../../../lib/portal/present';
import FileUploadForm from './FileUploadForm';
import ReplyForm from './ReplyForm';
import styles from '../../../portal.module.css';

/**
 * Messages, files, meetings and activity change while the page is open, so
 * they live in client state: the server renders the first version, then the
 * page polls cheap stamps (GET …/updates, every 15 s while the tab is
 * visible, and at once when it becomes visible again) and re-reads only the
 * sections whose stamp changed; it also re-reads after the client's own
 * actions. router.refresh() is deliberately not used: on Next 16.1.1 it
 * silently skips applying a refresh whose response arrives within a few
 * milliseconds (as on localhost), so the new message would not appear.
 */

type LiveData = {
  messages: ClientMessage[];
  files: ClientFile[];
  activity: ClientActivity[];
  meetings: ClientMeeting[];
};
type Section = keyof LiveData;
export type LiveStamps = Record<Section, string>;

type Live = {
  data: LiveData;
  refresh: (sections: Section[]) => Promise<void>;
  /** An older page of the conversation exists. */
  hasOlderMessages: boolean;
  loadOlderMessages: (beforeId: string) => Promise<void>;
  /** Messages from others the client has not read yet. */
  unread: number;
  /** "New messages" starts at others' messages after this instant (null: all of them). Fixed for the visit. */
  newSince: string | null;
  /** Read up to `until` (the newest message on screen). */
  markRead: (until: string) => Promise<void>;
};

const POLL_MS = 15_000;

const LiveContext = createContext<Live | null>(null);

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) throw new Error('Live sections must be rendered inside <LiveProvider>.');
  return live;
}

/** Union by id, oldest first: a live refresh of the newest page keeps the older pages already loaded. */
function mergeMessages(current: ClientMessage[], incoming: ClientMessage[]): ClientMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Session ended: sign in again. Access removed: reload to show the 403/404 page. */
function usable(response: Response): boolean {
  if (response.status === 401) {
    window.location.assign('/portal/login?expired=1');
    return false;
  }
  if (response.status === 403 || response.status === 404) {
    window.location.reload();
    return false;
  }
  return true;
}

export function LiveProvider({
  projectId,
  initial,
  stamps: initialStamps,
  unread: initialUnread,
  lastReadAt,
  hasOlderMessages: initialHasOlder,
  live,
  children,
}: {
  projectId: string;
  initial: LiveData;
  stamps: LiveStamps | null;
  unread: number;
  lastReadAt: string | null;
  hasOlderMessages: boolean;
  /** False in the admin's read-only preview: no polling, nothing marked read. */
  live: boolean;
  children: ReactNode;
}) {
  const [data, setData] = useState(initial);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialHasOlder);
  const [unread, setUnread] = useState(initialUnread);
  const stamps = useRef<LiveStamps | null>(initialStamps);
  // Per-section request counters: a slower, older response never overwrites a newer one.
  const latest = useRef<Record<Section, number>>({ messages: 0, files: 0, activity: 0, meetings: 0 });
  const marking = useRef(false);

  const refresh = useCallback(
    async (sections: Section[]) => {
      await Promise.all(
        sections.map(async (section) => {
          const ticket = ++latest.current[section];
          const response = await fetch(`/api/portal/projects/${projectId}/${section}`, { cache: 'no-store' });
          if (!usable(response) || !response.ok || ticket !== latest.current[section]) return;
          const body = (await response.json()) as Partial<LiveData>;
          const items = body[section];
          if (!items) return;
          setData((current) =>
            section === 'messages'
              ? { ...current, messages: mergeMessages(current.messages, items as ClientMessage[]) }
              : { ...current, [section]: items }
          );
        })
      );
    },
    [projectId]
  );

  const loadOlderMessages = useCallback(
    async (beforeId: string) => {
      const response = await fetch(`/api/portal/projects/${projectId}/messages?before=${encodeURIComponent(beforeId)}`, {
        cache: 'no-store',
      });
      if (!usable(response) || !response.ok) return;
      const body = (await response.json()) as { messages: ClientMessage[]; hasMore: boolean };
      setData((current) => ({ ...current, messages: mergeMessages(current.messages, body.messages) }));
      setHasOlderMessages(body.hasMore);
    },
    [projectId]
  );

  const markRead = useCallback(
    async (until: string) => {
      if (!live || marking.current) return;
      marking.current = true;
      try {
        const response = await fetch(`/api/portal/projects/${projectId}/messages/read`, jsonRequest('POST', { until }));
        if (response.ok) setUnread(((await response.json()) as { unread: number }).unread);
      } catch {
        // Offline: the next look at the conversation tries again.
      } finally {
        marking.current = false;
      }
    },
    [live, projectId]
  );

  useEffect(() => {
    if (!live) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch(`/api/portal/projects/${projectId}/updates`, { cache: 'no-store' });
        if (!usable(response) || !response.ok) return;
        const body = (await response.json()) as { stamps: LiveStamps; unread: number };
        const previous = stamps.current;
        stamps.current = body.stamps;
        setUnread(body.unread);
        if (!previous) return;
        const changed = (Object.keys(body.stamps) as Section[]).filter((section) => body.stamps[section] !== previous[section]);
        // Attachments are files: sharing or hiding one changes messages too.
        if (changed.includes('files') && !changed.includes('messages')) changed.push('messages');
        if (changed.length) await refresh(changed);
      } catch {
        // Offline or a deploy in progress: the next check tries again.
      }
    };
    const schedule = () => {
      timer = setTimeout(async () => {
        await check();
        if (!stopped) schedule();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [live, projectId, refresh]);

  return (
    <LiveContext.Provider
      value={{ data, refresh, hasOlderMessages, loadOlderMessages, unread, newSince: lastReadAt, markRead }}
    >
      {children}
    </LiveContext.Provider>
  );
}

type UploadConfig = { maxBytes: number; maxSizeLabel: string; accept: string };

/** preview: the admin's read-only "view as client" (no composer, no archived notice, nothing marked read). */
export function MessagesSection({
  projectId,
  archived,
  preview = false,
  upload,
}: {
  projectId: string;
  archived: boolean;
  preview?: boolean;
  upload: UploadConfig;
}) {
  const t = useTranslations('portal.project');
  const { data, refresh, hasOlderMessages, loadOlderMessages, unread, newSince, markRead } = useLive();
  const threadRef = useRef<HTMLOListElement>(null);
  const keepFromBottom = useRef<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const tabs = useProjectTabs();
  const visible = !tabs || tabs.active === 'messages';
  const items = layoutThread(data.messages, (m) => (m.sender.isYou ? 'you' : `${m.sender.isProjectLead}:${m.sender.name}`));
  const newest = data.messages.at(-1);
  const firstNewId = data.messages.find((m) => !m.sender.isYou && (!newSince || m.createdAt > newSince))?.id;

  // Open at the newest message, and follow new ones (but not when older ones are added on top).
  useEffect(() => {
    const thread = threadRef.current;
    if (thread && visible) thread.scrollTop = thread.scrollHeight;
  }, [newest?.id, visible]);

  // Older messages were added on top: keep what the reader was looking at in place.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (thread && keepFromBottom.current !== null) {
      thread.scrollTop = thread.scrollHeight - keepFromBottom.current;
      keepFromBottom.current = null;
    }
  }, [data.messages.length]);

  // Seen = this tab open while the page is visible.
  useEffect(() => {
    if (preview || !visible || unread === 0 || !newest) return;
    const mark = () => {
      if (document.visibilityState === 'visible') void markRead(newest.createdAt);
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [preview, visible, unread, newest, markRead]);

  const showOlder = async () => {
    const thread = threadRef.current;
    const oldest = data.messages[0];
    if (!thread || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    keepFromBottom.current = thread.scrollHeight - thread.scrollTop;
    try {
      await loadOlderMessages(oldest.id);
    } finally {
      setLoadingOlder(false);
    }
  };

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
            {hasOlderMessages && !preview && (
              <li className={styles.loadOlder}>
                <button type="button" className={styles.linkButton} onClick={showOlder} aria-busy={loadingOlder}>
                  {loadingOlder ? t('loadingOlder') : t('loadOlder')}
                </button>
              </li>
            )}
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
                  {message.id === firstNewId && (
                    <li className={styles.newDivider}>
                      <span>{t('newMessages')}</span>
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
                      {message.content && (
                        <p className={styles.bubble} dir="auto">
                          {message.content}
                        </p>
                      )}
                      {message.attachments.length > 0 && (
                        <ul className={styles.attachments} aria-label={t('attachmentsLabel')}>
                          {message.attachments.map((file) => (
                            <li key={file.id}>
                              <a href={file.downloadUrl} download className={styles.attachment}>
                                <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
                                <span className={styles.attachmentName} dir="auto">
                                  {file.filename}
                                </span>
                                <span className={styles.attachmentSize}>{file.sizeLabel}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
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
          !preview && (
            <ReplyForm projectId={projectId} upload={upload} onSent={() => refresh(['messages', 'files', 'activity'])} />
          )
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
