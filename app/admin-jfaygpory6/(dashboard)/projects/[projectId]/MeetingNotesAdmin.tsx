'use client';

import { FormEvent, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, ClipboardList, Pencil, Plus, Send, X } from 'lucide-react';
import { MEETING_ACTION_ITEMS_MAX, MEETING_COMMENT_MAX_LENGTH, MEETING_NOTES_MAX_LENGTH } from '../../../../lib/portal/constants';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import { jsonInit, type useAdminAction } from '../useAdminAction';
import { confirmDialog } from '../../../../components/confirmDialog';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Meeting = AdminProjectView['meetings'][number];
type Notes = NonNullable<Meeting['notes']>;
type Action = ReturnType<typeof useAdminAction>;
type DraftItem = { key: string; id?: string; text: string; owner: 'admin' | 'client' };

/**
 * After a meeting: write notes (summary + action items) as a private draft,
 * publish them to the client (emailed once), then follow up under them:
 * tick items off, read the client's confirmation and comments, reply.
 * A meeting that did not happen can be marked as such instead.
 */
export default function MeetingNotesAdmin({ meeting, url, action }: { meeting: Meeting; url: string; action: Action }) {
  const { run, pending } = action;
  const [editing, setEditing] = useState(false);
  const notes = meeting.notes;
  const busy = pending !== null;
  const notesUrl = `${url}/notes`;

  if (!meeting.canWriteNotes && !notes?.published) return null;

  if (editing) {
    return (
      <NotesEditor meeting={meeting} notes={notes} url={notesUrl} action={action} onClose={() => setEditing(false)} />
    );
  }

  const markNoShow = async () => {
    if (
      !(await confirmDialog({
        title: 'Mark as not held?',
        message: `“${meeting.title}” will show as “did not take place” for the client too. You can still write notes later if it did happen.`,
        confirmLabel: 'Mark as not held',
        cancelLabel: 'Keep it',
      }))
    )
      return;
    await run(`noshow-${meeting.id}`, url, jsonInit('PATCH', { action: 'no_show' }));
  };

  if (!notes?.published) {
    const message =
      meeting.status === 'no_show'
        ? 'Marked as not held. If it did take place, you can still write and share notes.'
        : notes
          ? `Draft saved ${notes.savedLabel ?? ''}. The client can’t see it until you publish.`
          : meeting.needsNotes
            ? 'This meeting is over. Write a summary and the action items, then publish them to the client.'
            : 'Write notes during or after the meeting; they stay a draft until you publish them.';
    return (
      <div className={projectStyles.notesPrompt} data-needed={meeting.needsNotes || undefined}>
        <p className={projectStyles.notesPromptText}>
          <ClipboardList size={15} aria-hidden="true" />
          {message}
        </p>
        <div className={projectStyles.formActions}>
          <button
            type="button"
            className={`${styles.button} ${meeting.needsNotes || notes ? styles.buttonPrimary : styles.buttonSecondary}`}
            aria-disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} aria-hidden="true" />
            {notes ? 'Continue draft' : 'Write notes'}
          </button>
          {meeting.canMarkNoShow && (
            <button type="button" className={projectStyles.dangerLink} aria-disabled={busy} onClick={markNoShow}>
              {pending === `noshow-${meeting.id}` ? 'Saving…' : 'It didn’t take place'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return <PublishedNotes meeting={meeting} notes={notes} url={notesUrl} action={action} onEdit={() => setEditing(true)} />;
}

function PublishedNotes({
  meeting,
  notes,
  url,
  action,
  onEdit,
}: {
  meeting: Meeting;
  notes: Notes;
  url: string;
  action: Action;
  onEdit: () => void;
}) {
  const { run, pending } = action;
  const busy = pending !== null;
  const [reply, setReply] = useState('');
  const replyId = `meeting-${meeting.id}-reply`;

  const toggle = (itemId: string, done: boolean) =>
    run(`item-${itemId}`, url, jsonInit('POST', { action: 'item', itemId, done }));

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) return;
    if (await run(`comment-${meeting.id}`, url, jsonInit('POST', { action: 'comment', body: reply }))) setReply('');
  };

  return (
    <div className={projectStyles.notes}>
      <div className={projectStyles.notesHead}>
        <h4 className={projectStyles.notesTitle}>Meeting notes</h4>
        <span className={projectStyles.muted}>Shared {notes.publishedLabel}</span>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary} ${projectStyles.notesEdit}`}
          aria-disabled={busy}
          onClick={onEdit}
        >
          <Pencil size={14} aria-hidden="true" />
          Edit notes
        </button>
      </div>

      <p className={projectStyles.notesSummary} dir="auto">
        {notes.summary}
      </p>

      {notes.items.length > 0 && (
        <>
          <h5 className={projectStyles.notesSubtitle}>Action items</h5>
          <ul className={projectStyles.actionList}>
            {notes.items.map((item) => (
              <li key={item.id} className={projectStyles.actionItem} data-done={item.done || undefined}>
                <label className={projectStyles.actionLabel}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-disabled={busy}
                    onChange={(e) => {
                      if (!busy) toggle(item.id, e.target.checked);
                    }}
                  />
                  <span dir="auto">{item.text}</span>
                </label>
                <span className={projectStyles.actionOwner} data-owner={item.owner}>
                  {item.owner === 'client' ? 'Client' : 'You'}
                </span>
                {item.done && item.doneLabel && (
                  <span className={projectStyles.actionDone}>
                    Done{item.doneBy ? ` by ${item.doneBy}` : ''} · {item.doneLabel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={projectStyles.ackLine} data-confirmed={notes.acknowledged ? true : undefined}>
        {notes.acknowledged ? (
          <>
            <CheckCircle2 size={15} aria-hidden="true" />
            Confirmed by {notes.acknowledged.by ?? 'the client'} · {notes.acknowledged.label}
          </>
        ) : (
          <>
            <CircleDashed size={15} aria-hidden="true" />
            Not confirmed by the client yet
          </>
        )}
      </p>

      {notes.comments.length > 0 && (
        <>
          <h5 className={projectStyles.notesSubtitle}>Comments</h5>
          <ul className={projectStyles.commentList}>
            {notes.comments.map((comment) => (
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
        </>
      )}

      <form className={projectStyles.commentForm} onSubmit={sendReply}>
        <label className={styles.filterLabel} htmlFor={replyId}>
          {notes.comments.length ? 'Reply' : 'Add a comment'}
        </label>
        <textarea
          id={replyId}
          className={styles.textarea}
          dir="auto"
          rows={2}
          maxLength={MEETING_COMMENT_MAX_LENGTH}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <div className={projectStyles.formActions}>
          <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`} aria-disabled={busy}>
            <Send size={14} aria-hidden="true" />
            {pending === `comment-${meeting.id}` ? 'Sending…' : 'Send'}
          </button>
          <span className={projectStyles.muted}>The client sees it here; no email is sent.</span>
        </div>
      </form>
    </div>
  );
}

