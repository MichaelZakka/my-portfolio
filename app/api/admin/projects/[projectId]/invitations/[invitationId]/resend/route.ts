import { NextResponse } from 'next/server';
import { authorizeAdminProject } from '../../../../../../../lib/portal/access';
import { apiError, parseParam } from '../../../../../../../lib/portal/http';
import { resendInvitation } from '../../../../../../../lib/portal/invitations';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; invitationId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, invitationId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, invitationId);
  if (!id.ok) return id.response;

  const result = await resendInvitation({
    projectId: auth.project.id,
    projectName: auth.project.name,
    invitationId: id.data,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json(result);
}
