import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { apiError, parseJsonBody } from '../../../../../lib/portal/http';
import { createMeeting } from '../../../../../lib/portal/meetings';
import { notifyAboutMeeting } from '../../../../../lib/portal/notify';
import { displayName } from '../../../../../lib/portal/queries';
import { meetingCreateSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The admin proposes a meeting; every client member is emailed to accept it or suggest another time. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, meetingCreateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await createMeeting(auth.project.id, { id: actor.id, role: 'admin' }, body.data);
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
  return NextResponse.json({ meetingId: result.meetingId }, { status: 201 });
}