function NotesEditor({
  meeting,
  notes,
  url,
  action,
  onClose,
}: {
  meeting: Meeting;
  notes: Notes | null;
  url: string;
  action: Action;
  onClose: () => void;
}) {
  const { run, pending } = action;
  const busy = pending !== null;
  const published = notes?.published ?? false;
  const nextKey = useRef(0);
  const [summary, setSummary] = useState(notes?.summary ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    () => notes?.items.map((item) => ({ key: item.id, id: item.id, text: item.text, owner: item.owner })) ?? []
  );
  const id = (field: string) => `meeting-${meeting.id}-notes-${field}`;

  const update = (key: string, change: Partial<DraftItem>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const addItem = () => {
    const key = `new-${nextKey.current++}`;
    setItems((current) => [...current, { key, text: '', owner: 'client' }]);
    // Focus the new row once it is rendered.
    requestAnimationFrame(() => document.getElementById(id(`item-${key}`))?.focus());
  };

  const save = async (publish: boolean) => {
    const body = {
      summary,
      actionItems: items
        .filter((item) => item.text.trim())
        .map((item) => ({ ...(item.id ? { id: item.id } : {}), text: item.text, owner: item.owner })),
      publish,
    };
    if (publish) {
      const ok = await confirmDialog({
        title: 'Publish the notes?',
        message: 'The client will see the summary and action items in the portal and get them by email.',
        confirmLabel: 'Publish',
        cancelLabel: 'Not yet',
      });
      if (!ok) return;
    }
    const key = publish ? `publish-${meeting.id}` : `notes-${meeting.id}`;
    if (await run(key, url, jsonInit('PUT', body))) onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Published notes are saved live; a draft is published from here.
    save(!published);
  };

  return (
    <form className={projectStyles.notes} onSubmit={submit}>
      <h4 className={projectStyles.notesTitle}>{published ? 'Edit meeting notes' : 'Meeting notes'}</h4>
      <div className={styles.filterField}>
        <label className={styles.filterLabel} htmlFor={id('summary')}>
          Summary: what was discussed and decided
        </label>
        <textarea
          id={id('summary')}
          className={styles.textarea}
          dir="auto"
          rows={6}
          required
          maxLength={MEETING_NOTES_MAX_LENGTH}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <fieldset className={projectStyles.notesItemsField}>
        <legend className={styles.filterLabel}>Action items</legend>
        {items.length === 0 && <p className={projectStyles.muted}>No action items yet.</p>}
        <ul className={projectStyles.itemEditorList}>
          {items.map((item, index) => (
            <li key={item.key} className={projectStyles.itemEditorRow}>
              <input
                id={id(`item-${item.key}`)}
                className={styles.input}
                dir="auto"
                maxLength={500}
                aria-label={`Action item ${index + 1}`}
                placeholder="What needs to happen"
                value={item.text}
                onChange={(e) => update(item.key, { text: e.target.value })}
              />
              <select
                className={styles.select}
                aria-label={`Who does action item ${index + 1}`}
                value={item.owner}
                onChange={(e) => update(item.key, { owner: e.target.value === 'admin' ? 'admin' : 'client' })}
              >
                <option value="client">Client</option>
                <option value="admin">You</option>
              </select>
              <button
                type="button"
                className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
                aria-label={`Remove action item ${index + 1}`}
                onClick={() => setItems((current) => current.filter((other) => other.key !== item.key))}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {items.length < MEETING_ACTION_ITEMS_MAX && (
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={addItem}>
            <Plus size={15} aria-hidden="true" />
            Add action item
          </button>
        )}
      </fieldset>

      {published && notes?.acknowledged && (
        <p className={projectStyles.muted}>
          The client confirmed these notes. If you change them, they will be asked to confirm again.
        </p>
      )}

      <div className={projectStyles.formActions}>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={busy}>
          {published
            ? pending === `publish-${meeting.id}` || pending === `notes-${meeting.id}`
              ? 'Saving…'
              : 'Save changes'
            : pending === `publish-${meeting.id}`
              ? 'Publishing…'
              : 'Publish to client'}
        </button>
        {!published && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            aria-disabled={busy}
            onClick={() => save(false)}
          >
            {pending === `notes-${meeting.id}` ? 'Saving…' : 'Save draft'}
          </button>
        )}
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onClose}>
          Never mind
        </button>
      </div>
      {!published && (
        <p className={projectStyles.muted}>
          Publishing marks the meeting as held and emails the notes to the client.
        </p>
      )}
    </form>
  );
}
