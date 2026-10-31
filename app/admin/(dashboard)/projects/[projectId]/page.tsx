import { notFound } from 'next/navigation';
import { buildAdminProjectView } from '../../../../lib/portal/adminView';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes } from '../../../../lib/portal/format';
import { idSchema } from '../../../../lib/portal/validation';
import AdminProjectView from './AdminProjectView';
import { isAdminProjectTab } from './tabs';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> };

export default async function AdminProjectPage({ params, searchParams }: Params) {
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
