import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { apiError, rateLimited } from '../../../../../lib/portal/http';
import { issueUploadToken } from '../../../../../lib/portal/uploadTokens';

type RouteParams = { params: Promise<{ projectId: string }> };

/** A client's browser asks to upload one file straight to Vercel Blob (Files, message or task-comment attachment). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (auth.project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-upload-token:${auth.user.id}`, { limit: 40, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }
  return issueUploadToken(request, auth.project.id);
}
