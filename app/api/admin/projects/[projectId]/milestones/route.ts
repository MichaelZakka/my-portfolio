import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { toDateInputValue } from '../../../../../lib/portal/format';
import { apiError, parseJsonBody } from '../../../../../lib/portal/http';
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
  const result = await createMilestone({ projectId: auth.project.id, actorId: actor.id, ...body.data });
  if ('error' in result) {
    const previous = toDateInputValue(result.previousDue);
    return apiError(400, result.error, `The due date must be after the previous milestone's (${previous}).`);
  }
  return NextResponse.json({ milestone: result.milestone }, { status: 201 });
}
