import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/db';
import { buildAdminProjectView } from '../../../../lib/portal/adminView';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes } from '../../../../lib/portal/format';
import { idSchema } from '../../../../lib/portal/validation';
import { requireAdminSession } from '../../../../lib/session';
import AdminProjectView from './AdminProjectView';
import { isAdminProjectTab } from './tabs';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireAdminSession();
  const { projectId } = await params;
  if (!idSchema.safeParse(projectId).success) return { title: 'Project' };
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  return { title: project ? `Project: ${project.name}` : 'Project' };
}

export default async function AdminProjectPage({ params, searchParams }: Params) {
  await requireAdminSession();
  const { projectId } = await params;
  const { tab } = await searchParams;
  if (!idSchema.safeParse(projectId).success) notFound();

  const view = await buildAdminProjectView(projectId);
  if (!view) notFound();

  return (
    <AdminProjectView
      initialView={view}
      initialTab={isAdminProjectTab(tab) ? tab : 'overview'}
      upload={{
        maxBytes: getMaxUploadBytes(),
        maxSizeLabel: formatBytes(getMaxUploadBytes(), 'en'),
        accept: ACCEPT_ATTRIBUTE,
      }}
    />
  );
}
