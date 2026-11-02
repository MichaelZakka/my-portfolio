import { NextResponse } from 'next/server';
import { authorizeAdminProject } from '../../../../../../lib/portal/access';
import { parseJsonBody } from '../../../../../../lib/portal/http';
import { countUnreadForAdmin, markReadByAdmin } from '../../../../../../lib/portal/messages';
import { readMarkSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The admin has seen the conversation up to `until`. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, readMarkSchema);
  if (!body.ok) return body.response;

  await markReadByAdmin(auth.project.id, body.data.until);
  return NextResponse.json({ unread: await countUnreadForAdmin(auth.project.id, body.data.until) });
}
