import { NextResponse } from 'next/server';
import { authorizeAdmin } from '../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody, parseParam } from '../../../../lib/portal/http';
import { deleteProposalDraft, updateProposalDraft } from '../../../../lib/portal/proposals';
import { idSchema, proposalUpdateSchema } from '../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ proposalId: string }> };

/** Saves the whole draft. Sent versions are locked: revise them as a new version instead. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, (await params).proposalId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, proposalUpdateSchema);
  if (!body.ok) return body.response;

  const result = await updateProposalDraft(id.data, body.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, (await params).proposalId);
  if (!id.ok) return id.response;

  if (!(await deleteProposalDraft(id.data))) return notFound('Draft not found.');
  return NextResponse.json({ success: true });
}
