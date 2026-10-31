import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../lib/portal/access';
import { notFound, parseJsonBody, parseParam } from '../../../../../../lib/portal/http';
import { idSchema, milestoneUpdateSchema } from '../../../../../../lib/portal/validation';
import { deleteMilestone, updateMilestone } from '../../../../../../lib/portal/work';

type RouteParams = { params: Promise<{ projectId: string; milestoneId: string }> };

/** Edits fields, changes status (logs MILESTONE_COMPLETED) or moves the milestone up/down. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, milestoneId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, milestoneUpdateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const milestone = await updateMilestone({
    projectId: auth.project.id,
    milestoneId: id.data,
    actorId: actor.id,
    changes: body.data,
  });
  if (!milestone) return notFound('Milestone not found.');
  return NextResponse.json({ milestone });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, milestoneId);
  if (!id.ok) return id.response;

  if (!(await deleteMilestone(auth.project.id, id.data))) return notFound('Milestone not found.');
  return NextResponse.json({ success: true });
}
