import { authorizeAdminProject } from '../../../../../lib/portal/access';
import { issueUploadToken } from '../../../../../lib/portal/uploadTokens';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The admin's browser asks to upload one file straight to Vercel Blob. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  return issueUploadToken(request, auth.project.id);
}
