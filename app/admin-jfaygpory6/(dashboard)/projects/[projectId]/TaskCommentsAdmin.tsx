'use client';

import { FormEvent, useRef, useState, useSyncExternalStore } from 'react';
import { MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { MESSAGE_MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH, type UploadSettings } from '../../../../lib/portal/constants';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import { attachmentsRequest, uploadErrorText } from '../../../../lib/portal/uploadClient';
import type { useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Task = AdminProjectView['tasks'][number];
type Action = ReturnType<typeof useAdminAction>;
type Upload = UploadSettings;

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * A task's comment thread. Opens by itself while the client waits for a reply
 * (their comment is the newest) and when an email link points at #task-<id>.
 * On an internal task, comments are notes the client never sees.
 */
export default function TaskCommentsAdmin({
  projectId,
  task,
  url,
  action,
  upload,
}: {
  projectId: string;
  task: Task;
  url: string;
  action: Action;
  upload: Upload;
}) {
  const { run, pending, setError } = action;
  // Open while the client waits for a reply or an email link points here, until toggled by hand.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const linked = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash === `#task-${task.id}`,
    () => false
  );
  const open = toggled ?? (task.waitingForReply || linked);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const busy = pending !== null;
  const key = `comment-${task.id}`;
  const fieldId = `task-${task.id}-comment`;
  const count = task.comments.length;

  const addFiles = (picked: FileList | null) => {
    const next = [...files, ...Array.from(picked ?? [])];
    if (fileInput.current) fileInput.current.value = '';
    if (next.length > MESSAGE_MAX_ATTACHMENTS) {
      setError(`Attach at most ${MESSAGE_MAX_ATTACHMENTS} files per comment.`);
      return;
    }
    if (next.some((file) => file.size > upload.maxBytes)) {
      setError(`Each attachment can be at most ${upload.maxSizeLabel}.`);
      return;
    }
    setFiles(next);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if ((!content.trim() && files.length === 0) || busy || uploading) return;
    setError('');
    setUploading(files.length > 0 && upload.direct);
    const prepared = await attachmentsRequest(content, files, {
      direct: upload.direct,
      tokenUrl: `/api/admin/projects/${projectId}/uploads`,
      projectId,
    });
    setUploading(false);
    if (!prepared.ok) {
      setError(uploadErrorText(prepared.code));
      return;
    }
    if (await run(key, url, prepared.init)) {
      setContent('');
      setFiles([]);
    }
  };

  return (
    <div className={projectStyles.taskComments}>
      <div className={projectStyles.taskCommentsHead}>
        <button
          type="button"
          className={projectStyles.taskCommentsToggle}
          aria-expanded={open}
          aria-controls={`${fieldId}-thread`}
          onClick={() => setToggled(!open)}
        >
          <MessageSquare size={14} aria-hidden="true" />
          {count ? `${count} comment${count === 1 ? '' : 's'}` : 'Comment'}
        </button>
        {task.waitingForReply && <span className={projectStyles.waitingTag}>Client waiting for your reply</span>}
      </div>

      {open && (
        <div id={`${fieldId}-thread`} className={projectStyles.taskThread}>
          {count > 0 && (
            <ul className={projectStyles.commentList}>
              {task.comments.map((comment) => (
                <li key={comment.id} className={projectStyles.comment} data-lead={comment.fromLead || undefined}>
                  <span className={projectStyles.commentMeta}>
                    <strong>{comment.fromLead ? 'You' : (comment.author ?? 'Client')}</strong> · {comment.timeLabel}
                  </span>
                  {comment.body && (
                    <p className={projectStyles.commentBody} dir="auto">
                      {comment.body}
                    </p>
                  )}
                  {comment.attachments.length > 0 && (
                    <ul className={projectStyles.commentFiles}>
                      {comment.attachments.map((file) => (
                        <li key={file.id}>
                          <a href={file.downloadUrl} className={styles.link} download>
                            <Paperclip size={13} aria-hidden="true" /> {file.filename} ({file.sizeLabel})
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className={projectStyles.commentForm} onSubmit={send}>
            <label className={styles.filterLabel} htmlFor={fieldId}>
              {task.visibleToClient ? (count ? 'Reply' : 'Comment') : 'Internal note (the client can’t see this task)'}
            </label>
            <textarea
              id={fieldId}
              className={styles.textarea}
              dir="auto"
              rows={2}
              maxLength={MESSAGE_MAX_LENGTH}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {files.length > 0 && (
              <ul className={projectStyles.attachmentChips} aria-label="Attachments">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className={projectStyles.attachmentChip}>
                    <Paperclip size={13} aria-hidden="true" />
                    <span className={projectStyles.attachmentName} dir="auto">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className={projectStyles.chipRemove}
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className={projectStyles.formActions}>
              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={busy}>
                <Send size={14} aria-hidden="true" />
                {uploading ? 'Uploading…' : pending === key ? 'Sending…' : 'Send'}
              </button>
              <input
                ref={fileInput}
                id={`${fieldId}-files`}
                type="file"
                multiple
                accept={upload.accept}
                className="visually-hidden"
                tabIndex={-1}
                onChange={(e) => addFiles(e.target.files)}
              />
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip size={14} aria-hidden="true" />
                Attach
              </button>
              <span className={projectStyles.muted}>
                {task.visibleToClient ? 'The client is emailed (one email per batch).' : 'Not emailed.'}
              </span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
