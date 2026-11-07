import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { authorizeAdmin, getAdminActor } from '../../../../../lib/portal/access';
import { apiError, parseJsonBody, parseParam } from '../../../../../lib/portal/http';
import { createInvitation } from '../../../../../lib/portal/invitations';
import { createProject } from '../../../../../lib/portal/projects';
import { emailSchema, idSchema, localeBodySchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * "Accept request": creates the project from the brief, marks the request Won
 * and emails the client that it was accepted, with an invitation link that
 * adds them to the project in the portal. To change the defaults first, the
 * admin uses "Convert to project" (POST /api/admin/projects) instead.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;

  const id = parseParam(idSchema, (await params).id);
  if (!id.ok) return id.response;

  const body = await parseJsonBody(request, localeBodySchema);
  if (!body.ok) return body.response;

  const lead = await prisma.lead.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      status: true,
      projectTitle: true,
      projectDescription: true,
      clientName: true,
      clientEmail: true,
      project: { select: { id: true } },
    },
  });
  if (!lead) return apiError(404, 'notFound', 'Request not found.');
  if (lead.project) {
    return apiError(409, 'alreadyConverted', 'This request was already converted.', {
      projectId: lead.project.id,
    });
  }

  // Checked before anything is created: accepting is pointless if the client can't be told.
  const email = emailSchema.safeParse(lead.clientEmail);
  if (!email.success) {
    return apiError(400, 'invalidEmail', 'This request has no valid client email. Use “Customize” to invite someone.');
  }
  const clientName = lead.clientName.trim().slice(0, 100);

  const actor = await getAdminActor();
  const created = await createProject({
    name: (lead.projectTitle.trim() || `Project for ${clientName || email.data}`).slice(0, 200),
    summary: lead.projectDescription.trim().slice(0, 5000),
    status: 'planning',
    currentPhase: '',
    estimatedCompletion: null,
    request: lead,
    markRequestWon: true,
    actorId: actor.id,
  });
  if (!created.ok) return apiError(created.status, created.code, created.error);
  const { project } = created;

  // The project exists either way; an invitation problem is reported, not fatal.
  const invite = await createInvitation({
    projectId: project.id,
    projectName: project.name,
    email: email.data,
    name: clientName,
    locale: body.data.locale,
    actorId: actor.id,
    kind: 'requestAccepted',
  });

  return NextResponse.json({ project, invite }, { status: 201 });
}
