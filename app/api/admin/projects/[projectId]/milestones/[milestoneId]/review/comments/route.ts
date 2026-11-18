import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../../../lib/portal/access';
import { apiError, notFound, parseJsonBody } from '../../../../../../../../lib/portal/http';
import { notifyAboutChangeReply } from '../../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../../lib/portal/queries';
import { replyToChangeRequest } from '../../../../../../../../lib/portal/reviews';
import { changeReplySchema, idSchema } from '../../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; milestoneId: string }> };

/** The admin replies under a client's change request; every client member is emailed. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(milestoneId).success) return notFound('Milestone not found.');

  const body = await parseJsonBody(request, changeReplySchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const name = displayName(actor);
  const result = await replyToChangeRequest({
    projectId: auth.project.id,
    milestoneId,
    reviewId: body.data.reviewId,
    author: { id: actor.id, name, role: 'admin' },
    body: body.data.body,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutChangeReply({
      activityId: result.activityId,
      projectId: auth.project.id,
      projectName: auth.project.name,
      milestoneId,
      milestoneTitle: result.milestoneTitle,
      authorRole: 'admin',
      authorName: name,
      authorEmail: actor.email,
      comment: body.data.body,
    })
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
