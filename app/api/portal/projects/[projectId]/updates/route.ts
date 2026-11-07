import { NextResponse } from 'next/server';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { getClientStamps } from '../../../../../lib/portal/messages';

type RouteParams = { params: Promise<{ projectId: string }> };

/** Polled by the open project screen: one stamp per live section, plus the unread count. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getClientStamps(auth.project.id, auth.user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
