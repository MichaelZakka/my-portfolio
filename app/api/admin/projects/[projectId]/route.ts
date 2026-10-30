import { NextResponse, after } from 'next/server';
import { prisma } from '../../../../lib/db';
import { authorizeAdminProject, getAdminActor } from '../../../../lib/portal/access';
import { logActivity } from '../../../../lib/portal/activity';
import { notFound, parseJsonBody } from '../../../../lib/portal/http';
import { notifyAboutStatusChange } from '../../../../lib/portal/notify';
import { getAdminProjectDetail } from '../../../../lib/portal/queries';
import { projectUpdateSchema } from '../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;

  const project = await getAdminProjectDetail(auth.project.id);
  if (!project) return notFound('Project not found.');
  return NextResponse.json({ project });
}

/** Edits project fields, archives/unarchives, and logs + emails status changes. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeAdminProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, projectUpdateSchema);
  if (!body.ok) return body.response;
  const { archived, ...changes } = body.data;

  const current = await prisma.project.findUnique({ where: { id: auth.project.id } });
  if (!current) return notFound('Project not found.');

  const now = new Date();
  const statusChanged = changes.status !== undefined && changes.status !== current.status;
  const actor = await getAdminActor();

  const { project, activityId } = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: current.id },
      data: {
        ...changes,
        ...(statusChanged
          ? {
              startedAt: current.startedAt ?? (changes.status === 'planning' ? null : now),
              completedAt: changes.status === 'completed' ? current.completedAt ?? now : null,
            }
          : {}),
        ...(archived === undefined ? {} : { archivedAt: archived ? current.archivedAt ?? now : null }),
      },
    });
    const activity = statusChanged
      ? await logActivity(
          {
            projectId: project.id,
            actorId: actor.id,
            type: 'STATUS_CHANGED',
            meta: { from: current.status, to: project.status },
            visibleToClient: true,
          },
          tx
        )
      : null;
    return { project, activityId: activity?.id ?? null };
  });

  if (activityId) {
    after(() =>
      notifyAboutStatusChange({
        activityId,
        projectId: project.id,
        projectName: project.name,
        fromStatus: current.status,
        toStatus: project.status,
        phase: project.currentPhase,
      })
    );
  }

  return NextResponse.json({ project });
}
