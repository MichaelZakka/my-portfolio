import { NextResponse } from 'next/server';
import { authorizeAdmin } from '../../../../../lib/portal/access';
import { apiError, parseParam } from '../../../../../lib/portal/http';
import { createProposalDraft } from '../../../../../lib/portal/proposals';
import { idSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ id: string }> };

/** Opens the request's proposal draft: v1 pre-filled from the brief, or the next version copied from the latest. */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;

  const id = parseParam(idSchema, (await params).id);
  if (!id.ok) return id.response;

  const result = await createProposalDraft(id.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json({ proposalId: result.proposalId }, { status: 201 });
}
