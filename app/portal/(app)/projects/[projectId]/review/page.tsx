import type { Metadata } from 'next';
import Link from 'next/link';
import { forbidden, notFound, redirect } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { getClientProjectAccess } from '../../../../../lib/portal/access';
import { getClientCompletionState, getOwnSubmittedReview } from '../../../../../lib/portal/completion';
import { COMMUNICATION_RATINGS, SERVICE_RATINGS } from '../../../../../lib/portal/constants';
import { formatDate } from '../../../../../lib/portal/format';
import { getPortalTranslations } from '../../../../../lib/portal/locale';
import { getPortalUser } from '../../../../../lib/portal/session';
import styles from '../../../../portal.module.css';
import completionStyles from '../completion.module.css';
import CompletionFlow from './CompletionFlow';

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.completion');
  return { title: t('metaTitle') };
}

/**
 * End-of-project sign-off: confirm the project is complete (or say what is
 * missing), then the private review survey. After submitting, a read-only copy.
 */
export default async function ProjectReviewPage({ params }: Props) {
  const { projectId } = await params;
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const access = await getClientProjectAccess(user.id, projectId);
  if (access.status === 'not_found') notFound();
  if (access.status === 'forbidden') forbidden();

  const [state, { t, locale }] = await Promise.all([
    getClientCompletionState(projectId, user.id),
    getPortalTranslations('portal.completion'),
  ]);
  const submitted = state?.submittedAt ? await getOwnSubmittedReview(state.roundId, user.id) : null;

  return (
    <div className={completionStyles.page}>
      <Link href={`/portal/projects/${projectId}`} className={styles.backLink}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" className="flip-rtl" />
        {t('backToProject')}
      </Link>

      <div className={styles.pageHead}>
        {/* Aligned with the page (right in Arabic); <bdi> keeps a Latin name's own text direction. */}
        <p className={completionStyles.kicker}>
          <bdi>{access.project.name}</bdi>
        </p>
        <h1 className={styles.pageTitle}>{submitted ? t('thanksTitle') : t('pageTitle')}</h1>
        <p className={styles.summary}>{submitted ? t('thanksBody') : t('pageIntro')}</p>
        <p className={completionStyles.privacy}>
          <Lock size={14} strokeWidth={2} aria-hidden="true" />
          {t('privateNote')}
        </p>
      </div>

      {!state ? (
        <p className={`${styles.card} ${styles.empty}`}>{t('notOpen')}</p>
      ) : submitted ? (
        <section className={styles.card} aria-labelledby="your-answers">
          <h2 id="your-answers" className={styles.sectionTitle}>
            {t('yourAnswers')}
          </h2>
          <p className={styles.hint}>{t('submittedOn', { date: formatDate(submitted.submittedAt, locale) })}</p>
          <dl className={completionStyles.answers}>
            <Answer label={t('overallLabel')} value={submitted.overall} max={5} t={t} />
            <Answer label={t('recommendLabel')} value={submitted.recommend} max={10} t={t} />
            <Answer label={t('portalEaseLabel')} value={submitted.portalEase} max={5} t={t} />
            <div>
              <dt>{t('painPointsLabel')}</dt>
              <dd>
                {submitted.painPoints.length
                  ? submitted.painPoints.map((point) => t(`painPoints.${point}`)).join(' · ')
                  : t('noneSelected')}
              </dd>
            </div>
            <TextAnswer label={t('portalCommentLabel')} value={submitted.portalComment} t={t} />
            {[...SERVICE_RATINGS, ...COMMUNICATION_RATINGS].map((field) => (
              <Answer key={field} label={t(`ratings.${field}`)} value={submitted[field]} max={5} t={t} />
            ))}
            <TextAnswer label={t('wentWellLabel')} value={submitted.wentWell} t={t} />
            <TextAnswer label={t('improveLabel')} value={submitted.improve} t={t} />
            <TextAnswer label={t('otherLabel')} value={submitted.otherComment} t={t} />
          </dl>
        </section>
      ) : (
        <CompletionFlow
          projectId={projectId}
          initialAnswer={state.answer}
          initialNote={state.missingNote}
        />
      )}
    </div>
  );
}

type Translate = Awaited<ReturnType<typeof getPortalTranslations>>['t'];

function Answer({ label, value, max, t }: { label: string; value: number | null; max: number; t: Translate }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value === null ? t('notAnswered') : t('scoreOf', { score: value, max })}</dd>
    </div>
  );
}

function TextAnswer({ label, value, t }: { label: string; value: string; t: Translate }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd dir="auto" className={completionStyles.answerText}>
        {value || t('notAnswered')}
      </dd>
    </div>
  );
}
