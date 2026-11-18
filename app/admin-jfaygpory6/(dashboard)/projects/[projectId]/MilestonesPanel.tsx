'use client';

import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowUp, BadgeCheck, Trash2 } from 'lucide-react';
import { MILESTONE_ADMIN_STATUSES, WORK_STATUSES, WORK_STATUS_LABELS } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';
import { confirmDialog } from '../../../../components/confirmDialog';
import type { AdminProjectView } from '../../../../lib/portal/adminView';
import ChangeRequestAdmin from './ChangeRequestAdmin';

export type AdminMilestone = AdminProjectView['milestones'][number];

type Action = ReturnType<typeof useAdminAction>;

const daysValue = (value: string) => (value ? Number(value) : null);

/** YYYY-MM-DD plus whole days, in UTC like the stored due dates. */
function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Sign-off: ask the client to approve, see the pending request, and the latest answer. */
function ReviewSection({ milestone, url, action }: { milestone: AdminMilestone; url: string; action: Action }) {
  const { run, pending } = action;
  const { review } = milestone;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const busy = pending !== null;
  const latest = review.history[0];
  // Done means approved (or, for older milestones, marked done by hand): nothing left to ask.
  const signedOff = milestone.status === 'done';

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(`review-${milestone.id}`, `${url}/review`, jsonInit('POST', { note, link }))) {
      setOpen(false);
      setNote('');
      setLink('');
    }
  };

  const withdraw = async () => {
    if (!(await confirmDialog({ title: 'Withdraw approval request?', message: `The client will no longer be asked to approve “${milestone.title}”.`, confirmLabel: 'Withdraw' }))) return;
    await run(`withdraw-${milestone.id}`, `${url}/review`, jsonInit('DELETE'));
  };

  if (review.pending) {
    return (
      <div className={projectStyles.reviewBox}>
        <span className={projectStyles.reviewTitle}>Awaiting client approval · requested {review.pending.requested}</span>
        {review.pending.note && (
          <span className={projectStyles.itemDescription} dir="auto">
            {review.pending.note}
          </span>
        )}
        {review.pending.link && (
          <a href={review.pending.link} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {review.pending.link}
          </a>
        )}
        {!review.pending.emailSent && review.pending.emailError && (
          <span className={projectStyles.errorText}>Email not sent: {review.pending.emailError}</span>
        )}
        <div>
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={withdraw} aria-disabled={busy}>
            {pending === `withdraw-${milestone.id}` ? 'Withdrawing…' : 'Withdraw request'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {review.changeRequest ? (
        <ChangeRequestAdmin request={review.changeRequest} url={url} action={action} />
      ) : (
        latest && (
          <span className={latest.approved ? projectStyles.successText : projectStyles.muted}>
            {latest.approved ? `Approved by ${latest.by}` : `Changes requested by ${latest.by}`}
            {latest.when ? ` on ${latest.when}` : ''}
            {review.changesRounds > 0 &&
              ` · ${review.changesRounds} revision round${review.changesRounds === 1 ? '' : 's'}`}
          </span>
        )
      )}
      {!review.changeRequest && latest && !latest.approved && latest.response && (
        <span className={projectStyles.itemDescription} dir="auto">
          “{latest.response}”
        </span>
      )}
      {open ? (
        <form className={`${projectStyles.stackForm} ${projectStyles.reviewBox}`} onSubmit={send}>
          <label className={styles.filterLabel} htmlFor={`review-note-${milestone.id}`}>
            What should the client check? (optional)
          </label>
          <textarea
            id={`review-note-${milestone.id}`}
            className={styles.textarea}
            dir="auto"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className={styles.filterLabel} htmlFor={`review-link-${milestone.id}`}>
            Preview link (optional)
          </label>
          <input
            id={`review-link-${milestone.id}`}
            className={styles.input}
            type="url"
            dir="ltr"
            placeholder="https://staging.example.com"
            maxLength={500}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <div className={projectStyles.formActions}>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={busy}>
              {pending === `review-${milestone.id}` ? 'Sending…' : 'Email approval request'}
            </button>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        !signedOff && (
          <div>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setOpen(true)}>
              <BadgeCheck size={15} aria-hidden="true" />
              Request approval
            </button>
            <span className={projectStyles.muted}> Marked done when the client approves it.</span>
          </div>
        )
      )}
    </>
  );
}

