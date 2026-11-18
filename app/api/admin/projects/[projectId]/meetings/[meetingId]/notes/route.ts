import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody } from '../../../../../../../lib/portal/http';
import { followUpMeetingNotes, saveMeetingNotes } from '../../../../../../../lib/portal/meetingNotes';
import { notifyAboutMeetingNotes } from '../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../lib/portal/queries';
import { adminMeetingFollowUpSchema, idSchema, meetingNotesSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/** Saves the meeting notes (summary + action items) as a draft, publishes them, or edits published ones. */
export async function PUT(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');

  const body = await parseJsonBody(request, meetingNotesSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await saveMeetingNotes(auth.project.id, meetingId, { id: actor.id, role: 'admin' }, body.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);

  // Only the first publish is emailed; later edits show in the activity feed.
  if (result.event === 'MEETING_NOTES_PUBLISHED' && result.activityId) {
    const activityId = result.activityId;
    after(() =>
      notifyAboutMeetingNotes({
        activityId,
        meetingId: result.meetingId,
        projectId: auth.project.id,
        projectName: auth.project.name,
        actorName: displayName(actor),
      })
    );
  }
  return NextResponse.json({ ok: true });
}

/** Under published notes: reply to the client, or tick an action item off (or reopen it). No email. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(meetingId).success) return notFound('Meeting not found.');

  const body = await parseJsonBody(request, adminMeetingFollowUpSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await followUpMeetingNotes(
    auth.project.id,
    meetingId,
    { id: actor.id, role: 'admin', name: displayName(actor) },
    body.data
  );
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json({ ok: true });
}
