'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquareWarning, Send } from 'lucide-react';
import { MEETING_COMMENT_MAX_LENGTH } from '../../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

export type ChangeComment = {
  id: string;
  body: string;
  author: string | null;
  fromLead: boolean;
  createdAt: string;
  timeLabel: string;
};

/**
 * The changes the client asked for on a milestone, shown in full, with the
 * conversation under it: the project lead's replies and the client's own
 * follow-ups (the lead is emailed). A reply appears at once; the lead's
 * replies arrive with the next page load (and by email).
 */
export default function ChangeRequestThread({
  projectId,
  milestoneId,
  reviewId,
  byLine,
  text,
  comments: initial,
  readOnly,
}: {
  projectId: string;
  milestoneId: string;
  reviewId: string;
  /** "Name asked for changes · date", formatted on the server. */
  byLine: string;
  text: string;
  comments: ChangeComment[];
  readOnly: boolean;
}) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const [comments, setComments] = useState(initial);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fieldId = `change-${reviewId}-reply`;

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/portal/projects/${projectId}/milestones/${milestoneId}/review/comments`,
        jsonRequest('POST', { reviewId, body: reply })
      );
      const body = await readJson<{ comment: ChangeComment } & NonNullable<ApiErrorBody>>(response);
      if (!response.ok || !body?.comment) {
        setError(errorMessage(body));
        return;
      }
      setComments((current) => [...current, body.comment]);
      setReply('');
      setNotice(t('changesReplySent'));
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.changeCard} aria-labelledby={`${fieldId}-title`}>
      <div className={styles.changeHead}>
        <MessageSquareWarning size={18} strokeWidth={2} aria-hidden="true" />
        <h4 id={`${fieldId}-title`} className={styles.changeTitle}>
          {t('changesTitle')}
        </h4>
        <span className={styles.changeBy}>{byLine}</span>
      </div>
      <blockquote className={styles.changeText} dir="auto">
        {text || t('changesNoText')}
      </blockquote>

      {comments.length > 0 && (
        <ul className={styles.commentList}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.comment} data-lead={comment.fromLead || undefined}>
              <span className={styles.commentMeta}>
                <strong dir="auto">{comment.author ?? (comment.fromLead ? t('projectLead') : '—')}</strong>
                {comment.fromLead && comment.author && <span className={styles.commentRole}>{t('projectLead')}</span>}
                <time dateTime={comment.createdAt}>{comment.timeLabel}</time>
              </span>
              <p className={styles.commentBody} dir="auto">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form className={styles.commentForm} onSubmit={send}>
          <label className={styles.label} htmlFor={fieldId}>
            {t('changesReplyLabel')}
          </label>
          <textarea
            id={fieldId}
            className={styles.textarea}
            dir="auto"
            rows={2}
            maxLength={MEETING_COMMENT_MAX_LENGTH}
            placeholder={t('changesReplyPlaceholder')}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <p className={`${styles.alert} ${styles.alertError}`} role="alert">
            {error}
          </p>
          <div className={styles.meetingActions}>
            <button type="submit" className="btn btn-outline" disabled={!reply.trim() && !sending} aria-disabled={sending}>
              <Send size={16} strokeWidth={2} aria-hidden="true" />
              {sending ? t('meetingSending') : t('changesReplySend')}
            </button>
            <span className={styles.hint} role="status">
              {notice}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
