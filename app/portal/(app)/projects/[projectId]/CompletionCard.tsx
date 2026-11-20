import Link from 'next/link';
import { CircleCheck, PartyPopper, TriangleAlert } from 'lucide-react';
import type { ClientCompletionState } from '../../../../lib/portal/completion';
import { getPortalTranslations } from '../../../../lib/portal/locale';
import styles from '../../../portal.module.css';
import completionStyles from './completion.module.css';

/**
 * The sign-off prompt on a Completed project: confirm and review, what the
 * client said is missing, or a thank-you once the review is in. The admin
 * preview shows the same card without the button.
 */
export default async function CompletionCard({
  projectId,
  state,
  preview,
}: {
  projectId: string;
  state: ClientCompletionState;
  preview: boolean;
}) {
  const { t } = await getPortalTranslations('portal.completion');

  if (state.submittedAt) {
    return (
      <p className={`${styles.alert} ${styles.alertSuccess} ${completionStyles.cardThanks}`} role="status">
        <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
        {t('thanksCard')}
      </p>
    );
  }

  const content =
    state.answer === 'not_yet'
      ? { tone: 'warning', Icon: TriangleAlert, title: t('notYetTitle'), body: t('notYetBody'), cta: t('notYetCta') }
      : state.answer === 'confirmed'
        ? { tone: 'accent', Icon: CircleCheck, title: t('confirmedTitle'), body: t('confirmedBody'), cta: t('confirmedCta') }
        : { tone: 'accent', Icon: PartyPopper, title: t('cardTitle'), body: t('cardBody'), cta: t('cardCta') };
  const { Icon } = content;

  return (
    <section className={completionStyles.card} data-tone={content.tone} aria-labelledby="completion-card-title">
      <span className={completionStyles.cardIcon} aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className={completionStyles.cardBody}>
        <h2 id="completion-card-title" className={completionStyles.cardTitle}>
          {content.title}
        </h2>
        <p className={completionStyles.cardText}>{content.body}</p>
        {state.answer === 'not_yet' && state.missingNote && (
          <blockquote className={completionStyles.note} dir="auto">
            {state.missingNote}
          </blockquote>
        )}
        {preview && <p className={styles.hint}>{t('previewHint')}</p>}
      </div>
      {!preview && (
        <Link href={`/portal/projects/${projectId}/review`} className={`btn btn-primary ${completionStyles.cardCta}`}>
          {content.cta}
        </Link>
      )}
    </section>
  );
}
