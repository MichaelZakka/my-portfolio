import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { authorizeAdmin, getAdminActor } from '../../../lib/portal/access';
import { progressPercent } from '../../../lib/portal/constants';
import { apiError, parseJsonBody } from '../../../lib/portal/http';
import { createInvitation } from '../../../lib/portal/invitations';
import { createProject } from '../../../lib/portal/projects';
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
        select: { id: true, status: true, clientEmail: true, project: { select: { id: true } } },
      })
    : null;
  if (input.requestId && !lead) return apiError(404, 'notFound', 'Request not found.');
  if (lead?.project) {
    return apiError(409, 'alreadyConverted', 'This request was already converted.', {
      projectId: lead.project.id,
    });
  }

  const actor = await getAdminActor();
  const created = await createProject({
    name: input.name,
    summary: input.summary,
    status: input.status,
    currentPhase: input.currentPhase,
    estimatedCompletion: input.estimatedCompletion ?? null,
    request: lead,
    markRequestWon: input.markRequestWon,
    actorId: actor.id,
  });
  if (!created.ok) return apiError(created.status, created.code, created.error);
  const { project } = created;

  // The project exists either way; an invitation problem is reported, not fatal.
  const invite = input.invite
    ? await createInvitation({
        projectId: project.id,
        projectName: project.name,
        email: input.invite.email,
        name: input.invite.name,
        locale: input.invite.locale,
        actorId: actor.id,
        // Whoever sent the request is told it was accepted; anyone else gets a plain invitation.
        kind: lead && input.invite.email === lead.clientEmail.trim().toLowerCase() ? 'requestAccepted' : 'invite',
      })
    : null;

  return NextResponse.json({ project, invite }, { status: 201 });
}
