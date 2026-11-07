import { getTranslations } from 'next-intl/server';
import { dirFor } from '../../../i18n/routing';
import { formatDate } from '../../lib/portal/format';
import { proposalSchedule, proposalTotal, type ProposalContent } from '../../lib/portal/proposals';
import styles from '../portal.module.css';
import proposalStyles from './proposal.module.css';

/**
 * The proposal as the client reads it, shared by /portal/proposal/[token] and
 * the admin preview. Labels follow the reader's language (uiLocale); the
 * content keeps the language it was written in, with its own direction.
 */
export default async function ProposalDocument({
  content,
  uiLocale,
  recipientName,
  sentAt,
  validUntil,
}: {
  content: ProposalContent;
  uiLocale: string;
  recipientName: string;
  sentAt: Date | null;
  validUntil: Date | null;
}) {
  const t = await getTranslations({ locale: uiLocale, namespace: 'portal.proposal' });
  const lang = { lang: content.locale, dir: dirFor(content.locale) };
  const schedule = proposalSchedule(content.phases, content.startDate ?? new Date());
  const total = proposalTotal(content, uiLocale);

  const list = (items: string[], tone: string) => (
    <ul className={proposalStyles.list} data-tone={tone} {...lang}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

  return (
    <article className={proposalStyles.document}>
      <header className={styles.card}>
        <p className={proposalStyles.kicker}>{t('kicker')}</p>
        <h1 className={styles.pageTitle} {...lang}>
          {content.title}
        </h1>
        <p className={styles.pageSubtitle}>
          {recipientName && <>{t('preparedFor', { name: recipientName })} · </>}
          {sentAt
            ? t('versionLine', { version: content.version, date: formatDate(sentAt, uiLocale) })
            : `v${content.version}`}
        </p>
        <dl className={proposalStyles.facts}>
          <div>
            <dt className={styles.statLabel}>{t('totalLabel')}</dt>
            <dd className={styles.statValue}>{total}</dd>
          </div>
          <div>
            <dt className={styles.statLabel}>{t('durationLabel')}</dt>
            <dd className={styles.statValue}>{t('totalDuration', { days: schedule.totalDays })}</dd>
          </div>
          {validUntil && (
            <div>
              <dt className={styles.statLabel}>{t('validUntilLabel')}</dt>
              <dd className={styles.statValue}>{formatDate(validUntil, uiLocale)}</dd>
            </div>
          )}
        </dl>
      </header>

      {content.summary && (
        <section className={styles.card} aria-labelledby="proposal-overview">
          <h2 id="proposal-overview" className={styles.sectionTitle}>
            {t('overviewTitle')}
          </h2>
          <p className={proposalStyles.prose} {...lang}>
            {content.summary}
          </p>
        </section>
      )}

      <section className={styles.card} aria-labelledby="proposal-phases">
        <h2 id="proposal-phases" className={styles.sectionTitle}>
          {t('phasesTitle')}
        </h2>
        <ol className={styles.timeline}>
          {content.phases.map((phase, index) => (
            <li key={index} className={styles.milestone}>
              <span className={styles.milestoneDot} aria-hidden="true">
                <span className={proposalStyles.phaseNumber}>{index + 1}</span>
              </span>
              <div className={styles.milestoneHead}>
                <h3 className={styles.milestoneTitle} {...lang}>
                  {phase.title}
                </h3>
              </div>
              <p className={styles.milestoneMeta}>{t('phaseDuration', { days: phase.durationDays })}</p>
              {phase.description && (
                <p className={styles.milestoneDescription} {...lang}>
                  {phase.description}
                </p>
              )}
            </li>
          ))}
        </ol>
        <dl className={proposalStyles.facts}>
          <div>
            <dt className={styles.statLabel}>{t('startLabel')}</dt>
            <dd className={styles.statValue}>
              {content.startDate ? formatDate(content.startDate, uiLocale) : t('startOnAcceptance')}
            </dd>
          </div>
          {content.startDate && schedule.completion && (
            <div>
              <dt className={styles.statLabel}>{t('completionLabel')}</dt>
              <dd className={styles.statValue}>{formatDate(schedule.completion, uiLocale)}</dd>
            </div>
          )}
        </dl>
      </section>

      {(content.included.length > 0 || content.excluded.length > 0) && (
        <section className={`${styles.card} ${proposalStyles.scope}`} aria-label={t('includedTitle')}>
          {content.included.length > 0 && (
            <div>
              <h2 className={proposalStyles.subTitle}>{t('includedTitle')}</h2>
              {list(content.included, 'included')}
            </div>
          )}
          {content.excluded.length > 0 && (
            <div>
              <h2 className={proposalStyles.subTitle}>{t('excludedTitle')}</h2>
              {list(content.excluded, 'excluded')}
            </div>
          )}
        </section>
      )}

      {content.clientProvides.length > 0 && (
        <section className={styles.card} aria-labelledby="proposal-client">
          <h2 id="proposal-client" className={styles.sectionTitle}>
            {t('clientProvidesTitle')}
          </h2>
          {list(content.clientProvides, 'client')}
        </section>
      )}

      <section className={styles.card} aria-labelledby="proposal-investment">
        <h2 id="proposal-investment" className={styles.sectionTitle}>
          {t('investmentTitle')}
        </h2>
        <p className={proposalStyles.total}>{total}</p>
        <div className={proposalStyles.terms}>
          {content.paymentTerms && (
            <div>
              <span className={styles.statLabel}>{t('paymentLabel')}</span>
              <p className={proposalStyles.prose} {...lang}>
                {content.paymentTerms}
              </p>
            </div>
          )}
          <div>
            <span className={styles.statLabel}>{t('revisionsLabel')}</span>
            <p className={proposalStyles.prose}>{t('revisions', { count: content.revisionRounds })}</p>
          </div>
        </div>
      </section>
    </article>
  );
}
