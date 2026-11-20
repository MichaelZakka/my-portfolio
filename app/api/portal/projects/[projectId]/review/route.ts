import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { submitClientReview } from '../../../../../lib/portal/completion';
import { apiError, parseJsonBody, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { notifyAboutClientReview } from '../../../../../lib/portal/notify';
import { displayName } from '../../../../../lib/portal/queries';
import { clientReviewSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The client's private end-of-project review. One per client per sign-off round; it locks once submitted. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!rateLimit(`portal-client-review:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }
  const body = await parseJsonBody(request, clientReviewSchema);
  if (!body.ok) return body.response;
  const answers = body.data;

  const result = await submitClientReview({
    projectId: project.id,
    user,
    locale: await getPortalLocale(user.locale),
    answers,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutClientReview({
      activityId: result.activityId,
      reviewId: result.reviewId,
      projectName: project.name,
      clientName: displayName(user),
      clientEmail: user.email,
      overall: answers.overall,
      recommend: answers.recommend,
      portalEase: answers.portalEase,
      improve: answers.improve,
    })
  );
  return NextResponse.json({ success: true });
}
