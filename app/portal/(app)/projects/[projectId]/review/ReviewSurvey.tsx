'use client';

import { FormEvent, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  COMMUNICATION_RATINGS,
  REVIEW_PAIN_POINTS,
  REVIEW_TEXT_MAX_LENGTH,
  SERVICE_RATINGS,
  type ReviewPainPoint,
} from '../../../../../lib/portal/constants';
import { jsonRequest, readJson, useErrorMessage, type ApiErrorBody } from '../../../../_components/useErrorMessage';
import styles from '../../../../portal.module.css';
import completionStyles from '../completion.module.css';

type OptionalRating = (typeof SERVICE_RATINGS)[number] | (typeof COMMUNICATION_RATINGS)[number];
type TextField = 'portalComment' | 'wentWell' | 'improve' | 'otherComment';

type Answers = {
  overall: number | null;
  recommend: number | null;
  portalEase: number | null;
  painPoints: ReviewPainPoint[];
} & Record<OptionalRating, number | null> &
  Record<TextField, string>;

const EMPTY: Answers = {
  overall: null,
  recommend: null,
  portalEase: null,
  painPoints: [],
  quality: null,
  deadlines: null,
  requirements: null,
  value: null,
  responsiveness: null,
  updates: null,
  involvement: null,
  portalComment: '',
  wentWell: '',
  improve: '',
  otherComment: '',
};

