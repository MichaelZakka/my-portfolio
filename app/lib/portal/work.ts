import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logActivity, syncActivityVisibility } from './activity';
import type { WorkStatus } from './constants';

/**
 * Milestone and task mutations for the admin API. Status changes stamp
 * completedAt and log the *_COMPLETED events; ordering is a dense 0..n-1
 * sequence within each list (tasks are ordered within their milestone).
 */

type Tx = Prisma.TransactionClient;
const byOrder = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

/** Swaps an item with its neighbour and renumbers the list so legacy duplicate orders disappear. */
async function moveWithin(
  ids: string[],
  id: string,
  direction: 'up' | 'down',
  setOrder: (id: string, order: number) => Promise<unknown>
) {
  const index = ids.indexOf(id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  for (const [order, itemId] of ids.entries()) await setOrder(itemId, order);
}

function completedAtFor(status: WorkStatus, previous: Date | null, now: Date): Date | null {
  return status === 'done' ? previous ?? now : null;
}

// --- Milestones ---------------------------------------------------------------

export async function createMilestone(input: {
  projectId: string;
  actorId: string;
  title: string;
  description: string;
  status: WorkStatus;
  dueDate?: Date | null;
}) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const last = await tx.milestone.findFirst({
      where: { projectId: input.projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const milestone = await tx.milestone.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        status: input.status,
        dueDate: input.dueDate ?? null,
        order: (last?.order ?? -1) + 1,
        completedAt: completedAtFor(input.status, null, now),
      },
    });
    await logActivity(
      {
        projectId: input.projectId,
        actorId: input.actorId,
        type: 'MILESTONE_CREATED',
        meta: { milestoneId: milestone.id, title: milestone.title },
        visibleToClient: true,
      },
      tx
    );
    return milestone;
  });
}

export async function updateMilestone(input: {
  projectId: string;
  milestoneId: string;
  actorId: string;
  changes: {
    title?: string;
    description?: string;
    status?: WorkStatus;
    dueDate?: Date | null;
    move?: 'up' | 'down';
  };
}) {
  const { projectId, milestoneId, changes } = input;
  const now = new Date();
  return prisma.$transaction(async (tx: Tx) => {
    const current = await tx.milestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!current) return null;

    if (changes.move) {
      const siblings = await tx.milestone.findMany({ where: { projectId }, orderBy: byOrder, select: { id: true } });
      await moveWithin(siblings.map((s) => s.id), milestoneId, changes.move, (id, order) =>
        tx.milestone.update({ where: { id }, data: { order } })
      );
    }

    const status = changes.status ?? (current.status as WorkStatus);
    const milestone = await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        title: changes.title,
        description: changes.description,
        dueDate: changes.dueDate,
        status: changes.status,
        completedAt: changes.status ? completedAtFor(status, current.completedAt, now) : undefined,
      },
    });

    if (changes.status === 'done' && current.status !== 'done') {
      await logActivity(
        {
          projectId,
          actorId: input.actorId,
          type: 'MILESTONE_COMPLETED',
          meta: { milestoneId, title: milestone.title },
          visibleToClient: true,
        },
        tx
      );
    }
    return milestone;
  });
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<boolean> {
  // Tasks keep existing: Task.milestoneId is ON DELETE SET NULL.
  const { count } = await prisma.milestone.deleteMany({ where: { id: milestoneId, projectId } });
  return count === 1;
}

// --- Tasks --------------------------------------------------------------------

async function assertMilestoneInProject(tx: Tx, projectId: string, milestoneId: string | null) {
  if (!milestoneId) return true;
  const milestone = await tx.milestone.findFirst({ where: { id: milestoneId, projectId }, select: { id: true } });
  return Boolean(milestone);
}

async function nextTaskOrder(tx: Tx, projectId: string, milestoneId: string | null) {
  const last = await tx.task.findFirst({
    where: { projectId, milestoneId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function createTask(input: {
  projectId: string;
  actorId: string;
  title: string;
  description: string;
  status: WorkStatus;
  milestoneId: string | null;
  visibleToClient: boolean;
}) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    if (!(await assertMilestoneInProject(tx, input.projectId, input.milestoneId))) return null;
    const task = await tx.task.create({
      data: {
        projectId: input.projectId,
        milestoneId: input.milestoneId,
        title: input.title,
        description: input.description,
        status: input.status,
        visibleToClient: input.visibleToClient,
        order: await nextTaskOrder(tx, input.projectId, input.milestoneId),
        completedAt: completedAtFor(input.status, null, now),
      },
    });
    await logActivity(
      {
        projectId: input.projectId,
        actorId: input.actorId,
        type: 'TASK_CREATED',
        meta: { taskId: task.id, title: task.title },
        visibleToClient: task.visibleToClient,
      },
      tx
    );
    return task;
  });
}

export type TaskUpdateResult = { task: Awaited<ReturnType<typeof prisma.task.update>> } | { error: 'notFound' | 'badMilestone' };

export async function updateTask(input: {
  projectId: string;
  taskId: string;
  actorId: string;
  changes: {
    title?: string;
    description?: string;
    status?: WorkStatus;
    milestoneId?: string | null;
    visibleToClient?: boolean;
    move?: 'up' | 'down';
  };
}): Promise<TaskUpdateResult> {
  const { projectId, taskId, changes } = input;
  const now = new Date();
  return prisma.$transaction(async (tx: Tx) => {
    const current = await tx.task.findFirst({ where: { id: taskId, projectId } });
    if (!current) return { error: 'notFound' as const };

    const milestoneChanged = changes.milestoneId !== undefined && changes.milestoneId !== current.milestoneId;
    if (milestoneChanged && !(await assertMilestoneInProject(tx, projectId, changes.milestoneId ?? null))) {
      return { error: 'badMilestone' as const };
    }

    if (changes.move && !milestoneChanged) {
      const siblings = await tx.task.findMany({
        where: { projectId, milestoneId: current.milestoneId },
        orderBy: byOrder,
        select: { id: true },
      });
      await moveWithin(siblings.map((s) => s.id), taskId, changes.move, (id, order) =>
        tx.task.update({ where: { id }, data: { order } })
      );
    }

    const status = changes.status ?? (current.status as WorkStatus);
    const visibleToClient = changes.visibleToClient ?? current.visibleToClient;
    const task = await tx.task.update({
      where: { id: taskId },
      data: {
        title: changes.title,
        description: changes.description,
        status: changes.status,
        visibleToClient: changes.visibleToClient,
        completedAt: changes.status ? completedAtFor(status, current.completedAt, now) : undefined,
        ...(milestoneChanged
          ? {
              milestoneId: changes.milestoneId ?? null,
              order: await nextTaskOrder(tx, projectId, changes.milestoneId ?? null),
            }
          : {}),
      },
    });

    if (visibleToClient !== current.visibleToClient) {
      await syncActivityVisibility(projectId, { taskId }, visibleToClient, tx);
    }
    if (changes.status === 'done' && current.status !== 'done') {
      await logActivity(
        {
          projectId,
          actorId: input.actorId,
          type: 'TASK_COMPLETED',
          meta: { taskId, title: task.title },
          visibleToClient,
        },
        tx
      );
    }
    return { task };
  });
}

export async function deleteTask(projectId: string, taskId: string): Promise<boolean> {
  const { count } = await prisma.task.deleteMany({ where: { id: taskId, projectId } });
  return count === 1;
}
