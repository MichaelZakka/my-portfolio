import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { apiError, parseJsonBody, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { createMeeting, getProjectMeetings } from '../../../../../lib/portal/meetings';
import { notifyAboutMeeting } from '../../../../../lib/portal/notify';
import { presentMeetings } from '../../../../../lib/portal/present';
import { displayName } from '../../../../../lib/portal/queries';
import { meetingCreateSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const [meetings, locale] = await Promise.all([getProjectMeetings(auth.project.id), getPortalLocale()]);
  return NextResponse.json({ meetings: presentMeetings(meetings, 'client', { locale }) });
}

/** A client proposes a meeting; the admin is emailed to accept it or suggest another time. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-meeting:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, meetingCreateSchema);
  if (!body.ok) return body.response;

  const result = await createMeeting(project.id, { id: user.id, role: 'client' }, body.data);
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
  return NextResponse.json({ meetingId: result.meetingId }, { status: 201 });
}
