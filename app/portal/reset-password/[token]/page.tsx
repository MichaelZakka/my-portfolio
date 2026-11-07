import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '../../../lib/db';
import { TOKEN_PATTERN, hashToken } from '../../../lib/portal/credentials';
import { getPortalTranslations } from '../../../lib/portal/locale';
import AuthCard from '../../_components/AuthCard';
import ResetPasswordForm from './ResetPasswordForm';
import styles from '../../portal.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getPortalTranslations('portal.meta');
  return { title: t('reset') };
}

type Props = { params: Promise<{ token: string }> };

async function isUsable(token: string) {
  if (!TOKEN_PATTERN.test(token)) return false;
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const { t } = await getPortalTranslations('portal.auth');

  if (!(await isUsable(token))) {
    return (
      <AuthCard title={t('resetInvalidTitle')} subtitle={t('resetInvalidText')}>
        <Link href="/portal/forgot-password" className={`btn btn-primary ${styles.submit}`}>
          {t('requestNewLink')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('resetTitle')} subtitle={t('resetSubtitle')}>
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
