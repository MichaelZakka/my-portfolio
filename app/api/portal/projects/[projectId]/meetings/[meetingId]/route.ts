import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody, rateLimited } from '../../../../../../lib/portal/http';
import { actOnMeeting, editMeeting } from '../../../../../../lib/portal/meetings';
import { notifyAboutMeeting } from '../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../lib/portal/queries';
import { clientMeetingActionSchema, idSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/** Accept the admin's proposal, propose another time, cancel, or edit the details of a meeting the client created. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');
  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-meeting:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, clientMeetingActionSchema);
  if (!body.ok) return body.response;

  const client = { id: user.id, role: 'client' as const };
  const result =
    body.data.action === 'edit'
      ? await editMeeting(project.id, meetingId, client, body.data)
      : await actOnMeeting(project.id, meetingId, client, body.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutMeeting({
      ...result,
      projectId: project.id,
      projectName: project.name,
      actorName: displayName(user),
      actorEmail: user.email,
      actorRole: 'client',
    })
  );
  return NextResponse.json({ ok: true });
}
