import { NextResponse, after } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { logActivity } from '../../../../../lib/portal/activity';
import { apiError, parseJsonBody, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { notifyAboutMessage } from '../../../../../lib/portal/notify';
import { presentMessages } from '../../../../../lib/portal/present';
import { displayName, getProjectMessages } from '../../../../../lib/portal/queries';
import { messageSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const [messages, locale] = await Promise.all([getProjectMessages(auth.project.id), getPortalLocale()]);
  return NextResponse.json({ messages: presentMessages(messages, auth.user.id, { locale }) });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-message:${user.id}`, { limit: 20, windowMs: 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, messageSchema);
  if (!body.ok) return body.response;

  const senderName = displayName(user);
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { projectId: project.id, senderId: user.id, content: body.data.content },
      select: { id: true, createdAt: true },
    });
    await logActivity(
      {
        projectId: project.id,
        actorId: user.id,
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
      projectId: project.id,
      projectName: project.name,
      senderName,
      senderEmail: user.email,
      senderRole: 'client',
      content: body.data.content,
    })
  );

  return NextResponse.json({ message }, { status: 201 });
}
