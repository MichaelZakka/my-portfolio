import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db';
import { logActivity } from './activity';
import {
  COMMUNICATION_RATINGS,
  REVIEW_PAIN_POINTS,
  SERVICE_RATINGS,
  type CompletionAnswer,
  type ReviewPainPoint,
} from './constants';
import { displayName } from './queries';
import type { ClientReviewInput } from './validation';

/**
 * End-of-project sign-off and the private client review.
 *
 * Marking a project Completed opens a CompletionRound; moving it out of
 * Completed closes it (answers are kept) and completing it again opens a new
 * one, so every completion asks again. In the open round each client member
 * first answers "is the project complete?" (yes, or not yet with what is
 * missing; a "not yet" can later become a yes), then fills in the review
 * survey, which locks on submit. Only the admin dashboard shows the answers.
 */

type Db = PrismaClient | Prisma.TransactionClient;
type Failure = { ok: false; status: number; code: string; error: string };
const fail = (status: number, code: string, error: string): Failure => ({ ok: false, status, code, error });

const notOpen = () => fail(409, 'completionNotOpen', 'This project is not waiting for a completion sign-off.');

/**
 * Keeps the rounds in step with the project status, inside the caller's
 * transaction: Completed needs an open round, anything else closes it.
 * Returns the round opened by this call, if any.
 */
export async function syncCompletionRound(
  db: Db,
  projectId: string,
  status: string,
  now = new Date()
): Promise<{ openedRoundId: string | null }> {
  if (status !== 'completed') {
    await db.completionRound.updateMany({ where: { projectId, closedAt: null }, data: { closedAt: now } });
    return { openedRoundId: null };
  }
  const open = await db.completionRound.findFirst({ where: { projectId, closedAt: null }, select: { id: true } });
  if (open) return { openedRoundId: null };
  const round = await db.completionRound.create({ data: { projectId, openedAt: now }, select: { id: true } });
  return { openedRoundId: round.id };
}

/** The open round of a project that is Completed, or null. */
async function openRound(db: Db, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { status: true } });
  if (project?.status !== 'completed') return null;
  return db.completionRound.findFirst({
    where: { projectId, closedAt: null },
    orderBy: { openedAt: 'desc' },
    select: { id: true, openedAt: true },
  });
}

export type ClientCompletionState = {
  roundId: string;
  openedAt: Date;
  answer: CompletionAnswer | null;
  missingNote: string;
  submittedAt: Date | null;
};

/**
 * What one client sees about the sign-off: null unless the project is
 * Completed with an open round. userId null (the admin preview of a project
 * without clients) shows the unanswered state.
 */
export async function getClientCompletionState(
  projectId: string,
  userId: string | null
): Promise<ClientCompletionState | null> {
  const round = await openRound(prisma, projectId);
  if (!round) return null;
  const response = userId
    ? await prisma.clientReview.findUnique({
        where: { roundId_userId: { roundId: round.id, userId } },
        select: { completion: true, missingNote: true, submittedAt: true },
      })
    : null;
  return {
    roundId: round.id,
    openedAt: round.openedAt,
    answer: response?.completion === 'confirmed' || response?.completion === 'not_yet' ? response.completion : null,
    missingNote: response?.missingNote ?? '',
    submittedAt: response?.submittedAt ?? null,
  };
}

/** A client's own submitted review, for their read-only copy (null until submitted). */
export async function getOwnSubmittedReview(roundId: string, userId: string) {
  const review = await prisma.clientReview.findUnique({
    where: { roundId_userId: { roundId, userId } },
    select: {
      submittedAt: true,
      overall: true,
      recommend: true,
      portalEase: true,
      painPoints: true,
      portalComment: true,
      quality: true,
      deadlines: true,
      requirements: true,
      value: true,
      responsiveness: true,
      updates: true,
      involvement: true,
      wentWell: true,
      improve: true,
      otherComment: true,
    },
  });
  if (!review?.submittedAt) return null;
  return { ...review, submittedAt: review.submittedAt, painPoints: parsePainPoints(review.painPoints) };
}

type Reviewer = { id: string; name: string; email: string };

/**
 * A client answers "is the project complete?". Allowed until their survey is
 * submitted; a repeated "yes" changes nothing (and logs nothing).
 */
