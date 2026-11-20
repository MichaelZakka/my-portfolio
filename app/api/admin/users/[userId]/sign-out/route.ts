import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { authorizeAdmin, getAdminActor } from '../../../../../lib/portal/access';
import { logAudit } from '../../../../../lib/portal/activity';
import { apiError, notFound, parseParam } from '../../../../../lib/portal/http';
import { idSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * Signs a client out of every device: bumping sessionVersion makes each
 * existing session cookie fail its check (see getPortalUser). Their password
 * stays, so they can sign straight back in. Logged on each of their projects'
 * audit trails, since activity is recorded per project.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, (await params).userId);
  if (!id.ok) return id.response;

  const user = await prisma.user.findUnique({
    where: { id: id.data },
    select: { id: true, name: true, email: true, role: true, memberships: { select: { projectId: true } } },
  });
  if (!user) return notFound('User not found.');
  if (user.role !== 'client') {
    return apiError(409, 'notClient', 'Only client accounts can be signed out from here.');
  }

  const actor = await getAdminActor();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    for (const { projectId } of user.memberships) {
      await logAudit(
        { projectId, actorId: actor.id, type: 'SESSIONS_REVOKED', meta: { email: user.email, name: user.name } },
        tx
      );
    }
  });

  return NextResponse.json({ ok: true });
}
