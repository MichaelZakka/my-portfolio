import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { parseJsonBody } from '../../../../../lib/portal/http';
import { milestoneCreateSchema } from '../../../../../lib/portal/validation';
import { createMilestone } from '../../../../../lib/portal/work';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, milestoneCreateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const milestone = await createMilestone({ projectId: auth.project.id, actorId: actor.id, ...body.data });
  return NextResponse.json({ milestone }, { status: 201 });
}
