import { NextResponse, after } from 'next/server';
import { authorizeAdminProject, getAdminActor } from '../../../../../lib/portal/access';
import { presentAdminMessages } from '../../../../../lib/portal/adminView';
import { notFound } from '../../../../../lib/portal/http';
import { createMessage, markReadByAdmin, readMessageInput } from '../../../../../lib/portal/messages';
import { notifyAboutMessage } from '../../../../../lib/portal/notify';
import { displayName, getMessagePage } from '../../../../../lib/portal/queries';
import { idSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/** The newest page, or with ?before=<message id> the page before it, in the admin screen's shape. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  const before = new URL(request.url).searchParams.get('before');
  if (before && !idSchema.safeParse(before).success) return notFound();

  const page = await getMessagePage(auth.project.id, { before, clientView: false });
  return NextResponse.json({ messages: presentAdminMessages(auth.project.id, page.messages), hasMore: page.hasMore });
}

/** Posts as the admin (JSON, or multipart with attachments); clients are emailed once per unread batch. */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const input = await readMessageInput(request);
  if (!input.ok) return input.response;

  const actor = await getAdminActor();
  const senderName = displayName(actor);
  const created = await createMessage({
    projectId: auth.project.id,
    sender: { id: actor.id, name: senderName },
    ...input.data,
  });
  if (!created.ok) return created.response;
  await markReadByAdmin(auth.project.id, created.data.createdAt);

  after(() =>
    notifyAboutMessage({
      messageId: created.data.id,
      projectId: auth.project.id,
      projectName: auth.project.name,
      senderName,
      senderEmail: actor.email,
      senderRole: 'admin',
      content: input.data.content,
      attachments: created.data.attachments,
    })
  );

  return NextResponse.json({ message: { id: created.data.id, createdAt: created.data.createdAt } }, { status: 201 });
}
