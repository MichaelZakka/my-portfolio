'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../_components/useErrorMessage';
import styles from '../../../portal.module.css';

type Action = 'approve' | 'changes';

/**
 * Approve the milestone (it becomes Done) or say what should change (it
 * reopens). The thank-you stays on screen even if the refresh that re-renders
 * the milestone is skipped (see LiveSections on Next 16.1.1).
 */
export default function MilestoneReviewForm({ projectId, milestoneId }: { projectId: string; milestoneId: string }) {
  const t = useTranslations('portal.project');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [done, setDone] = useState<Action | null>(null);

  const submit = async (action: Action) => {
    if (submitting) return;
    setError('');
    setSubmitting(action);
    try {
      const response = await fetch(
        `/api/portal/projects/${projectId}/milestones/${milestoneId}/review`,
        jsonRequest('POST', { action, comment: action === 'changes' ? comment : '' })
      );
      if (response.status === 401) {
        window.location.assign('/portal/login?expired=1');
        return;
      }
      const body = await readJson<ApiErrorBody>(response);
      if (!response.ok) {
        setError(errorMessage(body));
        return;
      }
      setDone(action);
      router.refresh();
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(null);
    }
  };

  if (done) {
    return (
      <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
        {done === 'approve' ? t('reviewThanksApproved') : t('reviewThanksChanges')}
      </p>
    );
  }

  const handleChanges = (event: FormEvent) => {
    event.preventDefault();
    submit('changes');
  };

  return (
    <>
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>
      {writing ? (
        <form className={styles.form} onSubmit={handleChanges}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`review-changes-${milestoneId}`}>
              {t('reviewChangesLabel')}
            </label>
            <textarea
              id={`review-changes-${milestoneId}`}
              className={styles.textarea}
              dir="auto"
              required
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className={styles.reviewActions}>
            <button type="submit" className="btn btn-primary" aria-disabled={submitting !== null} aria-busy={submitting !== null}>
              {submitting ? t('reviewSending') : t('reviewSendChanges')}
            </button>
            <button type="button" className={styles.ghostButton} onClick={() => setWriting(false)}>
              {t('reviewCancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.reviewActions}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => submit('approve')}
            aria-disabled={submitting !== null}
            aria-busy={submitting === 'approve'}
          >
            {submitting === 'approve' ? t('reviewApproving') : t('reviewApprove')}
          </button>
          <button type="button" className={styles.ghostButton} onClick={() => setWriting(true)}>
            {t('reviewRequestChanges')}
          </button>
        </div>
      )}
    </>
  );
}
