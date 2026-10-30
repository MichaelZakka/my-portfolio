'use client';

import { FormEvent, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { StatusSelect } from './MilestonesPanel';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export type AdminTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  milestoneId: string | null;
  visibleToClient: boolean;
};

type MilestoneOption = { id: string; title: string };
type Action = ReturnType<typeof useAdminAction>;

function MilestoneSelect({
  id,
  value,
  milestones,
  onChange,
  disabled,
}: {
  id: string;
  value: string | null;
  milestones: MilestoneOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      className={`${styles.select} ${projectStyles.compactSelect}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
    >
      <option value="">No milestone</option>
      {milestones.map((milestone) => (
        <option key={milestone.id} value={milestone.id}>
          {milestone.title}
        </option>
      ))}
    </select>
  );
}

function TaskRow({
  task,
  url,
  isFirst,
  isLast,
  milestones,
  action,
}: {
  task: AdminTask;
  url: string;
  isFirst: boolean;
  isLast: boolean;
  milestones: MilestoneOption[];
  action: Action;
}) {
  const { run, pending } = action;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const busy = pending !== null;

  const patch = (key: string, body: Record<string, unknown>) => run(`${key}-${task.id}`, url, jsonInit('PATCH', body));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (await patch('edit', { title, description })) setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`Delete task “${task.title}”?`)) return;
    await run(`delete-${task.id}`, url, jsonInit('DELETE'));
  };

  return (
    <li className={projectStyles.item}>
      <div className={projectStyles.moveButtons}>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => patch('move', { move: 'up' })}
          disabled={busy || isFirst}
          aria-label={`Move “${task.title}” up`}
        >
          <ArrowUp size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={projectStyles.iconButton}
          onClick={() => patch('move', { move: 'down' })}
          disabled={busy || isLast}
          aria-label={`Move “${task.title}” down`}
        >
          <ArrowDown size={15} aria-hidden="true" />
        </button>
      </div>
      <div className={projectStyles.itemMain}>
        {editing ? (
          <form className={projectStyles.stackForm} onSubmit={save}>
            <input
              className={styles.input}
              aria-label="Task title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className={styles.textarea}
              aria-label="Task description"
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className={projectStyles.formActions}>
              <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={busy}>
                {pending === `edit-${task.id}` ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <span className={projectStyles.itemTitle}>
              {task.title}{' '}
              {!task.visibleToClient && <span className={projectStyles.internalTag}>Internal</span>}
            </span>
            {task.description && <span className={projectStyles.itemDescription}>{task.description}</span>}
            <div className={projectStyles.itemControls}>
              <label className="visually-hidden" htmlFor={`task-status-${task.id}`}>
                Status of {task.title}
              </label>
              <StatusSelect
                id={`task-status-${task.id}`}
                value={task.status}
                onChange={(status) => patch('status', { status })}
                disabled={busy}
              />
              <label className="visually-hidden" htmlFor={`task-milestone-${task.id}`}>
                Milestone of {task.title}
              </label>
              <MilestoneSelect
                id={`task-milestone-${task.id}`}
                value={task.milestoneId}
                milestones={milestones}
                onChange={(milestoneId) => patch('milestone', { milestoneId })}
                disabled={busy}
              />
              <label className={projectStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={task.visibleToClient}
                  onChange={(e) => patch('visibility', { visibleToClient: e.target.checked })}
                  disabled={busy}
                />
                Visible to client
              </label>
            </div>
          </>
        )}
      </div>
      {!editing && (
        <div className={projectStyles.itemControls}>
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            className={`${projectStyles.iconButton} ${projectStyles.iconButtonDanger}`}
            onClick={remove}
            disabled={busy}
            aria-label={`Delete task “${task.title}”`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function TasksPanel({
  projectId,
  tasks,
  milestones,
}: {
  projectId: string;
  tasks: AdminTask[];
  milestones: MilestoneOption[];
}) {
  const action = useAdminAction();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [status, setStatus] = useState('todo');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const base = `/api/admin/projects/${projectId}/tasks`;

  // Tasks are ordered within their milestone, so they are listed (and moved) per group.
  const groups = [
    ...milestones.map((milestone) => ({
      key: milestone.id,
      title: milestone.title,
      tasks: tasks.filter((task) => task.milestoneId === milestone.id),
    })),
    { key: 'none', title: 'No milestone', tasks: tasks.filter((task) => !task.milestoneId) },
  ].filter((group) => group.tasks.length > 0);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const created = await action.run(
      'add',
      base,
      jsonInit('POST', { title, description, status, milestoneId, visibleToClient })
    );
    if (created) {
      setTitle('');
      setDescription('');
      setStatus('todo');
    }
  };

  return (
    <section className={styles.card} aria-labelledby="tasks-title">
      <div className={styles.cardHeader}>
        <h2 id="tasks-title" className={styles.cardTitle}>
          Tasks
        </h2>
        <span className={styles.cardMeta}>Clients only see tasks marked “Visible to client”</span>
      </div>
      {action.error && (
        <div className={styles.bannerError} role="alert">
          {action.error}
        </div>
      )}
      {groups.length === 0 ? (
        <p className={projectStyles.muted}>No tasks yet.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key}>
            <h3 className={projectStyles.groupTitle}>{group.title}</h3>
            <ul className={projectStyles.list}>
              {group.tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  url={`${base}/${task.id}`}
                  isFirst={index === 0}
                  isLast={index === group.tasks.length - 1}
                  milestones={milestones}
                  action={action}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      <form className={`${projectStyles.addForm} ${projectStyles.formGrid}`} onSubmit={handleAdd}>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="task-title">
            New task
          </label>
          <input
            id="task-title"
            className={styles.input}
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className={`${styles.filterField} ${projectStyles.fieldWide}`}>
          <label className={styles.filterLabel} htmlFor="task-description">
            Description (optional)
          </label>
          <textarea
            id="task-description"
            className={styles.textarea}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="task-milestone">
            Milestone
          </label>
          <MilestoneSelect id="task-milestone" value={milestoneId} milestones={milestones} onChange={setMilestoneId} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="task-status">
            Status
          </label>
          <StatusSelect id="task-status" value={status} onChange={setStatus} />
        </div>
        <label className={projectStyles.checkboxLabel}>
          <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisibleToClient(e.target.checked)} />
          Visible to client
        </label>
        <div>
          <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={action.pending !== null}>
            {action.pending === 'add' ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </form>
    </section>
  );
}
