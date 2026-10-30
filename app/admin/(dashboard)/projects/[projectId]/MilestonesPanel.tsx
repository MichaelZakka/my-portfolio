'use client';

import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { WORK_STATUSES, WORK_STATUS_LABELS } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export type AdminMilestone = {
  id: string;
  title: string;
  description: string;
  status: string;
  /** YYYY-MM-DD or "" */
  dueDate: string;
  dueLabel: string | null;
  completedLabel: string | null;
};

type Action = ReturnType<typeof useAdminAction>;

function StatusSelect({ id, value, onChange, disabled }: { id: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <select
      id={id}
      className={`${styles.select} ${projectStyles.compactSelect}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {WORK_STATUSES.map((status) => (
        <option key={status} value={status}>
          {WORK_STATUS_LABELS[status]}
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
  const busy = pending !== null;

  const patch = (key: string, body: Record<string, unknown>) => run(`${key}-${milestone.id}`, url, jsonInit('PATCH', body));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (await patch('edit', { title, description, dueDate: dueDate || null })) setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`Delete milestone “${milestone.title}”? Its tasks stay, without a milestone.`)) return;
    await run(`delete-${milestone.id}`, url, jsonInit('DELETE'));
  };

  return (
    <li className={projectStyles.item}>
      <div className={projectStyles.moveButtons}>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => patch('move', { move: 'up' })}
          disabled={busy || isFirst}
          aria-label={`Move “${milestone.title}” up`}
        >
          <ArrowUp size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => patch('move', { move: 'down' })}
          disabled={busy || isLast}
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
              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={busy}>
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
            </span>
          </>
        )}
      </div>
      {!editing && (
        <div className={projectStyles.itemControls}>
          <label className="visually-hidden" htmlFor={`milestone-status-${milestone.id}`}>
            Status of {milestone.title}
          </label>
          <StatusSelect
            id={`milestone-status-${milestone.id}`}
            value={milestone.status}
            onChange={(status) => patch('status', { status })}
            disabled={busy}
          />
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
            onClick={remove}
            disabled={busy}
            aria-label={`Delete milestone “${milestone.title}”`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function MilestonesPanel({ projectId, milestones }: { projectId: string; milestones: AdminMilestone[] }) {
  const action = useAdminAction();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('todo');
  const base = `/api/admin/projects/${projectId}/milestones`;

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const created = await action.run(
      'add',
      base,
      jsonInit('POST', { title, description, status, dueDate: dueDate || null })
    );
    if (created) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setStatus('todo');
    }
  };

  return (
    <section className={styles.card} aria-labelledby="milestones-title">
      <div className={styles.cardHeader}>
        <h2 id="milestones-title" className={styles.cardTitle}>
          Milestones
        </h2>
        <span className={styles.cardMeta}>Always visible to the client · progress = share marked Done</span>
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
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="milestone-status">
            Status
          </label>
          <StatusSelect id="milestone-status" value={status} onChange={setStatus} />
        </div>
        <div>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={action.pending !== null}>
            {action.pending === 'add' ? 'Adding…' : 'Add milestone'}
          </button>
        </div>
      </form>
    </section>
  );
}

export { StatusSelect };
