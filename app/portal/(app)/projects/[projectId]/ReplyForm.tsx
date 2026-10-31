'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SendHorizontal } from 'lucide-react';
import { MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

/** Grows the composer with its text, up to about six lines (then it scrolls). */
function grow(textarea: HTMLTextAreaElement, reset = false) {
  textarea.style.height = 'auto';
  if (!reset) textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

export default function ReplyForm({ projectId, onSent }: { projectId: string; onSent: () => Promise<void> }) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/portal/projects/${projectId}/messages`, jsonRequest('POST', { content }));
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return;
      }
      setContent('');
      if (textareaRef.current) grow(textareaRef.current, true);
      await onSent();
      setNotice(t('sent'));
      // The emptied form disables Send; keep keyboard users in the composer.
      textareaRef.current?.focus();
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  // Ctrl/⌘ + Enter sends; plain Enter keeps adding lines.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.composerBar}>
        <label className="visually-hidden" htmlFor="portal-reply">
          {t('replyLabel')}
        </label>
        <textarea
          ref={textareaRef}
          id="portal-reply"
          className={styles.composerInput}
          dir="auto"
          rows={1}
          required
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={t('replyPlaceholder')}
          aria-describedby="portal-reply-hint"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            grow(e.currentTarget);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!content.trim() && !sending}
          aria-disabled={sending}
          aria-busy={sending}
          aria-label={sending ? t('sending') : t('send')}
          title={t('send')}
        >
          <SendHorizontal size={18} strokeWidth={2} aria-hidden="true" className="flip-rtl" />
        </button>
      </div>
      <div className={styles.composerFoot}>
        <span id="portal-reply-hint">{t('sendHint')}</span>
        <span role="status">{notice}</span>
      </div>
    </form>
  );
}
