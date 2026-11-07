import { prisma } from '../db';
import { logActivity, logAudit } from './activity';
import { displayName } from './queries';

/**
 * Milestone sign-off. The admin opens a round (one pending round per
 * milestone); any client member of the project answers it. Approving marks
 * the milestone done; asking for changes reopens it. Every round is kept, so
 * the admin sees who approved what and how many revision rounds it took.
 */

type Failure = { ok: false; status: number; code: string; error: string };
const fail = (status: number, code: string, error: string): Failure => ({ ok: false, status, code, error });

export async function requestMilestoneReview(input: {
  projectId: string;
  milestoneId: string;
  actorId: string;
  note: string;
  link: string;
}): Promise<{ ok: true; reviewId: string; milestoneTitle: string } | Failure> {
  const { projectId, milestoneId } = input;
  return prisma.$transaction(async (tx) => {
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, projectId },
      select: { id: true, title: true, status: true },
    });
    if (!milestone) return fail(404, 'notFound', 'Milestone not found.');

    const pending = await tx.milestoneReview.findFirst({
      where: { milestoneId, status: 'pending' },
      select: { id: true },
    });
    if (pending) return fail(409, 'reviewPending', 'This milestone is already awaiting the client’s approval.');

    const review = await tx.milestoneReview.create({
      data: { projectId, milestoneId, note: input.note, link: input.link, requestedById: input.actorId },
      select: { id: true },
    });
    // Work that is up for approval has started, even if nobody moved it out of To do.
    if (milestone.status === 'todo') {
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'in_progress' } });
    }
    await logActivity(
      {
        projectId,
        actorId: input.actorId,
        type: 'MILESTONE_REVIEW_REQUESTED',
        meta: { milestoneId, reviewId: review.id, title: milestone.title },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true, reviewId: review.id, milestoneTitle: milestone.title };
  });
}

/**
 * Cancels the pending round (e.g. sent too early) and hides its "ready for
 * your approval" entry from the client's feed. Returns false when nothing was pending.
 */
export async function withdrawMilestoneReview(projectId: string, milestoneId: string, actorId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const pending = await tx.milestoneReview.findMany({
      where: { projectId, milestoneId, status: 'pending' },
      select: { id: true, milestone: { select: { title: true } } },
    });
    if (pending.length === 0) return false;

    await tx.milestoneReview.updateMany({
      where: { id: { in: pending.map((r) => r.id) }, status: 'pending' },
      data: { status: 'withdrawn' },
    });
    for (const { id, milestone } of pending) {
      await tx.activity.updateMany({
        where: { projectId, type: 'MILESTONE_REVIEW_REQUESTED', meta: { contains: `"reviewId":"${id}"` } },
        data: { visibleToClient: false },
      });
      await logAudit(
        { projectId, actorId, type: 'MILESTONE_REVIEW_WITHDRAWN', meta: { milestoneId, reviewId: id, title: milestone.title } },
        tx
      );
    }
    return true;
  });
}

export async function respondToMilestoneReview(input: {
  projectId: string;
  milestoneId: string;
  user: { id: string; name: string; email: string };
  action: 'approve' | 'changes';
  comment: string;
}): Promise<{ ok: true; milestoneTitle: string } | Failure> {
  const { projectId, milestoneId, user } = input;
  const approved = input.action === 'approve';
  const now = new Date();
  const notPending = fail(409, 'reviewNotPending', 'This milestone is not awaiting approval.');

  return prisma.$transaction(async (tx) => {
    const review = await tx.milestoneReview.findFirst({
      where: { projectId, milestoneId, status: 'pending' },
      select: { id: true, milestone: { select: { title: true, completedAt: true } } },
    });
    if (!review) return notPending;

    // Claim the round atomically: a second click, another client member or a withdrawal racing this loses.
    const claimed = await tx.milestoneReview.updateMany({
      where: { id: review.id, status: 'pending' },
      data: {
        status: approved ? 'approved' : 'changes_requested',
        respondedById: user.id,
        respondedAt: now,
        response: input.comment || null,
      },
    });
    if (claimed.count !== 1) return notPending;

    await tx.milestone.update({
      where: { id: milestoneId },
      data: approved
        ? { status: 'done', completedAt: review.milestone.completedAt ?? now }
        : { status: 'in_progress', completedAt: null },
    });
    await logActivity(
      {
        projectId,
        actorId: user.id,
        type: approved ? 'MILESTONE_APPROVED' : 'MILESTONE_CHANGES_REQUESTED',
        meta: { milestoneId, reviewId: review.id, title: review.milestone.title, name: displayName(user) },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true, milestoneTitle: review.milestone.title };
  });
}
