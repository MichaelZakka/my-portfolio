import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody, rateLimited } from '../../../../../../../lib/portal/http';
import { followUpMeetingNotes } from '../../../../../../../lib/portal/meetingNotes';
import { notifyAboutMeetingComment } from '../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../lib/portal/queries';
import { clientMeetingFollowUpSchema, idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/**
 * Under published meeting notes: confirm them, comment (the admin is emailed),
 * or tick off an action item that is the client's.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');
  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-meeting-notes:${user.id}`, { limit: 40, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, clientMeetingFollowUpSchema);
  if (!body.ok) return body.response;

  const name = displayName(user);
  const result = await followUpMeetingNotes(project.id, meetingId, { id: user.id, role: 'client', name }, body.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);

  if (body.data.action === 'comment' && result.activityId) {
    const activityId = result.activityId;
    const comment = body.data.body;
    after(() =>
      notifyAboutMeetingComment({
        activityId,
        meetingId: result.meetingId,
        projectId: project.id,
        projectName: project.name,
        clientName: name,
        clientEmail: user.email,
        comment,
      })
    );
  }
  return NextResponse.json({ ok: true });
}
