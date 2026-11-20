import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requireAdminSession } from '../../../lib/session';
import {
  getReviewsDashboard,
  parsePainPoints,
  reviewerLabel,
  type ReviewsDashboard,
} from '../../../lib/portal/completion';
import {
  COMMUNICATION_RATINGS,
  REVIEW_PAIN_POINT_LABELS,
  REVIEW_RATING_LABELS,
  SERVICE_RATINGS,
} from '../../../lib/portal/constants';
import { formatDateTime } from '../../../lib/portal/format';
import EmptyState from '../../_components/EmptyState';
import KpiCard from '../../_components/KpiCard';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Client reviews' };

const ADMIN = '/admin-jfaygpory6';

const oneDecimal = (value: number | null) => (value === null ? '—' : value.toFixed(1));
const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/** NPS bands for one answer. */
function recommendBand(score: number) {
  if (score >= 9) return { label: 'Promoter', tone: 'good' };
  if (score >= 7) return { label: 'Passive', tone: 'neutral' };
  return { label: 'Detractor', tone: 'bad' };
}

const scoreTone = (score: number, max = 5) => (score / max >= 0.8 ? 'good' : score / max >= 0.6 ? 'neutral' : 'bad');

export default async function ClientReviewsPage() {
  await requireAdminSession();
  const { reviews, pending, summary } = await getReviewsDashboard();

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Client reviews</h1>
        <p className={styles.pageSubtitle}>
          What clients say when a project is completed: the service, communication and the portal itself.
        </p>
        <p className={pageStyles.private}>
          <Lock size={13} aria-hidden="true" />
          Private: reviews only appear here, never on the site.
        </p>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard
          label="Reviews"
          value={summary.count}
          hint={
            summary.roundsTotal
              ? `${summary.projectsReviewed} of ${summary.roundsTotal} completion${summary.roundsTotal === 1 ? '' : 's'} reviewed`
              : 'No completed projects yet'
          }
        />
        <KpiCard label="Satisfaction" value={summary.overall === null ? '—' : `${oneDecimal(summary.overall)} / 5`} hint="Average overall rating" />
        <KpiCard
          label="Recommend (NPS)"
          value={summary.nps === null ? '—' : signed(summary.nps)}
          hint={summary.npsAnswers ? `From ${summary.npsAnswers} answer${summary.npsAnswers === 1 ? '' : 's'} · −100 to +100` : 'No answers yet'}
        />
        <KpiCard
          label="Portal ease"
          value={summary.portalEase === null ? '—' : `${oneDecimal(summary.portalEase)} / 5`}
          hint="How easy clients found the portal"
        />
      </div>

      {pending.length > 0 && <PendingCard pending={pending} />}

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="When you mark a project Completed, its clients are asked to confirm it and review the work. Their answers show up here."
        />
      ) : (
        <>
          <div className={styles.grid2}>
            <section className={styles.card} aria-labelledby="ratings-title">
              <div className={styles.cardHeader}>
                <h2 id="ratings-title" className={styles.cardTitle}>
                  Service &amp; communication
                </h2>
                <span className={styles.cardMeta}>Average, 1–5 (skipped answers left out)</span>
              </div>
              <h3 className={pageStyles.subheading}>Service</h3>
              <RatingBars items={summary.service.map(({ field, value }) => ({ label: REVIEW_RATING_LABELS[field], value }))} />
              <h3 className={pageStyles.subheading}>Communication</h3>
              <RatingBars
                items={summary.communication.map(({ field, value }) => ({ label: REVIEW_RATING_LABELS[field], value }))}
              />
            </section>
            <section className={styles.card} aria-labelledby="pain-title">
              <div className={styles.cardHeader}>
                <h2 id="pain-title" className={styles.cardTitle}>
                  Portal pain points
                </h2>
                <span className={styles.cardMeta}>Times flagged as hard or confusing</span>
              </div>
              {summary.painPoints.length === 0 ? (
                <p className={pageStyles.muted}>No client has flagged any part of the portal.</p>
              ) : (
                <CountBars
                  items={summary.painPoints.map(({ point, count }) => ({ label: REVIEW_PAIN_POINT_LABELS[point], value: count }))}
                  total={summary.count}
                />
              )}
            </section>
          </div>

          <h2 className={pageStyles.listTitle}>All reviews</h2>
          <ul className={pageStyles.list}>
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PendingCard({ pending }: { pending: ReviewsDashboard['pending'] }) {
  const notYet = pending.filter((p) => p.state === 'not_yet').length;
  return (
    <section className={styles.card} aria-labelledby="pending-title">
      <div className={styles.cardHeader}>
        <h2 id="pending-title" className={styles.cardTitle}>
          Waiting on clients
        </h2>
        <span className={styles.cardMeta}>
          {pending.length} open sign-off{pending.length === 1 ? '' : 's'}
          {notYet ? ` · ${notYet} say the project is not complete` : ''}
        </span>
      </div>
      <ul className={pageStyles.pendingList}>
        {pending.map((item) => (
          <li key={item.key} data-state={item.state}>
            <div className={pageStyles.pendingHead}>
              <Link href={`${ADMIN}/projects/${item.projectId}`} className={styles.link}>
                {item.projectName}
              </Link>
              <span className={pageStyles.muted}>{item.client}</span>
              <span className={pageStyles.stateTag} data-state={item.state}>
                {item.state === 'not_yet'
                  ? 'Not complete yet'
                  : item.state === 'confirmed'
                    ? 'Confirmed · review not sent'
                    : 'No answer yet'}
              </span>
              <span className={pageStyles.time}>
                {item.state === 'unanswered' || !item.answeredAt
                  ? `Completed ${formatDateTime(item.openedAt, 'en')}`
                  : `Answered ${formatDateTime(item.answeredAt, 'en')}`}
              </span>
            </div>
            {item.missingNote && (
              <p className={pageStyles.quote} dir="auto">
                {item.missingNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RatingBars({ items }: { items: { label: string; value: number | null }[] }) {
  return (
    <ul className={pageStyles.ratingBars}>
      {items.map((item) => (
        <li key={item.label}>
          <span className={pageStyles.ratingLabel}>{item.label}</span>
          <span className={pageStyles.ratingTrack} aria-hidden="true">
            {item.value !== null && (
              <span
                className={pageStyles.ratingFill}
                data-tone={scoreTone(item.value)}
                style={{ width: `${(item.value / 5) * 100}%` }}
              />
            )}
          </span>
          <span className={pageStyles.ratingValue}>
            {item.value === null ? (
              <span className={pageStyles.muted}>No answers</span>
            ) : (
              <>
                {oneDecimal(item.value)}
                <span className="visually-hidden"> out of 5</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Label and count on one line, the bar under it (long labels never truncate in the narrow column). */
function CountBars({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  return (
    <ul className={pageStyles.ratingBars} data-stacked>
      {items.map((item) => (
        <li key={item.label}>
          <span className={pageStyles.ratingLabel}>{item.label}</span>
          <span className={pageStyles.ratingTrack} aria-hidden="true">
            <span className={pageStyles.ratingFill} style={{ width: `${(item.value / Math.max(1, total)) * 100}%` }} />
          </span>
          <span className={pageStyles.ratingValue}>
            {item.value}
            <span className={pageStyles.muted}> of {total}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className={pageStyles.stars} role="img" aria-label={`${value} out of 5`}>
      {'★'.repeat(value)}
      <span className={pageStyles.starsOff}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function ReviewItem({ review }: { review: ReviewsDashboard['reviews'][number] }) {
  const painPoints = parsePainPoints(review.painPoints);
  const band = review.recommend === null ? null : recommendBand(review.recommend);
  const texts = [
    { label: 'What went well', value: review.wentWell },
    { label: 'What could have been better', value: review.improve },
    { label: 'What confused or slowed them down in the portal', value: review.portalComment },
    { label: 'Anything else', value: review.otherComment },
  ].filter((text) => text.value);

  return (
    <li id={`review-${review.id}`} className={pageStyles.item}>
      <div className={pageStyles.head}>
        <div>
          <Link href={`${ADMIN}/projects/${review.project.id}`} className={`${styles.link} ${pageStyles.project}`}>
            {review.project.name}
          </Link>
          <span className={pageStyles.reviewer}>
            {reviewerLabel(review)}
            {review.reviewerEmail && (
              <a href={`mailto:${review.reviewerEmail}`} className={pageStyles.email} dir="ltr">
                {review.reviewerEmail}
              </a>
            )}
          </span>
        </div>
        <span className={pageStyles.time}>
          {review.submittedAt ? formatDateTime(review.submittedAt, 'en') : ''}
          {review.locale === 'ar' ? ' · answered in Arabic' : ''}
        </span>
      </div>

      <div className={pageStyles.scores}>
        <div className={pageStyles.score}>
          <span className={pageStyles.scoreLabel}>Overall</span>
          {review.overall !== null ? <Stars value={review.overall} /> : '—'}
        </div>
        <div className={pageStyles.score}>
          <span className={pageStyles.scoreLabel}>Recommend</span>
          {review.recommend === null || !band ? (
            <span className={pageStyles.muted}>Skipped</span>
          ) : (
            <span>
              <strong>{review.recommend}</strong>/10{' '}
              <span className={pageStyles.band} data-tone={band.tone}>
                {band.label}
              </span>
            </span>
          )}
        </div>
        <div className={pageStyles.score}>
          <span className={pageStyles.scoreLabel}>Portal ease</span>
          {review.portalEase !== null ? (
            <span className={pageStyles.scoreNumber} data-tone={scoreTone(review.portalEase)}>
              <strong>{review.portalEase}</strong>/5
            </span>
          ) : (
            '—'
          )}
        </div>
      </div>

      {painPoints.length > 0 && (
        <div className={pageStyles.painPoints}>
          <span className={pageStyles.scoreLabel}>Found hard</span>
          <ul className={styles.chipList}>
            {painPoints.map((point) => (
              <li key={point} className={styles.chip}>
                {REVIEW_PAIN_POINT_LABELS[point]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {texts.map((text) => (
        <div key={text.label} className={pageStyles.textAnswer}>
          <span className={pageStyles.scoreLabel}>{text.label}</span>
          <p className={pageStyles.quote} dir="auto">
            {text.value}
          </p>
        </div>
      ))}

      <details className={pageStyles.details}>
        <summary>Service &amp; communication ratings</summary>
        <dl className={pageStyles.ratingGrid}>
          {[...SERVICE_RATINGS, ...COMMUNICATION_RATINGS].map((field) => (
            <div key={field}>
              <dt>{REVIEW_RATING_LABELS[field]}</dt>
              <dd>{review[field] === null ? <span className={pageStyles.muted}>Skipped</span> : `${review[field]} / 5`}</dd>
            </div>
          ))}
        </dl>
        {review.missingNote && (
          <div className={pageStyles.textAnswer}>
            <span className={pageStyles.scoreLabel}>Before confirming, they reported as missing</span>
            <p className={pageStyles.quote} dir="auto">
              {review.missingNote}
            </p>
          </div>
        )}
      </details>
    </li>
  );
}
