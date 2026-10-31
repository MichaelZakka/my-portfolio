'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export type AdminMessage = {
  id: string;
  content: string;
  sentAt: string;
  senderName: string;
  fromAdmin: boolean;
  emailSent: boolean;
  emailError: string | null;
};

export default function MessagesPanel({ projectId, messages }: { projectId: string; messages: AdminMessage[] }) {
  const { run, pending, error } = useAdminAction();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');

  const send = async () => {
    if (!content.trim() || pending) return;
    const result = await run('send', `/api/admin/projects/${projectId}/messages`, jsonInit('POST', { content }));
    if (result) {
      setContent('');
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
      {messages.length === 0 ? (
        <p className={projectStyles.muted} style={{ marginBottom: '1rem' }}>
          No messages yet.
        </p>
      ) : (
        <ol className={projectStyles.thread}>
          {messages.map((message) => (
            <li
              key={message.id}
              className={`${projectStyles.message} ${message.fromAdmin ? projectStyles.messageFromAdmin : ''}`}
            >
              <div className={projectStyles.messageHead}>
                <span className={projectStyles.messageAuthor}>{message.senderName}</span>
                <span>{message.sentAt}</span>
                {message.emailSent ? (
                  <span className={projectStyles.successText}>notified</span>
                ) : (
                  message.emailError && (
                    <span className={projectStyles.errorText}>email not sent: {message.emailError}</span>
                  )
                )}
              </div>
              <p className={projectStyles.messageBody} dir="auto">
                {message.content}
              </p>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      <form className={projectStyles.stackForm} onSubmit={handleSubmit}>
        <label className="visually-hidden" htmlFor="admin-message">
          Message to the client
        </label>
        <textarea
          ref={textareaRef}
          id="admin-message"
          className={styles.textarea}
          dir="auto"
          required
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder="Write to the client… (Ctrl/⌘ + Enter to send)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={projectStyles.formActions}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={!content.trim() && pending === null}
            aria-disabled={pending !== null}
          >
            {pending === 'send' ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  );
}
