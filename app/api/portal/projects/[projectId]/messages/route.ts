import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { apiError, notFound, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { createMessage, markReadByClient, readMessageInput } from '../../../../../lib/portal/messages';
import { notifyAboutMessage } from '../../../../../lib/portal/notify';
import { presentMessages } from '../../../../../lib/portal/present';
import { displayName, getMessagePage } from '../../../../../lib/portal/queries';
import { idSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The newest page of the conversation, or with ?before=<message id> the page before it. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const before = new URL(request.url).searchParams.get('before');
  if (before && !idSchema.safeParse(before).success) return notFound();

  const [page, locale] = await Promise.all([
    getMessagePage(auth.project.id, { before, clientView: true }),
    getPortalLocale(),
  ]);
  return NextResponse.json({
    messages: presentMessages(page.messages, auth.user.id, {
      locale,
      timeZone: auth.user.timeZone,
      projectId: auth.project.id,
    }),
    hasMore: page.hasMore,
  });
}

/** A message (JSON), or a message with attachments (multipart: content + files). */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (project.archivedAt) return apiError(403, 'projectArchived', 'This project is archived.');
  if (!rateLimit(`portal-message:${user.id}`, { limit: 20, windowMs: 60 * 1000 }).success) {
    return rateLimited();
  }

  const input = await readMessageInput(request);
  if (!input.ok) return input.response;

  const senderName = displayName(user);
  const created = await createMessage({ projectId: project.id, sender: { id: user.id, name: senderName }, ...input.data });
  if (!created.ok) return created.response;
  // Writing in the conversation means everything up to this message has been seen.
  await markReadByClient(project.id, user.id, created.data.createdAt);

  after(() =>
    notifyAboutMessage({
      messageId: created.data.id,
      projectId: project.id,
      projectName: project.name,
      senderName,
      senderEmail: user.email,
      senderRole: 'client',
      content: input.data.content,
      attachments: created.data.attachments,
    })
  );

  return NextResponse.json({ message: { id: created.data.id, createdAt: created.data.createdAt } }, { status: 201 });
}
