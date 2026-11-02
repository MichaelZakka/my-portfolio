import { NextResponse } from 'next/server';
import { authorizeAdminProject } from '../../../../../lib/portal/access';
import { getAdminStamps } from '../../../../../lib/portal/messages';

type RouteParams = { params: Promise<{ projectId: string }> };

/** Polled by the open admin project screen: it reloads when the stamp changes. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getAdminStamps(auth.project.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
