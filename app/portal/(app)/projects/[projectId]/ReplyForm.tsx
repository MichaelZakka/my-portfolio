'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

export default function ReplyForm({ projectId }: { projectId: string }) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const router = useRouter();
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
      setNotice(t('sent'));
      router.refresh();
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="portal-reply">
          {t('replyLabel')}
        </label>
        <textarea
          id="portal-reply"
          className={styles.textarea}
          dir="auto"
          required
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={t('replyPlaceholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      <div className={styles.composerActions}>
        <span className={styles.hint} role="status">
          {notice}
        </span>
        <button type="submit" className="btn btn-primary" disabled={sending || !content.trim()} aria-busy={sending}>
          {sending ? t('sending') : t('send')}
        </button>
      </div>
    </form>
  );
}
