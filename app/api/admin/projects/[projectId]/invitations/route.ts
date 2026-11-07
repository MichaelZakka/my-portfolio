import { NextResponse } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { apiError, parseJsonBody } from '../../../../../lib/portal/http';
import { createInvitation } from '../../../../../lib/portal/invitations';
import { invitationCreateSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** Invites a client: creates the user if needed, emails the link, records the email result. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, invitationCreateSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await createInvitation({
    projectId: auth.project.id,
    projectName: auth.project.name,
    actorId: actor.id,
    ...body.data,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  return NextResponse.json(result, { status: 201 });
}
