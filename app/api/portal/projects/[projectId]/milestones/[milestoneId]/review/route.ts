import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../../../lib/portal/access';
import { apiError, parseJsonBody, parseParam, rateLimited } from '../../../../../../../lib/portal/http';
import { notifyAboutReviewResponse } from '../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../lib/portal/queries';
import { respondToMilestoneReview } from '../../../../../../../lib/portal/reviews';
import { idSchema, reviewResponseSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; milestoneId: string }> };

/** The client approves the milestone (it becomes Done) or asks for changes (it reopens). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-review:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }
  const id = parseParam(idSchema, milestoneId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, reviewResponseSchema);
  if (!body.ok) return body.response;

  const result = await respondToMilestoneReview({
    projectId: project.id,
    milestoneId: id.data,
    user,
    action: body.data.action,
    comment: body.data.comment,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutReviewResponse({
      kind: body.data.action === 'approve' ? 'approved' : 'changes',
      projectId: project.id,
      projectName: project.name,
      milestoneTitle: result.milestoneTitle,
      clientName: displayName(user),
      clientEmail: user.email,
      comment: body.data.comment,
    })
  );
  return NextResponse.json({ success: true });
}
