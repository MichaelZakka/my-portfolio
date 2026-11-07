'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { MESSAGE_MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

/** Grows the composer with its text, up to about six lines (then it scrolls). */
function grow(textarea: HTMLTextAreaElement, reset = false) {
  textarea.style.height = 'auto';
  if (!reset) textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

type Props = {
  projectId: string;
  /** Attachments travel with the message, so together they share the upload limit. */
  upload: { maxBytes: number; maxSizeLabel: string; accept: string };
  onSent: () => Promise<void>;
};

export default function ReplyForm({ projectId, upload, onSent }: Props) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = Boolean(content.trim()) || files.length > 0;

  const addFiles = (picked: FileList | null) => {
    setError('');
    const next = [...files, ...Array.from(picked ?? [])];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (next.length > MESSAGE_MAX_ATTACHMENTS) {
      setError(errorMessage({ code: 'tooManyFiles' }, { max: MESSAGE_MAX_ATTACHMENTS }));
      return;
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > upload.maxBytes) {
      setError(errorMessage({ code: 'fileTooLarge' }, { size: upload.maxSizeLabel }));
      return;
    }
    setFiles(next);
  };

  const send = async () => {
    if (!canSend || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      let init: RequestInit;
      if (files.length) {
        const body = new FormData();
        body.append('content', content);
        for (const file of files) body.append('files', file);
        init = { method: 'POST', body };
      } else {
        init = jsonRequest('POST', { content });
      }
      const response = await fetch(`/api/portal/projects/${projectId}/messages`, init);
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response), { size: upload.maxSizeLabel, max: MESSAGE_MAX_ATTACHMENTS }));
        return;
      }
      setContent('');
      setFiles([]);
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
      {files.length > 0 && (
        <ul className={styles.attachmentChips} aria-label={t('attachmentsLabel')}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className={styles.attachmentChip}>
              <Paperclip size={13} strokeWidth={2} aria-hidden="true" />
              <span className={styles.attachmentName} dir="auto">
                {file.name}
              </span>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={t('removeAttachment', { name: file.name })}
                onClick={() => setFiles(files.filter((_, i) => i !== index))}
              >
                <X size={13} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.composerBar}>
        <input
          ref={fileInputRef}
          id="portal-reply-files"
          type="file"
          multiple
          accept={upload.accept}
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          className={styles.attachButton}
          aria-label={t('attachFiles')}
          title={t('attachHint', { max: MESSAGE_MAX_ATTACHMENTS, size: upload.maxSizeLabel })}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <label className="visually-hidden" htmlFor="portal-reply">
          {t('replyLabel')}
        </label>
        <textarea
          ref={textareaRef}
          id="portal-reply"
          className={styles.composerInput}
          dir="auto"
          rows={1}
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
          disabled={!canSend && !sending}
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