export async function answerCompletion(input: {
  projectId: string;
  user: Reviewer;
  locale: string;
  action: 'confirm' | 'not_yet';
  note: string;
}): Promise<{ ok: true; reviewId: string; activityId: string | null } | Failure> {
  const { projectId, user } = input;
  const confirmed = input.action === 'confirm';
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const round = await openRound(tx, projectId);
    if (!round) return notOpen();

    const existing = await tx.clientReview.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: user.id } },
      select: { id: true, completion: true, submittedAt: true },
    });
    if (existing?.submittedAt) return fail(409, 'reviewSubmitted', 'Your review was already submitted.');
    if (confirmed && existing?.completion === 'confirmed') {
      return { ok: true as const, reviewId: existing.id, activityId: null };
    }

    const answer = {
      completion: confirmed ? 'confirmed' : 'not_yet',
      answeredAt: now,
      confirmedAt: confirmed ? now : null,
      // A "yes" keeps the earlier note, so the admin still sees what had been missing.
      ...(confirmed ? {} : { missingNote: input.note }),
      reviewerName: user.name,
      reviewerEmail: user.email,
      locale: input.locale,
    };
    const review = existing
      ? await tx.clientReview.update({ where: { id: existing.id }, data: answer, select: { id: true } })
      : await tx.clientReview.create({
          data: { ...answer, projectId, roundId: round.id, userId: user.id },
          select: { id: true },
        });

    const meta = { roundId: round.id, reviewId: review.id, name: displayName(user) };
    const activity = await logActivity(
      confirmed
        ? { projectId, actorId: user.id, type: 'PROJECT_COMPLETION_CONFIRMED', meta, visibleToClient: true }
        : { projectId, actorId: user.id, type: 'PROJECT_COMPLETION_NOT_YET', meta, visibleToClient: true },
      tx
    );
    return { ok: true as const, reviewId: review.id, activityId: activity.id };
  });
}

/** Submits the survey once the client has confirmed completion. It locks: a second submit fails. */
export async function submitClientReview(input: {
  projectId: string;
  user: Reviewer;
  locale: string;
  answers: ClientReviewInput;
}): Promise<{ ok: true; reviewId: string; activityId: string } | Failure> {
  const { projectId, user, answers } = input;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const round = await openRound(tx, projectId);
    if (!round) return notOpen();

    const existing = await tx.clientReview.findUnique({
      where: { roundId_userId: { roundId: round.id, userId: user.id } },
      select: { id: true, completion: true },
    });
    if (existing?.completion !== 'confirmed') {
      return fail(409, 'completionNotConfirmed', 'Confirm the project is complete before reviewing it.');
    }

    // Claimed atomically: a double submit (two tabs) loses.
    const claimed = await tx.clientReview.updateMany({
      where: { id: existing.id, submittedAt: null },
      data: {
        ...answers,
        painPoints: JSON.stringify(answers.painPoints),
        submittedAt: now,
        locale: input.locale,
        reviewerName: user.name,
        reviewerEmail: user.email,
      },
    });
    if (claimed.count !== 1) return fail(409, 'reviewSubmitted', 'Your review was already submitted.');

    const activity = await logActivity(
      {
        projectId,
        actorId: user.id,
        type: 'CLIENT_REVIEW_SUBMITTED',
        meta: { roundId: round.id, reviewId: existing.id, name: displayName(user), overall: answers.overall },
        // Private: other client members never see that, or how, a colleague rated the project.
        visibleToClient: false,
      },
      tx
    );
    return { ok: true as const, reviewId: existing.id, activityId: activity.id };
  });
}

// --- Admin -------------------------------------------------------------------

export function parsePainPoints(value: string): ReviewPainPoint[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((p): p is ReviewPainPoint => (REVIEW_PAIN_POINTS as readonly string[]).includes(p))
      : [];
  } catch {
    return [];
  }
}

const REVIEW_SELECT = {
  id: true,
  projectId: true,
  roundId: true,
  userId: true,
  reviewerName: true,
  reviewerEmail: true,
  locale: true,
  completion: true,
  missingNote: true,
  answeredAt: true,
  confirmedAt: true,
  submittedAt: true,
  overall: true,
  recommend: true,
  portalEase: true,
  painPoints: true,
  portalComment: true,
  quality: true,
  deadlines: true,
  requirements: true,
  value: true,
  responsiveness: true,
  updates: true,
  involvement: true,
  wentWell: true,
  improve: true,
  otherComment: true,
  user: { select: { name: true, email: true } },
} satisfies Prisma.ClientReviewSelect;

