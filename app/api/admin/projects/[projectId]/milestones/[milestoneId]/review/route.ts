import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody, parseParam } from '../../../../../../../lib/portal/http';
import { notifyAboutReviewRequest } from '../../../../../../../lib/portal/notify';
import { requestMilestoneReview, withdrawMilestoneReview } from '../../../../../../../lib/portal/reviews';
import { idSchema, reviewRequestSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; milestoneId: string }> };

/** Asks the client to approve the milestone (emails every client member). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (auth.project.archivedAt) return apiError(409, 'projectArchived', 'This project is archived.');
  const id = parseParam(idSchema, milestoneId);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, reviewRequestSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const result = await requestMilestoneReview({
    projectId: auth.project.id,
    milestoneId: id.data,
    actorId: actor.id,
    ...body.data,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutReviewRequest({
      reviewId: result.reviewId,
      projectId: auth.project.id,
      projectName: auth.project.name,
      milestoneId: id.data,
      milestoneTitle: result.milestoneTitle,
      ...body.data,
    })
  );
  return NextResponse.json({ reviewId: result.reviewId }, { status: 201 });
}

/** Withdraws the pending approval request. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, milestoneId);
  if (!id.ok) return id.response;

  if (!(await withdrawMilestoneReview(auth.project.id, id.data))) return notFound('No pending approval request.');
  return NextResponse.json({ success: true });
}
