import { NextResponse } from 'next/server';
import { authorizeAdminProject } from '../../../../../../../lib/portal/access';
import { apiError, parseParam } from '../../../../../../../lib/portal/http';
import { revokeInvitation } from '../../../../../../../lib/portal/invitations';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; invitationId: string }> };

/** Stops a pending link from working. Access already granted is removed via the members route. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, invitationId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, invitationId);
  if (!id.ok) return id.response;

  const revoked = await revokeInvitation(auth.project.id, id.data);
  if (!revoked) {
    return apiError(409, 'notPending', 'Only pending invitations can be revoked.');
  }
  return NextResponse.json({ success: true });
}