/** The private review: two required ratings, everything else optional. Locks once submitted. */
export default function ReviewSurvey({ projectId }: { projectId: string }) {
  const t = useTranslations('portal.completion');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showMissing, setShowMissing] = useState(false);
  const [done, setDone] = useState(false);

  // Every rating is required; only the pain points and the text answers may be left empty.
  const numberFields = ['overall', 'recommend', 'portalEase', ...SERVICE_RATINGS, ...COMMUNICATION_RATINGS] as const;
  const missingFields = numberFields.filter((field) => answers[field] === null);
  const isMissing = (field: (typeof numberFields)[number]) => showMissing && answers[field] === null;
  const missingRequired = showMissing && missingFields.length > 0;

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  const togglePainPoint = (point: ReviewPainPoint) =>
    setAnswers((current) => ({
      ...current,
      painPoints: current.painPoints.includes(point)
        ? current.painPoints.filter((p) => p !== point)
        : [...current.painPoints, point],
    }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (missingFields.length > 0) {
      setShowMissing(true);
      setError('');
      document.getElementById(`scale-${missingFields[0]}`)?.querySelector('input')?.focus();
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`/api/portal/projects/${projectId}/review`, jsonRequest('POST', answers));
      if (response.status === 401) {
        window.location.assign('/portal/login?expired=1');
        return;
      }
      if (!response.ok) {
        setError(errorMessage(await readJson<ApiErrorBody>(response)));
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Re-renders the page as the read-only copy; the thank-you below stays if that refresh is skipped.
      router.refresh();
    } catch {
      setError(errorMessage({ code: 'network' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className={`${styles.alert} ${styles.alertSuccess}`} role="status">
        {t('thanksBody')}
      </p>
    );
  }

  const ratingScale = (field: OptionalRating) => (
    <Scale
      key={field}
      id={`scale-${field}`}
      legend={t(`ratings.${field}`)}
      value={answers[field]}
      onChange={(value) => set(field, value)}
      min={1}
      max={5}
      low={t('ratingLow')}
      high={t('ratingHigh')}
      tag={t('required')}
      required
      invalid={isMissing(field)}
      compact
    />
  );

  return (
    <form className={completionStyles.survey} onSubmit={submit} noValidate>
      <div className={completionStyles.group}>
        <h3 className={completionStyles.groupTitle}>{t('sectionOverall')}</h3>
        <Scale
          id="scale-overall"
          legend={t('overallLabel')}
          value={answers.overall}
          onChange={(value) => set('overall', value)}
          min={1}
          max={5}
          low={t('ratingLow')}
          high={t('ratingHigh')}
          tag={t('required')}
          required
          invalid={isMissing('overall')}
        />
        <Scale
          id="scale-recommend"
          legend={t('recommendLabel')}
          value={answers.recommend}
          onChange={(value) => set('recommend', value)}
          min={0}
          max={10}
          low={t('recommendLow')}
          high={t('recommendHigh')}
          tag={t('required')}
          required
          invalid={isMissing('recommend')}
        />
      </div>

      <div className={completionStyles.group}>
        <h3 className={completionStyles.groupTitle}>{t('sectionPortal')}</h3>
        <Scale
          id="scale-portalEase"
          legend={t('portalEaseLabel')}
          value={answers.portalEase}
          onChange={(value) => set('portalEase', value)}
          min={1}
          max={5}
          low={t('easeLow')}
          high={t('easeHigh')}
          tag={t('required')}
          required
          invalid={isMissing('portalEase')}
        />
        <fieldset className={completionStyles.question}>
          <legend className={completionStyles.legend}>
            {t('painPointsLabel')} <span className={completionStyles.tag}>{t('optional')}</span>
          </legend>
          <div className={completionStyles.chips}>
            {REVIEW_PAIN_POINTS.map((point) => (
              <label key={point} className={completionStyles.chip}>
                <input
                  type="checkbox"
                  checked={answers.painPoints.includes(point)}
                  onChange={() => togglePainPoint(point)}
                />
                <span>{t(`painPoints.${point}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextQuestion
          id="review-portal-comment"
          label={t('portalCommentLabel')}
          tag={t('optional')}
          value={answers.portalComment}
          onChange={(value) => set('portalComment', value)}
        />
      </div>

      <div className={completionStyles.group}>
        <h3 className={completionStyles.groupTitle}>{t('sectionService')}</h3>
        <div className={completionStyles.ratingList}>{SERVICE_RATINGS.map(ratingScale)}</div>
      </div>

      <div className={completionStyles.group}>
        <h3 className={completionStyles.groupTitle}>{t('sectionCommunication')}</h3>
        <div className={completionStyles.ratingList}>{COMMUNICATION_RATINGS.map(ratingScale)}</div>
      </div>

      <div className={completionStyles.group}>
        <h3 className={completionStyles.groupTitle}>{t('sectionOpen')}</h3>
        <TextQuestion
          id="review-went-well"
          label={t('wentWellLabel')}
          tag={t('optional')}
          value={answers.wentWell}
          onChange={(value) => set('wentWell', value)}
        />
        <TextQuestion
          id="review-improve"
          label={t('improveLabel')}
          tag={t('optional')}
          value={answers.improve}
          onChange={(value) => set('improve', value)}
        />
        <TextQuestion
          id="review-other"
          label={t('otherLabel')}
          tag={t('optional')}
          value={answers.otherComment}
          onChange={(value) => set('otherComment', value)}
        />
      </div>

      {/* The "required" message clears itself once both required questions have an answer. */}
      <p className={`${styles.alert} ${styles.alertError}`} role="alert">
        {missingRequired ? t('missingRequired') : error}
      </p>
      <div className={completionStyles.submitRow}>
        <button type="submit" className="btn btn-primary" aria-disabled={submitting} aria-busy={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </button>
        <p className={styles.hint}>{t('lockedNote')}</p>
      </div>
    </form>
  );
}

/**
 * A numeric scale as a radio group: native radios (arrow keys move between
 * them), drawn as numbered buttons with the two ends labelled.
 */
function Scale({
  id,
  legend,
  value,
  onChange,
  min,
  max,
  low,
  high,
  tag,
  required = false,
  invalid = false,
  clearLabel,
  compact = false,
}: {
  id?: string;
  legend: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  low: string;
  high: string;
  tag: string;
  required?: boolean;
  invalid?: boolean;
  clearLabel?: string;
  compact?: boolean;
}) {
  const name = useId();
  const labelId = `${name}-label`;
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelId}
      className={completionStyles.question}
      data-compact={compact || undefined}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
    >
      <p id={labelId} className={completionStyles.legend}>
        {legend} <span className={completionStyles.tag} data-required={required || undefined}>{tag}</span>
      </p>
      <div className={completionStyles.scaleRow}>
        <div className={completionStyles.scaleBox}>
          <div className={completionStyles.scale} data-count={options.length}>
            {options.map((option) => (
              <label key={option} className={completionStyles.scaleOption}>
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  aria-label={option === min ? `${option} (${low})` : option === max ? `${option} (${high})` : String(option)}
                />
                <span aria-hidden="true">{option}</span>
              </label>
            ))}
          </div>
          <div className={completionStyles.scaleEnds} aria-hidden="true">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
        {/* Always rendered for optional scales (hidden until something is picked), so rows stay aligned. */}
        {!required && clearLabel && (
          <button
            type="button"
            className={completionStyles.clear}
            onClick={() => onChange(null)}
            data-hidden={value === null || undefined}
            aria-hidden={value === null || undefined}
            tabIndex={value === null ? -1 : undefined}
          >
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function TextQuestion({
  id,
  label,
  tag,
  value,
  onChange,
}: {
  id: string;
  label: string;
  tag: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={completionStyles.legend} htmlFor={id}>
        {label} <span className={completionStyles.tag}>{tag}</span>
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        dir="auto"
        maxLength={REVIEW_TEXT_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
