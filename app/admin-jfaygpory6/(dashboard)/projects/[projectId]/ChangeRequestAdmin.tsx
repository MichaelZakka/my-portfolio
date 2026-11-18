'use client';

import { FormEvent, useState } from 'react';
import { MessageSquareWarning, Send } from 'lucide-react';
import { MEETING_COMMENT_MAX_LENGTH } from '../../../../lib/portal/constants';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import { jsonInit, type useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type ChangeRequest = NonNullable<AdminProjectView['milestones'][number]['review']['changeRequest']>;

/**
 * The client's change request on a milestone, in full, with the conversation
 * under it. Your reply is emailed to the client; once the changes are done,
 * "Request approval" asks them again (and closes this thread).
 */
export default function ChangeRequestAdmin({
  request,
  url,
  action,
}: {
  request: ChangeRequest;
  url: string;
  action: ReturnType<typeof useAdminAction>;
}) {
  const { run, pending } = action;
  const [reply, setReply] = useState('');
  const key = `change-reply-${request.reviewId}`;
  const fieldId = `${key}-field`;

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim() || pending !== null) return;
    if (await run(key, `${url}/review/comments`, jsonInit('POST', { reviewId: request.reviewId, body: reply }))) {
      setReply('');
    }
  };

  return (
    <div className={projectStyles.changeCard} data-waiting={request.waitingForReply || undefined}>
      <div className={projectStyles.changeHead}>
        <MessageSquareWarning size={16} aria-hidden="true" />
        <span className={projectStyles.changeTitle}>Changes requested</span>
        <span className={projectStyles.muted}>
          {request.by}
          {request.when ? ` · ${request.when}` : ''}
        </span>
        {request.waitingForReply && <span className={projectStyles.waitingTag}>Waiting for your reply</span>}
      </div>
      <blockquote className={projectStyles.changeText} dir="auto">
        {request.text || 'No details were given.'}
      </blockquote>

      {request.comments.length > 0 && (
        <ul className={projectStyles.commentList}>
          {request.comments.map((comment) => (
            <li key={comment.id} className={projectStyles.comment} data-lead={comment.fromLead || undefined}>
              <span className={projectStyles.commentMeta}>
                <strong>{comment.fromLead ? 'You' : (comment.author ?? 'Client')}</strong> · {comment.timeLabel}
              </span>
              <p className={projectStyles.commentBody} dir="auto">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form className={projectStyles.commentForm} onSubmit={send}>
        <label className={styles.filterLabel} htmlFor={fieldId}>
          Reply to the client
        </label>
        <textarea
          id={fieldId}
          className={styles.textarea}
          dir="auto"
          rows={2}
          maxLength={MEETING_COMMENT_MAX_LENGTH}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <div className={projectStyles.formActions}>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={pending !== null}>
            <Send size={14} aria-hidden="true" />
            {pending === key ? 'Sending…' : 'Send reply'}
          </button>
          <span className={projectStyles.muted}>The client is emailed. When the changes are done, request approval again.</span>
        </div>
      </form>
    </div>
  );
}
