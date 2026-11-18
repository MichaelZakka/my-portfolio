import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody } from '../../../../../../lib/portal/http';
import { actOnMeeting, editMeeting, markMeetingNoShow } from '../../../../../../lib/portal/meetings';
import { notifyAboutMeeting } from '../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../lib/portal/queries';
import { adminMeetingActionSchema, idSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/**
 * Accept a client's proposal, propose another time, cancel, edit the details
 * (e.g. add the link later), or mark a meeting that did not take place.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');

  const body = await parseJsonBody(request, adminMeetingActionSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const admin = { id: actor.id, role: 'admin' as const };
  const result =
    body.data.action === 'edit'
      ? await editMeeting(auth.project.id, meetingId, admin, body.data)
      : body.data.action === 'no_show'
        ? await markMeetingNoShow(auth.project.id, meetingId, admin)
        : await actOnMeeting(auth.project.id, meetingId, admin, body.data);
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
