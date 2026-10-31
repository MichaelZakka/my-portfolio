import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logActivity } from './activity';
import type { ProjectStatus } from './constants';

/**
 * Creates a project, optionally from the request (Lead) it came from. Shared by
 * "New project" / "Convert to project" and "Accept request"; callers check that
 * the request exists and is not converted yet, so they can answer with its project.
 */

type ProjectCreateFailure = { ok: false; status: number; code: string; error: string };

export async function createProject(input: {
  name: string;
  summary: string;
  status: ProjectStatus;
  currentPhase: string;
  estimatedCompletion: Date | null;
  request: { id: string; status: string } | null;
  markRequestWon: boolean;
  actorId: string;
}): Promise<{ ok: true; project: { id: string; name: string } } | ProjectCreateFailure> {
  const { request } = input;
  const now = new Date();

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: input.name,
          summary: input.summary,
          status: input.status,
          currentPhase: input.currentPhase,
          estimatedCompletion: input.estimatedCompletion,
          requestId: request?.id ?? null,
          startedAt: input.status === 'planning' ? null : now,
          completedAt: input.status === 'completed' ? now : null,
        },
        select: { id: true, name: true },
      });
      await logActivity(
        {
          projectId: created.id,
          actorId: input.actorId,
          type: 'PROJECT_CREATED',
          meta: { name: created.name },
          visibleToClient: true,
        },
        tx
      );
      if (request && input.markRequestWon && request.status !== 'won') {
        await tx.lead.update({ where: { id: request.id }, data: { status: 'won' } });
        await tx.leadStatusEvent.create({
          data: { leadId: request.id, fromStatus: request.status, toStatus: 'won', note: 'Converted to a client project' },
        });
      }
      return created;
    });
    return { ok: true, project };
  } catch (err) {
    // Two conversions racing on the unique requestId.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, status: 409, code: 'alreadyConverted', error: 'This request was already converted.' };
    }
    throw err;
  }
}
