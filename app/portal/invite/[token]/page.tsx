import type { Metadata } from 'next';
import Link from 'next/link';
import { INVITATION_TTL_DAYS } from '../../../lib/portal/constants';
import { findInvitationByToken } from '../../../lib/portal/invitations';
import { getPortalTranslations } from '../../../lib/portal/locale';
import AuthCard from '../../_components/AuthCard';
import AcceptInviteForm from './AcceptInviteForm';
import styles from '../../portal.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('invite') };
}

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitationPage({ params }: Props) {
  const { token } = await params;
  const { t } = await getPortalTranslations('portal.invite');
  const invitation = await findInvitationByToken(token);

  if (!invitation || invitation.state !== 'pending') {
    const state = invitation?.state ?? 'invalid';
    const signInLink = (
      <Link href="/portal/login" className={`btn btn-primary ${styles.submit}`}>
        {t('goToSignIn')}
      </Link>
    );
    return (
      <AuthCard
        title={t(`${state}Title`)}
        subtitle={state === 'expired' ? t('expiredText', { days: INVITATION_TTL_DAYS }) : t(`${state}Text`)}
      >
        {state === 'accepted' && signInLink}
      </AuthCard>
    );
  }

  const hasAccount = Boolean(invitation.user?.passwordHash);
  return (
    <AuthCard title={t('title', { project: invitation.project.name })} subtitle={t('subtitle')}>
      <AcceptInviteForm
        token={token}
        email={invitation.email}
        defaultName={invitation.user?.name ?? ''}
        hasAccount={hasAccount}
      />
    </AuthCard>
  );
}
