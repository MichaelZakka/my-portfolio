'use client';

import { FormEvent, Fragment, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCheck, Layers, MessageCircle, Paperclip, SendHorizontal, X } from 'lucide-react';
import { initials, layoutThread } from '../../../../lib/portal/chat';
import { useAdminProjectTabs } from './AdminProjectTabs';
import { MESSAGE_MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export type AdminMessage = {
  id: string;
  content: string;
  sentAt: string;
  createdAt: string;
  time: string;
  dayKey: string;
  dayLabel: string;
  senderName: string;
  fromAdmin: boolean;
  emailSent: boolean;
  emailError: string | null;
  /** No email of its own: the recipient still had an unread one about this conversation. */
  emailBatched: boolean;
  attachments: { id: string; filename: string; sizeLabel: string; hidden: boolean; downloadUrl: string }[];
};

/** Grows the composer with its text, up to about six lines (then it scrolls). */
function grow(textarea: HTMLTextAreaElement, reset = false) {
  textarea.style.height = 'auto';
  if (!reset) textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
}

/** Union by id, oldest first: the screen's reloads replace the newest page and keep older pages already loaded. */
function merge(older: AdminMessage[], newest: AdminMessage[]): AdminMessage[] {
  const byId = new Map(older.map((m) => [m.id, m]));
  for (const m of newest) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export default function MessagesPanel({
  projectId,
  messages: newestPage,
  hasMore,
  unread,
  lastReadAt,
  upload,
}: {
  projectId: string;
  messages: AdminMessage[];
  hasMore: boolean;
  unread: number;
  lastReadAt: string | null;
  upload: { maxBytes: number; maxSizeLabel: string; accept: string };
}) {
  const { run, pending, error, setError } = useAdminAction();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLOListElement>(null);
  const keepFromBottom = useRef<number | null>(null);
  const marking = useRef(false);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [older, setOlder] = useState<AdminMessage[]>([]);
  const [olderExists, setOlderExists] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // "New messages" starts where this visit started; it does not move while the conversation is open.
  const [newSince] = useState(lastReadAt);
  const tabs = useAdminProjectTabs();
  const visible = !tabs || tabs.active === 'messages';
  const messages = merge(older, newestPage);
  const hasOlder = olderExists ?? hasMore;
  const items = layoutThread(messages, (m) => `${m.fromAdmin}:${m.senderName}`);
  const newest = messages.at(-1);
  const firstNewId = messages.find((m) => !m.fromAdmin && (!newSince || m.createdAt > newSince))?.id;
  const canSend = Boolean(content.trim()) || files.length > 0;

  // Open at the newest message, and follow new ones (not when older ones are added on top).
  useEffect(() => {
    const thread = threadRef.current;
    if (thread && visible) thread.scrollTop = thread.scrollHeight;
  }, [newest?.id, visible]);

  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (thread && keepFromBottom.current !== null) {
      thread.scrollTop = thread.scrollHeight - keepFromBottom.current;
      keepFromBottom.current = null;
    }
  }, [messages.length]);

  // Seen = this tab open while the page is visible. The screen's next reload brings the new count.
  useEffect(() => {
    if (!visible || unread === 0 || !newest) return;
    const mark = async () => {
      if (document.visibilityState !== 'visible' || marking.current) return;
      marking.current = true;
      try {
        await fetch(`/api/admin/projects/${projectId}/messages/read`, jsonInit('POST', { until: newest.createdAt }));
      } finally {
        marking.current = false;
      }
    };
    void mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [visible, unread, newest, projectId]);

  const showOlder = async () => {
    const thread = threadRef.current;
    const oldest = messages[0];
    if (!thread || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    keepFromBottom.current = thread.scrollHeight - thread.scrollTop;
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/messages?before=${encodeURIComponent(oldest.id)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        keepFromBottom.current = null;
        return;
      }
      const body = (await response.json()) as { messages: AdminMessage[]; hasMore: boolean };
      setOlder((current) => merge(current, body.messages));
      setOlderExists(body.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  };

  const addFiles = (picked: FileList | null) => {
    setError('');
    const next = [...files, ...Array.from(picked ?? [])];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (next.length > MESSAGE_MAX_ATTACHMENTS) {
      setError(`Attach at most ${MESSAGE_MAX_ATTACHMENTS} files per message.`);
      return;
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > upload.maxBytes) {
      setError(`Attachments can be at most ${upload.maxSizeLabel} together. Larger files go under Files.`);
      return;
    }
    setFiles(next);
  };

  const send = async () => {
    if (!canSend || pending) return;
    let init: RequestInit;
    if (files.length) {
      const body = new FormData();
      body.append('content', content);
      for (const file of files) body.append('files', file);
      init = { method: 'POST', body };
    } else {
      init = jsonInit('POST', { content });
    }
    const result = await run('send', `/api/admin/projects/${projectId}/messages`, init);
    if (result) {
      setContent('');
      setFiles([]);
      if (textareaRef.current) grow(textareaRef.current, true);
      textareaRef.current?.focus(); // Send is disabled again; stay in the composer
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <section className={styles.card} aria-labelledby="messages-title">
      <div className={styles.cardHeader}>
        <h2 id="messages-title" className={styles.cardTitle}>
          Messages
        </h2>
        <span className={styles.cardMeta}>
          Updates live · each side is emailed once per unread batch, not per message
        </span>
      </div>
      <div className={projectStyles.chat}>
        {messages.length === 0 ? (
          <div className={projectStyles.chatEmpty}>
            <MessageCircle size={26} strokeWidth={1.5} aria-hidden="true" />
            <p>No messages yet. Say hello to the client.</p>
          </div>
        ) : (
          <ol ref={threadRef} className={projectStyles.thread} tabIndex={0} aria-labelledby="messages-title">
            {hasOlder && (
              <li className={projectStyles.loadOlder}>
                <button type="button" onClick={showOlder} aria-busy={loadingOlder}>
                  {loadingOlder ? 'Loading…' : 'Show earlier messages'}
                </button>
              </li>
            )}
            {items.map(({ message, dayLabel, startsGroup, endsGroup }) => {
              const mine = message.fromAdmin;
              return (
                <Fragment key={message.id}>
                  {dayLabel && (
                    <li className={projectStyles.daySeparator}>
                      <span>{dayLabel}</span>
                    </li>
                  )}
                  {message.id === firstNewId && (
                    <li className={projectStyles.newDivider}>
                      <span>New messages</span>
                    </li>
                  )}
                  <li
                    className={`${projectStyles.message} ${mine ? projectStyles.messageMine : ''}`}
                    data-group-start={startsGroup || undefined}
                    data-group-end={endsGroup || undefined}
                  >
                    {!mine && (
                      <span className={projectStyles.avatar} aria-hidden="true">
                        {startsGroup ? initials(message.senderName) : ''}
                      </span>
                    )}
                    <div className={projectStyles.bubbleStack}>
                      {startsGroup && !mine ? (
                        <span className={projectStyles.messageAuthor}>{message.senderName}</span>
                      ) : (
                        <span className="visually-hidden">{mine ? 'You' : message.senderName}: </span>
                      )}
                      {message.content && (
                        <p className={projectStyles.bubble} dir="auto">
                          {message.content}
                        </p>
                      )}
                      {message.attachments.length > 0 && (
                        <ul className={projectStyles.attachments} aria-label="Attachments">
                          {message.attachments.map((file) => (
                            <li key={file.id}>
                              <a href={file.downloadUrl} download className={projectStyles.attachment}>
                                <Paperclip size={13} aria-hidden="true" />
                                <span className={projectStyles.attachmentName} dir="auto">
                                  {file.filename}
                                </span>
                                <span className={projectStyles.muted}>
                                  {file.sizeLabel}
                                  {file.hidden ? ' · hidden from client' : ''}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <span className={projectStyles.messageMeta}>
                        <time
                          className={endsGroup ? undefined : 'visually-hidden'}
                          dateTime={message.createdAt}
                          title={message.sentAt}
                        >
                          {message.time}
                        </time>
                        {message.emailSent ? (
                          <span className={projectStyles.delivered} title="Email notification sent">
                            <CheckCheck size={13} aria-hidden="true" />
                            <span className="visually-hidden">notified by email</span>
                          </span>
                        ) : message.emailBatched ? (
                          <span
                            className={projectStyles.delivered}
                            title="No separate email: covered by an earlier notification that is still unread"
                          >
                            <Layers size={12} aria-hidden="true" />
                            <span className="visually-hidden">covered by an earlier email</span>
                          </span>
                        ) : (
                          message.emailError && (
                            <span className={projectStyles.undelivered} title={message.emailError}>
                              <AlertTriangle size={12} aria-hidden="true" />
                              email not sent
                              <span className="visually-hidden">: {message.emailError}</span>
                            </span>
                          )
                        )}
                      </span>
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
        <form className={projectStyles.composer} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.bannerError} role="alert">
              {error}
            </div>
          )}
          {files.length > 0 && (
            <ul className={projectStyles.attachmentChips} aria-label="Attachments to send">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className={projectStyles.attachmentChip}>
                  <Paperclip size={12} aria-hidden="true" />
                  <span className={projectStyles.attachmentName} dir="auto">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className={projectStyles.chipRemove}
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={projectStyles.composerBar}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={upload.accept}
              className="visually-hidden"
              tabIndex={-1}
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              className={projectStyles.attachButton}
              aria-label="Attach files"
              title={`Attach up to ${MESSAGE_MAX_ATTACHMENTS} files (${upload.maxSizeLabel} together)`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={17} aria-hidden="true" />
            </button>
            <label className="visually-hidden" htmlFor="admin-message">
              Message to the client
            </label>
            <textarea
              ref={textareaRef}
              id="admin-message"
              className={projectStyles.composerInput}
              dir="auto"
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Write to the client…"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                grow(e.currentTarget);
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              className={projectStyles.sendButton}
              disabled={!canSend && pending === null}
              aria-disabled={pending !== null}
              aria-busy={pending === 'send'}
              aria-label={pending === 'send' ? 'Sending…' : 'Send message'}
              title="Send (Ctrl/⌘ + Enter)"
            >
              <SendHorizontal size={17} aria-hidden="true" />
            </button>
          </div>
          <p className={projectStyles.composerHint}>Ctrl/⌘ + Enter to send</p>
        </form>
      </div>
    </section>
  );
}
