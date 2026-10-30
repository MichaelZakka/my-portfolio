import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { authorizeAdminProject } from '../../../../../../lib/portal/access';
import { notFound, parseParam } from '../../../../../../lib/portal/http';
import { idSchema } from '../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; memberId: string }> };

/** Removes a client's access to this project (their account and other projects are untouched). */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { projectId, memberId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, memberId);
  if (!id.ok) return id.response;

  const member = await prisma.projectMember.findFirst({
    where: { id: id.data, projectId: auth.project.id },
    include: { user: { select: { email: true } } },
  });
  if (!member) return notFound('Member not found.');

  await prisma.$transaction([
    prisma.projectMember.delete({ where: { id: member.id } }),
    // A still-pending link would otherwise let them straight back in.
    prisma.invitation.updateMany({
      where: { projectId: auth.project.id, email: member.user.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return NextResponse.json({ success: true });
}
