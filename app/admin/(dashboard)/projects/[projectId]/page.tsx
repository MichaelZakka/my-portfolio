import { notFound } from 'next/navigation';
import { buildAdminProjectView } from '../../../../lib/portal/adminView';
import { ACCEPT_ATTRIBUTE, getMaxUploadBytes } from '../../../../lib/portal/files';
import { formatBytes } from '../../../../lib/portal/format';
import { idSchema } from '../../../../lib/portal/validation';
import AdminProjectView from './AdminProjectView';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ projectId: string }> };

export default async function AdminProjectPage({ params }: Params) {
  const { projectId } = await params;
  if (!idSchema.safeParse(projectId).success) notFound();

  const view = await buildAdminProjectView(projectId);
  if (!view) notFound();

  return (
    <AdminProjectView
      initialView={view}
      upload={{
        maxBytes: getMaxUploadBytes(),
        maxSizeLabel: formatBytes(getMaxUploadBytes(), 'en'),
        accept: ACCEPT_ATTRIBUTE,
      }}
    />
  );
}
