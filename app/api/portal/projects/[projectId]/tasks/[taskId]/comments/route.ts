import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../../../lib/portal/access';
import { apiError, notFound, rateLimited } from '../../../../../../../lib/portal/http';
import { readMessageInput } from '../../../../../../../lib/portal/messages';
import { notifyAboutTaskComment } from '../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../lib/portal/queries';
import { createTaskComment } from '../../../../../../../lib/portal/taskComments';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; taskId: string }> };

/** A client comments on a task shown to them: JSON { content }, or multipart with content + files. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, taskId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!idSchema.safeParse(taskId).success) return notFound('Task not found.');
  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-task-comment:${user.id}`, { limit: 20, windowMs: 60 * 1000 }).success) {
    return rateLimited();
  }

  const input = await readMessageInput(request, project.id);
  if (!input.ok) return input.response;

  const name = displayName(user);
  const created = await createTaskComment({
    projectId: project.id,
    taskId,
    author: { id: user.id, name, role: 'client' },
    ...input.data,
  });
  if (!created.ok) return created.response;

  const { activityId, taskTitle, taskVisible, attachments } = created.data;
  after(() =>
    notifyAboutTaskComment({
      activityId,
      projectId: project.id,
      projectName: project.name,
      taskId,
      taskTitle,
      taskVisible,
      authorRole: 'client',
      authorName: name,
      authorEmail: user.email,
      comment: input.data.content,
      attachments,
    })
  );
  return NextResponse.json({ commentId: created.data.commentId }, { status: 201 });
}
