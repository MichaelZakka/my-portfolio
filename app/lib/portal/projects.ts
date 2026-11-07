import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logActivity } from './activity';
import type { ProjectStatus } from './constants';

/**
 * Creates a project, optionally from the request (Lead) it came from. Shared by
 * "New project" / "Convert to project", "Accept request" and accepted
 * proposals; callers check that the request exists and is not converted yet,
 * so they can answer with its project.
 */

type ProjectCreateFailure = { ok: false; status: number; code: string; error: string };

export type ProjectCreateInput = {
  name: string;
  summary: string;
  status: ProjectStatus;
  currentPhase: string;
  estimatedCompletion: Date | null;
  request: { id: string; status: string } | null;
  markRequestWon: boolean;
  actorId: string;
};

/** A unique constraint lost a race (e.g. two conversions of one request: Project.requestId). */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** The project row, its PROJECT_CREATED activity and the request's Won status, inside the caller's transaction. */
export async function createProjectInTransaction(tx: Prisma.TransactionClient, input: ProjectCreateInput) {
  const { request } = input;
  const now = new Date();

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
}

export async function createProject(
  input: ProjectCreateInput
): Promise<{ ok: true; project: { id: string; name: string } } | ProjectCreateFailure> {
  try {
    const project = await prisma.$transaction((tx) => createProjectInTransaction(tx, input));
    return { ok: true, project };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, code: 'alreadyConverted', error: 'This request was already converted.' };
    }
    throw err;
  }
}
