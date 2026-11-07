import { NextResponse } from 'next/server';
import { authorizeClientProject } from '../../../../lib/portal/access';
import { notFound } from '../../../../lib/portal/http';
import { getClientProjectDetail } from '../../../../lib/portal/queries';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const project = await getClientProjectDetail(auth.project.id);
  if (!project) return notFound('Project not found.');

  const { archivedAt, ...rest } = project;
  return NextResponse.json({ project: { ...rest, archived: Boolean(archivedAt) } });
}
