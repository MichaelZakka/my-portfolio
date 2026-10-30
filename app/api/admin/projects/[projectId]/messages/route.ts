import { NextResponse, after } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { logActivity } from '../../../../../lib/portal/activity';
import { parseJsonBody } from '../../../../../lib/portal/http';
import { notifyAboutMessage } from '../../../../../lib/portal/notify';
import { displayName, getProjectMessages } from '../../../../../lib/portal/queries';
import { messageSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ messages: await getProjectMessages(auth.project.id) });
}

/** Posts as the admin and emails every client member (each in their language). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, messageSchema);
  if (!body.ok) return body.response;

  const actor = await getAdminActor();
  const senderName = displayName(actor);
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { projectId: auth.project.id, senderId: actor.id, content: body.data.content },
      select: { id: true, createdAt: true },
    });
    await logActivity(
      {
        projectId: auth.project.id,
        actorId: actor.id,
        type: 'MESSAGE_SENT',
        meta: { messageId: created.id, senderName },
        visibleToClient: true,
      },
      tx
    );
    return created;
  });

  after(() =>
    notifyAboutMessage({
      messageId: message.id,
      projectId: auth.project.id,
      projectName: auth.project.name,
      senderName,
      senderEmail: actor.email,
      senderRole: 'admin',
      content: body.data.content,
    })
  );

  return NextResponse.json({ message }, { status: 201 });
}
