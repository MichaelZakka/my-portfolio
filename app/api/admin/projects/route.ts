import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { authorizeAdmin, getAdminActor } from '../../../lib/portal/access';
import { logActivity } from '../../../lib/portal/activity';
import { progressPercent } from '../../../lib/portal/constants';
import { apiError, parseJsonBody } from '../../../lib/portal/http';
import { createInvitation } from '../../../lib/portal/invitations';
import { projectCreateSchema } from '../../../lib/portal/validation';

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      milestones: { select: { status: true } },
      members: { select: { user: { select: { email: true, name: true } } } },
    },
  });
  return NextResponse.json({
    projects: projects.map(({ milestones, members, ...project }) => ({
      ...project,
      progress: progressPercent(milestones),
      clients: members.map((m) => m.user),
    })),
  });
}

/** Creates a project — optionally from a lead (Project.requestId) and with a first client invitation. */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, projectCreateSchema);
  if (!body.ok) return body.response;
  const input = body.data;

  const lead = input.requestId
    ? await prisma.lead.findUnique({
        where: { id: input.requestId },
        select: { id: true, status: true, project: { select: { id: true } } },
      })
    : null;
  if (input.requestId && !lead) return apiError(404, 'notFound', 'Request not found.');
  if (lead?.project) {
    return apiError(409, 'alreadyConverted', 'This request was already converted.', {
      projectId: lead.project.id,
    });
  }

  const actor = await getAdminActor();
  const now = new Date();

  let project;
  try {
    project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: input.name,
          summary: input.summary,
          status: input.status,
          currentPhase: input.currentPhase,
          estimatedCompletion: input.estimatedCompletion ?? null,
          requestId: lead?.id ?? null,
          startedAt: input.status === 'planning' ? null : now,
          completedAt: input.status === 'completed' ? now : null,
        },
        select: { id: true, name: true },
      });
      await logActivity(
        {
          projectId: created.id,
          actorId: actor.id,
          type: 'PROJECT_CREATED',
          meta: { name: created.name },
          visibleToClient: true,
        },
        tx
      );
      if (lead && input.markRequestWon && lead.status !== 'won') {
        await tx.lead.update({ where: { id: lead.id }, data: { status: 'won' } });
        await tx.leadStatusEvent.create({
          data: { leadId: lead.id, fromStatus: lead.status, toStatus: 'won', note: 'Converted to a client project' },
        });
      }
      return created;
    });
  } catch (err) {
    // Two conversions racing on the unique requestId.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return apiError(409, 'alreadyConverted', 'This request was already converted.');
    }
    throw err;
  }

  // The project exists either way; an invitation problem is reported, not fatal.
  const invite = input.invite
    ? await createInvitation({
        projectId: project.id,
        projectName: project.name,
        email: input.invite.email,
        name: input.invite.name,
        locale: input.invite.locale,
        actorId: actor.id,
      })
    : null;

  return NextResponse.json({ project, invite }, { status: 201 });
}
