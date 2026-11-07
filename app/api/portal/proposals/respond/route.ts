import { NextResponse, after } from 'next/server';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { apiError, parseJsonBody, rateLimited, rejectCrossOrigin } from '../../../../lib/portal/http';
import { getPortalLocale } from '../../../../lib/portal/locale';
import { acceptProposal, answerProposal, notifyAboutProposalAnswer } from '../../../../lib/portal/proposals';
import { isPortalAuthConfigured, setPortalSessionCookie } from '../../../../lib/portal/session';
import { proposalResponseSchema } from '../../../../lib/portal/validation';

/**
 * The client's answer from /portal/proposal/[token]. No session is needed:
 * the emailed token is the credential, like an invitation. Accepting signs
 * the client in to the project it creates.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (!rateLimit(`portal-proposal:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, proposalResponseSchema);
  if (!body.ok) return body.response;
  const input = body.data;

  if (input.action !== 'accept') {
    const result = await answerProposal({ token: input.token, action: input.action, note: input.note });
    if (!result.ok) return apiError(result.status, result.code, result.error);
    after(() => notifyAboutProposalAnswer(result.answer));
    return NextResponse.json({ success: true });
  }

  if (!isPortalAuthConfigured()) {
    return apiError(503, 'notConfigured', 'Portal sign-in is not configured. Set AUTH_SECRET.');
  }
  const result = await acceptProposal({
    token: input.token,
    signerName: input.signerName,
    password: input.password,
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    locale: await getPortalLocale(),
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);
  after(() => notifyAboutProposalAnswer(result.answer));

  const response = NextResponse.json({ success: true, redirectTo: `/portal/projects/${result.projectId}` });
  await setPortalSessionCookie(response, result.user);
  return response;
}
