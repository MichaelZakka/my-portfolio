import { NextResponse } from 'next/server';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { getTaskComments, presentTaskComments } from '../../../../../lib/portal/taskComments';

type RouteParams = { params: Promise<{ projectId: string }> };

/** Comment threads on the tasks shown to the client, keyed by task id (the screen's live "comments" section). */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const [rows, locale] = await Promise.all([
    getTaskComments(auth.project.id, { clientView: true }),
    getPortalLocale(),
  ]);
  return NextResponse.json(
    {
      comments: presentTaskComments(rows, {
        viewerRole: 'client',
        locale,
        timeZone: auth.user.timeZone,
        projectId: auth.project.id,
      }),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
