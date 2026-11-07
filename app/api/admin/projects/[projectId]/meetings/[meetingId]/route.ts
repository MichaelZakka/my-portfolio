import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody } from '../../../../../../lib/portal/http';
import { actOnMeeting } from '../../../../../../lib/portal/meetings';
import { notifyAboutMeeting } from '../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../lib/portal/queries';
import { idSchema, meetingActionSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/** Accept a client's proposal, propose another time, or cancel. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');

  const body = await parseJsonBody(request, meetingActionSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await actOnMeeting(auth.project.id, meetingId, { id: actor.id, role: 'admin' }, body.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutMeeting({
      ...result,
      projectId: auth.project.id,
      projectName: auth.project.name,
      actorName: displayName(actor),
      actorEmail: actor.email,
      actorRole: 'admin',
    })
  );
  return NextResponse.json({ ok: true });
}
