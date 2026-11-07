import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '../../../lib/portal/format';
import { getPortalTranslations } from '../../../lib/portal/locale';
import { findProposalAccount, findProposalByToken } from '../../../lib/portal/proposals';
import AuthCard from '../../_components/AuthCard';
import LanguageSwitch from '../../_components/LanguageSwitch';
import ProposalDocument from '../../_components/ProposalDocument';
import ProposalResponseForm from './ProposalResponseForm';
import styles from '../../portal.module.css';
import proposalStyles from '../../_components/proposal.module.css';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  const found = await findProposalByToken((await params).token);
  return { title: found ? t('proposalFor', { title: found.content.title }) : t('proposal') };
}

/** The emailed proposal link: no account needed. Accepting creates the client's portal account and project. */
export default async function ProposalPage({ params }: Props) {
  const { token } = await params;
  const { t, locale } = await getPortalTranslations('portal.proposal');
  const { t: tCommon } = await getPortalTranslations('portal.common');
  const found = await findProposalByToken(token);

  if (!found) {
    return (
      <AuthCard title={t('invalidTitle')} subtitle={t('invalidText')}>
        {null}
      </AuthCard>
    );
  }

  const { proposal, state, content } = found;
  const open = state === 'sent' || state === 'expired';
  const account = open ? await findProposalAccount(proposal.recipientEmail) : null;
  const respondedOn = proposal.respondedAt ? formatDate(proposal.respondedAt, locale) : '';

  const notice =
    state === 'accepted'
      ? { tone: styles.alertSuccess, title: t('acceptedTitle'), text: t('acceptedText', { name: proposal.signerName ?? '', date: respondedOn }) }
      : state === 'changes_requested'
        ? { tone: styles.alertInfo, title: t('changes_requestedTitle'), text: t('changes_requestedText', { date: respondedOn }) }
        : state === 'declined'
          ? { tone: styles.alertInfo, title: t('declinedTitle'), text: t('declinedText', { date: respondedOn }) }
          : state === 'superseded'
            ? { tone: styles.alertInfo, title: t('supersededTitle'), text: t('supersededText') }
            : state === 'expired'
              ? { tone: styles.alertError, title: t('expiredTitle'), text: t('expiredText', { date: formatDate(proposal.validUntil!, locale) }) }
              : null;

  return (
    <main id="portal-main" className={proposalStyles.page}>
      <div className={proposalStyles.top}>
        <div className={styles.brand}>
          <span className={styles.brandName}>{tCommon('brand')}</span>
          <span className={styles.brandSub}>{tCommon('portalName')}</span>
        </div>
        <LanguageSwitch />
      </div>

      <div className={proposalStyles.document}>
        {notice && (
          <div className={`${styles.alert} ${notice.tone}`} role="status">
            <strong>{notice.title}.</strong> {notice.text}
            {state === 'accepted' && proposal.lead.project && (
              <>
                {' '}
                <Link href={`/portal/projects/${proposal.lead.project.id}`} className={styles.textLink}>
                  {t('openProject')}
                </Link>
              </>
            )}
          </div>
        )}

        <ProposalDocument
          content={content}
          uiLocale={locale}
          recipientName={proposal.recipientName ?? ''}
          sentAt={proposal.sentAt}
          validUntil={open ? proposal.validUntil : null}
        />

        {open && (
          <section className={`${styles.card} ${proposalStyles.response}`} aria-labelledby="proposal-respond">
            <h2 id="proposal-respond" className={styles.sectionTitle}>
              {t('respondTitle')}
            </h2>
            <p className={styles.muted}>{t('respondHint')}</p>
            <ProposalResponseForm
              token={token}
              email={proposal.recipientEmail ?? ''}
              defaultName={proposal.recipientName ?? ''}
              hasAccount={Boolean(account?.passwordHash)}
              canAccept={state === 'sent'}
            />
          </section>
        )}
      </div>
    </main>
  );
}
