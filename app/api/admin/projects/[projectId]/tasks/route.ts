import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { apiError, parseJsonBody } from '../../../../../lib/portal/http';
import { taskCreateSchema } from '../../../../../lib/portal/validation';
import { createTask } from '../../../../../lib/portal/work';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, taskCreateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const task = await createTask({ projectId: auth.project.id, actorId: actor.id, ...body.data });
  if (!task) return apiError(400, 'invalidInput', 'That milestone is not part of this project.');
  return NextResponse.json({ task }, { status: 201 });
}
