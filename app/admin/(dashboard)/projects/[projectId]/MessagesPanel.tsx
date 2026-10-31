'use client';

import { FormEvent, Fragment, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCheck, MessageCircle, SendHorizontal } from 'lucide-react';
import { initials, layoutThread } from '../../../../lib/portal/chat';
import { MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
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
};

/** Grows the composer with its text, up to about six lines (then it scrolls). */
function grow(textarea: HTMLTextAreaElement, reset = false) {
  textarea.style.height = 'auto';
  if (!reset) textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
}

export default function MessagesPanel({ projectId, messages }: { projectId: string; messages: AdminMessage[] }) {
  const { run, pending, error } = useAdminAction();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const threadRef = useRef<HTMLOListElement>(null);
  const items = layoutThread(messages, (m) => `${m.fromAdmin}:${m.senderName}`);

  // Open at the newest message, and follow new ones.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!content.trim() || pending) return;
    const result = await run('send', `/api/admin/projects/${projectId}/messages`, jsonInit('POST', { content }));
    if (result) {
      setContent('');
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
        <span className={styles.cardMeta}>Clients are emailed about your messages; you are emailed about theirs</span>
      </div>
      <div className={projectStyles.chat}>
        {messages.length === 0 ? (
          <div className={projectStyles.chatEmpty}>
            <MessageCircle size={26} strokeWidth={1.5} aria-hidden="true" />
            <p>No messages yet. Say hello to the client.</p>
          </div>
        ) : (
          <ol ref={threadRef} className={projectStyles.thread} tabIndex={0} aria-labelledby="messages-title">
            {items.map(({ message, dayLabel, startsGroup, endsGroup }) => {
              const mine = message.fromAdmin;
              return (
                <Fragment key={message.id}>
                  {dayLabel && (
                    <li className={projectStyles.daySeparator}>
                      <span>{dayLabel}</span>
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
                      <p className={projectStyles.bubble} dir="auto">
                        {message.content}
                      </p>
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
          <div className={projectStyles.composerBar}>
            <label className="visually-hidden" htmlFor="admin-message">
              Message to the client
            </label>
            <textarea
              ref={textareaRef}
              id="admin-message"
              className={projectStyles.composerInput}
              dir="auto"
              rows={1}
              required
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
              disabled={!content.trim() && pending === null}
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
