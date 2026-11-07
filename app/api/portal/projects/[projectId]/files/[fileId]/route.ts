import { prisma } from '../../../../../../lib/db';
import { authorizeClientProject } from '../../../../../../lib/portal/access';
import { fileDownloadResponse } from '../../../../../../lib/portal/files';
import { notFound } from '../../../../../../lib/portal/http';
import { idSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; fileId: string }> };

/** Authorized download: member of the project, and the file is shared with clients. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId, fileId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  if (!idSchema.safeParse(fileId).success) return notFound('File not found.');
  const file = await prisma.projectFile.findFirst({
    where: { id: fileId, projectId: auth.project.id, visibleToClient: true },
  });
  if (!file) return notFound('File not found.');

  return fileDownloadResponse(file);
}