export type ClientReviewRow = Prisma.ClientReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

/** Who wrote it: the account's current name, else the name saved with the review. */
export function reviewerLabel(row: Pick<ClientReviewRow, 'user' | 'reviewerName' | 'reviewerEmail'>): string {
  if (row.user) return displayName(row.user);
  return row.reviewerName.trim() || row.reviewerEmail || 'A former client';
}

/**
 * The sign-off for the admin project screen: every round (newest first) with
 * each answer, and for the open round which members have not answered yet.
 */
export async function getAdminCompletion(projectId: string) {
  const [rounds, members] = await Promise.all([
    prisma.completionRound.findMany({
      where: { projectId },
      orderBy: { openedAt: 'desc' },
      select: { id: true, openedAt: true, closedAt: true, responses: { select: REVIEW_SELECT } },
    }),
    prisma.projectMember.findMany({
      where: { projectId, user: { role: 'client' } },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  return { rounds, members };
}

/** NPS: % promoters (9–10) minus % detractors (0–6), from −100 to 100; null without answers. */
export function netPromoterScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number');
  return present.length ? present.reduce((sum, v) => sum + v, 0) / present.length : null;
}

/** Everything the Client reviews screen shows. */
export async function getReviewsDashboard() {
  const [submitted, openRounds, roundsTotal, projectsReviewed] = await Promise.all([
    prisma.clientReview.findMany({
      where: { submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      select: { ...REVIEW_SELECT, project: { select: { id: true, name: true } } },
    }),
    // Sign-offs still in progress: Completed projects whose clients have not all reviewed.
    prisma.completionRound.findMany({
      where: { closedAt: null, project: { status: 'completed' } },
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        openedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            archivedAt: true,
            members: {
              where: { user: { role: 'client' } },
              orderBy: { createdAt: 'asc' },
              select: { userId: true, user: { select: { name: true, email: true } } },
            },
          },
        },
        responses: { select: { userId: true, completion: true, missingNote: true, submittedAt: true, answeredAt: true } },
      },
    }),
    prisma.completionRound.count(),
    prisma.completionRound.count({ where: { responses: { some: { submittedAt: { not: null } } } } }),
  ]);

  const ratings = (field: (typeof SERVICE_RATINGS)[number] | (typeof COMMUNICATION_RATINGS)[number]) =>
    average(submitted.map((r) => r[field]));
  const painCounts = new Map<ReviewPainPoint, number>();
  for (const review of submitted) {
    for (const point of parsePainPoints(review.painPoints)) painCounts.set(point, (painCounts.get(point) ?? 0) + 1);
  }

  const pending = openRounds.flatMap((round) =>
    round.project.members.flatMap((member) => {
      const response = round.responses.find((r) => r.userId === member.userId);
      if (response?.submittedAt) return [];
      return [
        {
          key: `${round.id}-${member.userId}`,
          projectId: round.project.id,
          projectName: round.project.name,
          archived: Boolean(round.project.archivedAt),
          client: displayName(member.user),
          openedAt: round.openedAt,
          state: !response ? ('unanswered' as const) : response.completion === 'not_yet' ? ('not_yet' as const) : ('confirmed' as const),
          missingNote: response?.completion === 'not_yet' ? response.missingNote : '',
          answeredAt: response?.answeredAt ?? null,
        },
      ];
    })
  );

  return {
    reviews: submitted,
    pending,
    summary: {
      count: submitted.length,
      overall: average(submitted.map((r) => r.overall)),
      portalEase: average(submitted.map((r) => r.portalEase)),
      nps: netPromoterScore(submitted.flatMap((r) => (r.recommend === null ? [] : [r.recommend]))),
      npsAnswers: submitted.filter((r) => r.recommend !== null).length,
      roundsTotal,
      projectsReviewed,
      service: SERVICE_RATINGS.map((field) => ({ field, value: ratings(field) })),
      communication: COMMUNICATION_RATINGS.map((field) => ({ field, value: ratings(field) })),
      painPoints: [...painCounts.entries()].sort((a, b) => b[1] - a[1]).map(([point, count]) => ({ point, count })),
    },
  };
}

export type ReviewsDashboard = Awaited<ReturnType<typeof getReviewsDashboard>>;
