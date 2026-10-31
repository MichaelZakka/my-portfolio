import { NextResponse } from 'next/server';
import { authorizeAdminProject } from '../../../../../lib/portal/access';
import { buildAdminProjectView } from '../../../../../lib/portal/adminView';
import { notFound } from '../../../../../lib/portal/http';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The admin project screen's data, re-read after each change made on that screen. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  const view = await buildAdminProjectView(auth.project.id);
  if (!view) return notFound('Project not found.');
  return NextResponse.json({ view }, { headers: { 'Cache-Control': 'private, no-store' } });
}
