'use client';

import type { UploadSettings } from '../../../../lib/portal/constants';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Download, MessageSquare, Paperclip } from 'lucide-react';
import { useLive } from './LiveSections';
import ReplyForm from './ReplyForm';
import styles from '../../../portal.module.css';

type Upload = UploadSettings;

/** "3 comments", next to a task's title (live, so it follows new comments). */
export function TaskCommentCount({ taskId }: { taskId: string }) {
  const t = useTranslations('portal.project');
  const count = useLive().data.comments[taskId]?.comments.length ?? 0;
  if (!count) return null;
  return (
    <span className={styles.taskCommentCount}>
      <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
      {t('taskCommentsCount', { count })}
    </span>
  );
}

/**
 * The comment thread inside an opened task: the client asks or gives feedback
 * (with attachments); the project lead answers here too. Emails links point
 * at #task-<id>, which opens this task.
 */
export function TaskComments({
  projectId,
  taskId,
  taskTitle,
  readOnly,
  upload,
}: {
  projectId: string;
  taskId: string;
  taskTitle: string;
  /** Archived project or the admin's preview: the thread shows, the composer does not. */
  readOnly: boolean;
  upload: Upload;
}) {
  const t = useTranslations('portal.project');
  const { data, refresh } = useLive();
  const thread = data.comments[taskId];
  const ref = useRef<HTMLDivElement>(null);

  // Opened from an email link (#task-<id>): unfold the task and bring it into view.
  useEffect(() => {
    if (window.location.hash !== `#task-${taskId}`) return;
    const details = ref.current?.closest('details');
    if (details) details.open = true;
    details?.closest('li')?.scrollIntoView({ block: 'start' });
  }, [taskId]);

  return (
    <div ref={ref} className={styles.taskComments}>
      <h4 className={styles.taskCommentsTitle}>{t('taskCommentsTitle')}</h4>
      {thread?.comments.length ? (
        <ul className={styles.commentList}>
          {thread.comments.map((comment) => (
            <li key={comment.id} className={styles.comment} data-lead={comment.fromLead || undefined}>
              <span className={styles.commentMeta}>
                <strong dir="auto">{comment.author ?? (comment.fromLead ? t('projectLead') : '—')}</strong>
                {comment.fromLead && comment.author && <span className={styles.commentRole}>{t('projectLead')}</span>}
                <time dateTime={comment.createdAt}>{comment.timeLabel}</time>
              </span>
              {comment.body && (
                <p className={styles.commentBody} dir="auto">
                  {comment.body}
                </p>
              )}
              {comment.attachments.length > 0 && (
                <ul className={styles.commentFiles} aria-label={t('attachmentsLabel')}>
                  {comment.attachments.map((file) => (
                    <li key={file.id}>
                      <a href={file.downloadUrl} className={styles.commentFile} download>
                        <Paperclip size={14} strokeWidth={2} aria-hidden="true" />
                        <span dir="auto">{file.filename}</span>
                        <span className={styles.commentFileSize}>{file.sizeLabel}</span>
                        <Download size={14} strokeWidth={2} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !readOnly && <p className={styles.hint}>{t('taskCommentsEmpty')}</p>
      )}
      {!readOnly && (
        <ReplyForm
          projectId={projectId}
          upload={upload}
          url={`/api/portal/projects/${projectId}/tasks/${taskId}/comments`}
          inputId={`task-${taskId}-comment`}
          labels={{
            label: t('taskCommentLabel', { task: taskTitle }),
            placeholder: t('taskCommentPlaceholder'),
            sent: t('taskCommentSent'),
          }}
          onSent={() => refresh(['comments', 'activity', 'files'])}
        />
      )}
    </div>
  );
}
