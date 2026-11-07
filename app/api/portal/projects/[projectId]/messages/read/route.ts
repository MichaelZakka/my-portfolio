import { NextResponse } from 'next/server';
import { authorizeClientProject } from '../../../../../../lib/portal/access';
import { parseJsonBody } from '../../../../../../lib/portal/http';
import { countUnreadForClient, markReadByClient } from '../../../../../../lib/portal/messages';
import { readMarkSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The client has seen the conversation up to `until` (the newest message on their screen). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, readMarkSchema);
  if (!body.ok) return body.response;

  await markReadByClient(auth.project.id, auth.user.id, body.data.until);
  return NextResponse.json({
    unread: await countUnreadForClient(auth.project.id, auth.user.id, body.data.until),
  });
}
