import { NextResponse } from 'next/server';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { readUpload, storeProjectFile } from '../../../../../lib/portal/files';
import { apiError, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { presentFiles } from '../../../../../lib/portal/present';
import { getProjectFiles } from '../../../../../lib/portal/queries';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const [files, locale] = await Promise.all([
    getProjectFiles(auth.project.id, { clientView: true }),
    getPortalLocale(),
  ]);
  return NextResponse.json({ files: presentFiles(files, auth.project.id, { locale }) });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-upload:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const parsed = await readUpload(request);
  if (!parsed.ok) return parsed.response;

  // A client's own upload is always visible to the project's clients.
  const stored = await storeProjectFile({
    projectId: project.id,
    uploadedById: user.id,
    upload: parsed.data.upload,
    visibleToClient: true,
  });
  if (!stored.ok) return stored.response;

  return NextResponse.json({ file: stored.data }, { status: 201 });
}
