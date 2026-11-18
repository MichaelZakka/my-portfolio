import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../../../lib/portal/access';
import { notFound } from '../../../../../../../lib/portal/http';
import { readMessageInput } from '../../../../../../../lib/portal/messages';
import { notifyAboutTaskComment } from '../../../../../../../lib/portal/notify';
import { displayName } from '../../../../../../../lib/portal/queries';
import { createTaskComment } from '../../../../../../../lib/portal/taskComments';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; taskId: string }> };

/**
 * The admin comments on a task (JSON, or multipart with files). On a task shown
 * to the client it is emailed to them (batched); on an internal task it is a note.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId, taskId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  if (!idSchema.safeParse(taskId).success) return notFound('Task not found.');

  const input = await readMessageInput(request, auth.project.id);
  if (!input.ok) return input.response;

  const actor = await getAdminActor();
  const name = displayName(actor);
  const created = await createTaskComment({
    projectId: auth.project.id,
    taskId,
    author: { id: actor.id, name, role: 'admin' },
    ...input.data,
  });
  if (!created.ok) return created.response;

  const { activityId, taskTitle, taskVisible, attachments } = created.data;
  after(() =>
    notifyAboutTaskComment({
      activityId,
      projectId: auth.project.id,
      projectName: auth.project.name,
      taskId,
      taskTitle,
      taskVisible,
      authorRole: 'admin',
      authorName: name,
      authorEmail: actor.email,
      comment: input.data.content,
      attachments,
    })
  );
  return NextResponse.json({ commentId: created.data.commentId }, { status: 201 });
}
