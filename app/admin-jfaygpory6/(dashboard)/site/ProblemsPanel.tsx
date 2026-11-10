'use client';

import { CheckCircle2 } from 'lucide-react';
import { jsonInit, useAdminAction } from '../projects/useAdminAction';
import styles from '../../admin.module.css';
import projectStyles from '../projects/projects.module.css';

export type Problem = {
  id: string;
  source: string;
  message: string;
  detail: string | null;
  path: string | null;
  count: number;
  firstSeen: string;
  lastSeen: string;
  alerted: string | null;
};

/**
 * Open problems recorded by the error monitor (app/lib/monitoring.ts), newest
 * first. Resolving one silences it; if it happens again it reopens and alerts.
 */
export default function ProblemsPanel({ problems }: { problems: Problem[] }) {
  const { run, pending, error } = useAdminAction();
  const resolve = (body: { id: string } | { all: true }, key: string) => run(key, '/api/admin/errors', jsonInit('POST', body));

  return (
    <section id="errors" className={styles.card} aria-labelledby="problems-title">
      <div className={styles.cardHeader}>
        <h2 id="problems-title" className={styles.cardTitle}>
          Problems
        </h2>
        <span className={styles.cardMeta}>
          Failed uploads and emails, crashed pages and server errors · you are alerted on the first one and at most hourly
        </span>
      </div>
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {problems.length === 0 ? (
        <p className={projectStyles.successText} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={15} aria-hidden="true" />
          No open problems.
        </p>
      ) : (
        <>
          <ul className={projectStyles.list}>
            {problems.map((problem) => (
              <li key={problem.id} className={projectStyles.item}>
                <div className={projectStyles.itemMain}>
                  <div className={projectStyles.titleRow}>
                    <span className={`${styles.badge} ${styles.badgeLost}`}>{problem.source}</span>
                    <span className={projectStyles.itemTitle}>{problem.message}</span>
                  </div>
                  <span className={projectStyles.muted}>
                    {problem.count > 1 ? `${problem.count} times · first ${problem.firstSeen} · ` : ''}last {problem.lastSeen}
                    {problem.path ? ` · ${problem.path}` : ''}
                    {problem.alerted ? ` · alerted ${problem.alerted}` : ' · no alert delivered'}
                  </span>
                  {problem.detail && (
                    <details>
                      <summary className={projectStyles.muted} style={{ cursor: 'pointer' }}>
                        Details
                      </summary>
                      <pre
                        style={{
                          margin: '0.4rem 0 0',
                          padding: '0.6rem',
                          borderRadius: 8,
                          background: 'var(--bg)',
                          fontSize: '0.72rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 260,
                          overflow: 'auto',
                        }}
                      >
                        {problem.detail}
                      </pre>
                    </details>
                  )}
                </div>
                <div className={projectStyles.itemControls}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => resolve({ id: problem.id }, `resolve-${problem.id}`)}
                    aria-disabled={pending !== null}
                  >
                    {pending === `resolve-${problem.id}` ? 'Resolving…' : 'Mark resolved'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {problems.length > 1 && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ marginTop: '0.75rem' }}
              onClick={() => resolve({ all: true }, 'resolve-all')}
              aria-disabled={pending !== null}
            >
              {pending === 'resolve-all' ? 'Resolving…' : 'Mark all resolved'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
