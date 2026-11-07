import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { prisma } from '../../../lib/db';
import { requireAdminSession } from '../../../lib/session';
import { resolveTimeZone } from '../../../lib/portal/format';
import { getPortalTranslations } from '../../../lib/portal/locale';
import { displayName } from '../../../lib/portal/queries';
import { idSchema } from '../../../lib/portal/validation';
import LanguageSwitch from '../../_components/LanguageSwitch';
import ProjectView from '../../(app)/projects/[projectId]/ProjectView';
import styles from '../../portal.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const project = idSchema.safeParse(projectId).success
    ? await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    : null;
  return { title: `Preview: ${project?.name ?? 'project'}` };
}

/**
 * The admin's "view as client": the client project screen with every
 * visibility flag applied (internal tasks, hidden files and their activity
 * are left out), read-only, as the project's first client sees it. It lives
 * under /portal to render with the portal's layout and language; proxy.ts and
 * requireAdminSession() gate it to the admin.
 */
export default async function ClientPreviewPage({ params, searchParams }: Props) {
  await requireAdminSession();
  const { projectId } = await params;
  const { tab } = await searchParams;
  if (!idSchema.safeParse(projectId).success) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      members: {
        where: { user: { role: 'client' } },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { user: { select: { id: true, name: true, email: true, timeZone: true } } },
      },
    },
  });
  if (!project) notFound();
  const client = project.members[0]?.user ?? null;
  const { t } = await getPortalTranslations('portal.common');

  return (
    <div className={styles.page}>
      {/* Admin-facing, so English whatever the preview's language. */}
      <div className={styles.previewBar} lang="en" dir="ltr" role="status">
        <span className={styles.previewLabel}>
          <Eye size={16} strokeWidth={2} aria-hidden="true" />
          Client view, read-only: {client ? `exactly what ${displayName(client)} sees` : 'no client has joined yet'}.
          Internal tasks and hidden files are left out.
        </span>
        <div className={styles.headerActions}>
          <LanguageSwitch />
          <Link href={`/admin/projects/${project.id}`} className={styles.ghostButton}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Back to admin
          </Link>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            <span className={styles.brandName}>{t('brand')}</span>
            <span className={styles.brandSub}>{t('portalName')}</span>
          </span>
        </div>
      </header>
      <main id="portal-main" tabIndex={-1} className={styles.main}>
        <ProjectView
          projectId={project.id}
          tab={tab}
          viewer={{ id: client?.id ?? null, timeZone: resolveTimeZone(client?.timeZone) }}
          preview
        />
      </main>
    </div>
  );
}
