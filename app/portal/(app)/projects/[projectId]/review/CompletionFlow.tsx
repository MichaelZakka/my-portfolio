'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../../_components/useErrorMessage';
import styles from '../../../../portal.module.css';
import completionStyles from '../completion.module.css';
import ReviewSurvey from './ReviewSurvey';

type Answer = 'confirmed' | 'not_yet' | null;

/**
 * Step 1: "is everything delivered?" Yes opens the survey (step 2); "not yet"
 * asks what is missing and tells the admin. A "not yet" can be edited, or
 * turned into a yes once the work is done.
 */
export default function CompletionFlow({
  projectId,
  initialAnswer,
  initialNote,
}: {
  projectId: string;
  initialAnswer: Answer;
  initialNote: string;
}) {
  const t = useTranslations('portal.completion');
  const errorMessage = useErrorMessage();
  const [answer, setAnswer] = useState<Answer>(initialAnswer);
  const [note, setNote] = useState(initialNote);
  const [draft, setDraft] = useState(initialNote);
  const [writing, setWriting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [submitting, setSubmitting] = useState<'confirm' | 'not_yet' | null>(null);
  const [error, setError] = useState('');
  const surveyHeading = useRef<HTMLHeadingElement>(null);
  const confirmedHere = useRef(false);

  // Moving on to the survey: take keyboard and screen-reader users to it.
  useEffect(() => {
    if (answer === 'confirmed' && confirmedHere.current) surveyHeading.current?.focus();
  }, [answer]);

  const send = async (body: { action: 'confirm' } | { action: 'not_yet'; note: string }) => {
    if (submitting) return;
    setError('');
    setSubmitting(body.action);
    try {
      const response = await fetch(`/api/portal/projects/${projectId}/completion`, jsonRequest('POST', body));
      if (response.status === 401) {
        window.location.assign('/portal/login?expired=1');
        return;
      }
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return;
      }
      if (body.action === 'confirm') {
        confirmedHere.current = true;
        setAnswer('confirmed');
      } else {
        setAnswer('not_yet');
        setNote(body.note);
        setWriting(false);
        setJustSaved(true);
      }
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(null);
    }
  };

  if (answer === 'confirmed') {
    return (
      <section className={styles.card} aria-labelledby="survey-title">
        <p className={completionStyles.step}>{t('step2')}</p>
        <h2 id="survey-title" ref={surveyHeading} tabIndex={-1} className={completionStyles.stepTitle}>
          {t('surveyTitle')}
        </h2>
        <ReviewSurvey projectId={projectId} />
      </section>
    );
  }

  const sendNote = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (text) void send({ action: 'not_yet', note: text });
  };

  return (
    <section className={styles.card} aria-labelledby="confirm-title">
      <p className={completionStyles.step}>{t('step1')}</p>
      <h2 id="confirm-title" className={completionStyles.stepTitle}>
        {t('confirmQuestion')}
      </h2>

      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {error}
      </p>

      {writing ? (
        <form className={styles.form} onSubmit={sendNote}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="completion-missing">
              {t('missingLabel')}
            </label>
            <textarea
              id="completion-missing"
              className={styles.textarea}
              dir="auto"
              required
              maxLength={2000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-describedby="completion-missing-hint"
              autoFocus
            />
            <p id="completion-missing-hint" className={styles.hint}>
              {t('missingHint')}
            </p>
          </div>
          <div className={styles.reviewActions}>
            <button type="submit" className="btn btn-primary" aria-disabled={submitting !== null} aria-busy={submitting === 'not_yet'}>
              {submitting === 'not_yet' ? t('sendingMissing') : t('sendMissing')}
            </button>
            <button type="button" className={styles.ghostButton} onClick={() => setWriting(false)}>
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : answer === 'not_yet' ? (
        <div className={completionStyles.notYet}>
          {justSaved && (
            <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              {t('notYetSaved')}
            </p>
          )}
          <p className={styles.label}>{t('yourNote')}</p>
          <blockquote className={completionStyles.note} dir="auto">
            {note}
          </blockquote>
          <div className={styles.reviewActions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => send({ action: 'confirm' })}
              aria-disabled={submitting !== null}
              aria-busy={submitting === 'confirm'}
            >
              {submitting === 'confirm' ? t('confirming') : t('confirmNow')}
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => {
                setDraft(note);
                setJustSaved(false);
                setWriting(true);
              }}
            >
              {t('editNote')}
            </button>
          </div>
        </div>
      ) : (
        <div className={completionStyles.choices}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => send({ action: 'confirm' })}
            aria-disabled={submitting !== null}
            aria-busy={submitting === 'confirm'}
          >
            {submitting === 'confirm' ? t('confirming') : t('confirmYes')}
          </button>
          <button type="button" className={styles.ghostButton} onClick={() => setWriting(true)}>
            {t('confirmNo')}
          </button>
        </div>
      )}
    </section>
  );
}
