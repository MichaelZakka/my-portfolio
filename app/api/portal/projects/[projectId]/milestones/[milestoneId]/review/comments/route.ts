import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../../../../lib/portal/access';
import { formatDateTime } from '../../../../../../../../lib/portal/format';
import { apiError, notFound, parseJsonBody, rateLimited } from '../../../../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../../../../lib/portal/locale';
import { notifyAboutChangeReply } from '../../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../../lib/portal/queries';
import { replyToChangeRequest } from '../../../../../../../../lib/portal/reviews';
import { changeReplySchema, idSchema } from '../../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; milestoneId: string }> };

/** A client follows up on the changes they requested; the admin is emailed. Returns the reply as shown. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, milestoneId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!idSchema.safeParse(milestoneId).success) return notFound('Milestone not found.');
  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-change-reply:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, changeReplySchema);
  if (!body.ok) return body.response;

  const name = displayName(user);
  const result = await replyToChangeRequest({
    projectId: project.id,
    milestoneId,
    reviewId: body.data.reviewId,
    author: { id: user.id, name, role: 'client' },
    body: body.data.body,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  after(() =>
    notifyAboutChangeReply({
      activityId: result.activityId,
      projectId: project.id,
      projectName: project.name,
      milestoneId,
      milestoneTitle: result.milestoneTitle,
      authorRole: 'client',
      authorName: name,
      authorEmail: user.email,
      comment: body.data.body,
    })
  );
  const now = new Date();
  return NextResponse.json(
    {
      comment: {
        id: result.commentId,
        body: body.data.body,
        author: name,
        fromLead: false,
        createdAt: now.toISOString(),
        timeLabel: formatDateTime(now, await getPortalLocale(), user.timeZone),
      },
    },
    { status: 201 }
  );
}
