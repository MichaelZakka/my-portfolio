import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { readUpload, storeProjectFile } from '../../../../../lib/portal/files';
import { getProjectFiles } from '../../../../../lib/portal/queries';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ files: await getProjectFiles(auth.project.id, { clientView: false }) });
}

/** Multipart upload; `visibleToClient` = "false" keeps the file internal. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const parsed = await readUpload(request);
  if (!parsed.ok) return parsed.response;

  const actor = await getAdminActor();
  const stored = await storeProjectFile({
    projectId: auth.project.id,
    uploadedById: actor.id,
    upload: parsed.data.upload,
    visibleToClient: parsed.data.form.get('visibleToClient') !== 'false',
  });
  if (!stored.ok) return stored.response;

  return NextResponse.json({ file: stored.data }, { status: 201 });
}
