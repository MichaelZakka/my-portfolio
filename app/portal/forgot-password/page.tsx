import type { Metadata } from 'next';
import { getPortalTranslations } from '../../lib/portal/locale';
import AuthCard from '../_components/AuthCard';
import ForgotPasswordForm from './ForgotPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('forgot') };
}

export default async function ForgotPasswordPage() {
  const { t } = await getPortalTranslations('portal.auth');
  return (
    <AuthCard title={t('forgotTitle')} subtitle={t('forgotSubtitle')}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
