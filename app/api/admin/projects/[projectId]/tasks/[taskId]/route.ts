import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody, parseParam } from '../../../../../../lib/portal/http';
import { idSchema, taskUpdateSchema } from '../../../../../../lib/portal/validation';
import { deleteTask, updateTask } from '../../../../../../lib/portal/work';

type RouteParams = { params: Promise<{ projectId: string; taskId: string }> };

/** Status (logs TASK_COMPLETED), milestone, client visibility, fields, or move up/down. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, taskId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, taskId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, taskUpdateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await updateTask({
    projectId: auth.project.id,
    taskId: id.data,
    actorId: actor.id,
    changes: body.data,
  });
  if ('error' in result) {
    return result.error === 'notFound'
      ? notFound('Task not found.')
      : apiError(400, 'invalidInput', 'That milestone is not part of this project.');
  }
  return NextResponse.json({ task: result.task });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { projectId, taskId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, taskId);
  if (!id.ok) return id.response;

  if (!(await deleteTask(auth.project.id, id.data))) return notFound('Task not found.');
  return NextResponse.json({ success: true });
}