function StatusSelect({
  id,
  value,
  onChange,
  busy,
  statuses = WORK_STATUSES,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  busy?: boolean;
  /** The choices offered (tasks: all; milestones: never "done", see MilestoneStatusSelect). */
  statuses?: readonly string[];
}) {
  return (
    <select
      id={id}
      className={`${styles.select} ${projectStyles.compactSelect}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-disabled={busy}
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {WORK_STATUS_LABELS[status as keyof typeof WORK_STATUS_LABELS] ?? status}
        </option>
      ))}
    </select>
  );
}

/**
 * A milestone is done only when the client approves it, so "Done" is never a
 * choice here. A done milestone shows it (read-only) and can be reopened.
 */
function MilestoneStatusSelect({
  id,
  value,
  onChange,
  busy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  busy?: boolean;
}) {
  return (
    <select
      id={id}
      className={`${styles.select} ${projectStyles.compactSelect}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-disabled={busy}
    >
      {value === 'done' && (
        <option value="done" disabled>
          Done · approved by client
        </option>
      )}
      {MILESTONE_ADMIN_STATUSES.map((status) => (
        <option key={status} value={status}>
          {value === 'done' ? `Reopen: ${WORK_STATUS_LABELS[status]}` : WORK_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

function MilestoneRow({
  milestone,
  url,
  isFirst,
  isLast,
  action,
}: {
  milestone: AdminMilestone;
  url: string;
  isFirst: boolean;
  isLast: boolean;
  action: Action;
}) {
  const { run, pending } = action;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description);
  const [dueDate, setDueDate] = useState(milestone.dueDate);
  const [estimatedDays, setEstimatedDays] = useState(milestone.estimatedDays);
  const busy = pending !== null;

  const patch = (key: string, body: Record<string, unknown>) => run(`${key}-${milestone.id}`, url, jsonInit('PATCH', body));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const body = { title, description, dueDate: dueDate || null, estimatedDays: daysValue(estimatedDays) };
    if (await patch('edit', body)) setEditing(false);
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: 'Delete milestone?', message: `“${milestone.title}” will be deleted. Its tasks stay, without a milestone.`, confirmLabel: 'Delete', danger: true }))) return;
    await run(`delete-${milestone.id}`, url, jsonInit('DELETE'));
  };

  return (
    <li className={projectStyles.item}>
      <div className={projectStyles.moveButtons}>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => !isFirst && patch('move', { move: 'up' })}
          aria-disabled={busy || isFirst}
          aria-label={`Move “${milestone.title}” up`}
        >
          <ArrowUp size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => !isLast && patch('move', { move: 'down' })}
          aria-disabled={busy || isLast}
          aria-label={`Move “${milestone.title}” down`}
        >
          <ArrowDown size={15} aria-hidden="true" />
        </button>
      </div>
      <div className={projectStyles.itemMain}>
        {editing ? (
          <form className={projectStyles.stackForm} onSubmit={save}>
            <input
              className={styles.input}
              aria-label="Milestone title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className={styles.textarea}
              aria-label="Milestone description"
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className={projectStyles.formActions}>
              <input
                type="date"
                className={styles.input}
                aria-label="Due date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <input
                type="number"
                className={styles.input}
                aria-label="Estimated days"
                placeholder="Days"
                min={1}
                max={365}
                style={{ width: '6.5rem' }}
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
              />
              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={busy}>
                {pending === `edit-${milestone.id}` ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <span className={projectStyles.itemTitle}>{milestone.title}</span>
            {milestone.description && <span className={projectStyles.itemDescription}>{milestone.description}</span>}
            <span className={projectStyles.muted}>
              {milestone.completedLabel
                ? `Completed ${milestone.completedLabel}`
                : milestone.dueLabel
                  ? `Due ${milestone.dueLabel}`
                  : 'No due date'}
              {milestone.estimatedDays
                ? ` · about ${milestone.estimatedDays} days`
                : ' · no estimate (weighs the average)'}
            </span>
            <ReviewSection milestone={milestone} url={url} action={action} />
          </>
        )}
      </div>
      {!editing && (
        <div className={projectStyles.itemControls}>
          <label className="visually-hidden" htmlFor={`milestone-status-${milestone.id}`}>
            Status of {milestone.title}
          </label>
          <MilestoneStatusSelect
            id={`milestone-status-${milestone.id}`}
            value={milestone.status}
            onChange={async (status) => {
              if (
                milestone.status === 'done' &&
                !(await confirmDialog({
                  title: 'Reopen milestone?',
                  message: `“${milestone.title}” was approved by the client. Reopening it means it needs their approval again to be done.`,
                  confirmLabel: 'Reopen',
                  cancelLabel: 'Keep it done',
                }))
              )
                return;
              await patch('status', { status });
            }}
            busy={busy}
          />
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
            onClick={remove}
            aria-disabled={busy}
            aria-label={`Delete milestone “${milestone.title}”`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function MilestonesPanel({
  projectId,
  milestones,
  lastDue,
}: {
  projectId: string;
  milestones: AdminMilestone[];
  /** The latest due date so far: a new milestone must be due after it. */
  lastDue: { value: string; label: string } | null;
}) {
  const action = useAdminAction();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Until the admin picks a date, it follows the previous milestone: its due date plus the estimated days (or one day).
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [estimatedDays, setEstimatedDays] = useState('');
  const [status, setStatus] = useState('todo');
  const base = `/api/admin/projects/${projectId}/milestones`;
  const earliestDue = lastDue ? addDays(lastDue.value, 1) : undefined;
  const dueValue = dueDate ?? (lastDue ? addDays(lastDue.value, Number(estimatedDays) || 1) : '');

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const created = await action.run(
      'add',
      base,
      jsonInit('POST', { title, description, status, dueDate: dueValue || null, estimatedDays: daysValue(estimatedDays) })
    );
    if (created) {
      setTitle('');
      setDescription('');
      setDueDate(null);
      setEstimatedDays('');
      setStatus('todo');
    }
  };

  return (
    <section className={styles.card} aria-labelledby="milestones-title">
      <div className={styles.cardHeader}>
        <h2 id="milestones-title" className={styles.cardTitle}>
          Milestones
        </h2>
        <span className={styles.cardMeta}>
          Always visible to the client · progress weighs each milestone by its estimated days
        </span>
      </div>
      {action.error && (
        <div className={styles.bannerError} role="alert">
          {action.error}
        </div>
      )}
      {milestones.length === 0 ? (
        <p className={projectStyles.muted}>No milestones yet. Add the first one below.</p>
      ) : (
        <ol className={projectStyles.list}>
          {milestones.map((milestone, index) => (
            <MilestoneRow
              key={milestone.id}
              milestone={milestone}
              url={`${base}/${milestone.id}`}
              isFirst={index === 0}
              isLast={index === milestones.length - 1}
              action={action}
            />
          ))}
        </ol>
      )}

      <form className={`${projectStyles.addForm} ${projectStyles.formGrid}`} onSubmit={handleAdd}>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="milestone-title">
            New milestone
          </label>
          <input
            id="milestone-title"
            className={styles.input}
            required
            maxLength={200}
            placeholder="e.g. Design approved"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="milestone-description">
            Description (optional)
          </label>
          <textarea
            id="milestone-description"
            className={styles.textarea}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="milestone-due">
            Due date
          </label>
          <input
            id="milestone-due"
            type="date"
            className={styles.input}
            min={earliestDue}
            aria-describedby={lastDue ? 'milestone-due-hint' : undefined}
            value={dueValue}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {lastDue && (
            <span id="milestone-due-hint" className={projectStyles.muted}>
              After the previous milestone ({lastDue.label})
            </span>
          )}
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="milestone-days">
            Estimated days
          </label>
          <input
            id="milestone-days"
            type="number"
            className={styles.input}
            min={1}
            max={365}
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="milestone-status">
            Status
          </label>
          <StatusSelect id="milestone-status" value={status} onChange={setStatus} statuses={MILESTONE_ADMIN_STATUSES} />
        </div>
        <div>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} aria-disabled={action.pending !== null}>
            {action.pending === 'add' ? 'Adding…' : 'Add milestone'}
          </button>
        </div>
      </form>
    </section>
  );
}

export { StatusSelect };
