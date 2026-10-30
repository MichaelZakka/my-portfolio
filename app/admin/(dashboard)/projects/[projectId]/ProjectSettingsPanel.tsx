'use client';

import { FormEvent, useState } from 'react';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../../../lib/portal/constants';
import { jsonInit, useAdminAction } from '../useAdminAction';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

type Props = {
  project: {
    id: string;
    name: string;
    summary: string;
    status: string;
    currentPhase: string;
    /** YYYY-MM-DD or "" */
    estimatedCompletion: string;
    archived: boolean;
  };
};

export default function ProjectSettingsPanel({ project }: Props) {
  const { run, pending, error } = useAdminAction();
  const [form, setForm] = useState({
    name: project.name,
    summary: project.summary,
    status: project.status,
    currentPhase: project.currentPhase,
    estimatedCompletion: project.estimatedCompletion,
  });
  const [saved, setSaved] = useState('');

  const changes = Object.fromEntries(
    Object.entries(form).filter(([key, value]) => value !== project[key as keyof typeof form])
  );
  const hasChanges = Object.keys(changes).length > 0;
  const update = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved('');
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;
    const body: Record<string, string | null> = { ...changes };
    if ('estimatedCompletion' in body && !body.estimatedCompletion) body.estimatedCompletion = null;
    const result = await run('save', `/api/admin/projects/${project.id}`, jsonInit('PATCH', body));
    if (result) {
      setSaved(
        'status' in changes ? 'Saved. Clients with access are emailed about the new status.' : 'Saved.'
      );
    }
  };

  const toggleArchive = async () => {
    const message = project.archived
      ? 'Restore this project? Clients can message and upload again.'
      : 'Archive this project? Clients keep read-only access to its history and files.';
    if (!window.confirm(message)) return;
    await run('archive', `/api/admin/projects/${project.id}`, jsonInit('PATCH', { archived: !project.archived }));
  };

  return (
    <section className={styles.card} aria-labelledby="settings-title">
      <div className={styles.cardHeader}>
        <h2 id="settings-title" className={styles.cardTitle}>
          Project details
        </h2>
      </div>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className={styles.bannerSuccess} role="status">
          {saved}
        </div>
      )}
      <form className={projectStyles.stackForm} onSubmit={handleSave}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="settings-name">
            Name
          </label>
          <input
            id="settings-name"
            className={styles.input}
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => update('name')(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="settings-status">
            Status
          </label>
          <select
            id="settings-status"
            className={styles.select}
            value={form.status}
            onChange={(e) => update('status')(e.target.value)}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="settings-phase">
            Current phase
          </label>
          <input
            id="settings-phase"
            className={styles.input}
            maxLength={200}
            value={form.currentPhase}
            onChange={(e) => update('currentPhase')(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="settings-eta">
            Estimated completion
          </label>
          <input
            id="settings-eta"
            type="date"
            className={styles.input}
            value={form.estimatedCompletion}
            onChange={(e) => update('estimatedCompletion')(e.target.value)}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="settings-summary">
            Summary (visible to the client)
          </label>
          <textarea
            id="settings-summary"
            className={styles.textarea}
            maxLength={5000}
            value={form.summary}
            onChange={(e) => update('summary')(e.target.value)}
          />
        </div>
        <div className={projectStyles.formActions}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            aria-disabled={!hasChanges || pending !== null}
          >
            {pending === 'save' ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={toggleArchive}
            aria-disabled={pending !== null}
          >
            {pending === 'archive' ? 'Working…' : project.archived ? 'Restore project' : 'Archive project'}
          </button>
        </div>
      </form>
    </section>
  );
}
