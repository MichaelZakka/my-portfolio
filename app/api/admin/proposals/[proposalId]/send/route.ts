import { NextResponse } from 'next/server';
import { authorizeAdmin } from '../../../../../lib/portal/access';
import { apiError, parseParam } from '../../../../../lib/portal/http';
import { sendProposal } from '../../../../../lib/portal/proposals';
import { idSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ proposalId: string }> };

/** Sends a draft to the client, or re-sends a sent one with a fresh link and validity period. */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, (await params).proposalId);
  if (!id.ok) return id.response;

  const result = await sendProposal(id.data);
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json({ proposalUrl: result.proposalUrl, email: result.email, resent: result.resent });
}
