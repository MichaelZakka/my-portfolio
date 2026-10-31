import { prisma } from '../db';
import { logActivity } from './activity';
import type { UserRole } from './constants';
import type { MeetingActionInput, MeetingCreateInput } from './validation';

/**
 * Meeting rules, shared by the admin and client routes. Each side acts as a
 * role ("client" covers every client member of the project):
 *
 * - creating a meeting proposes it, and the other side must answer;
 * - only the side that did not make the pending proposal can accept it;
 * - either side can propose a new time (the other side then has to answer)
 *   or cancel, including after it was confirmed.
 *
 * Updates are conditional on the state that was checked, so two people
 * answering at once cannot both win.
 */

export type MeetingActor = { id: string; role: UserRole };
export type MeetingEvent = 'MEETING_PROPOSED' | 'MEETING_RESCHEDULED' | 'MEETING_CONFIRMED' | 'MEETING_CANCELLED';

type Failure = { ok: false; status: number; code: string; error: string };
export type MeetingResult = { ok: true; meetingId: string; event: MeetingEvent; activityId: string } | Failure;

const fail = (status: number, code: string, error: string): Failure => ({ ok: false, status, code, error });

export const getProjectMeetings = (projectId: string) =>
  prisma.meeting.findMany({
    where: { projectId },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      title: true,
      agenda: true,
      location: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
      proposedByRole: true,
      milestone: { select: { id: true, title: true } },
      proposedBy: { select: { name: true, email: true } },
    },
  });

export type ProjectMeeting = Awaited<ReturnType<typeof getProjectMeetings>>[number];

/** Upcoming meetings first (soonest on top), then past and cancelled ones, newest first. */
export function sortMeetings<T extends { startsAt: Date; status: string }>(meetings: T[], now = new Date()): T[] {
  const isUpcoming = (m: T) => m.status !== 'cancelled' && m.startsAt.getTime() + 60 * 60 * 1000 > now.getTime();
  const upcoming = meetings.filter(isUpcoming);
  const rest = meetings.filter((m) => !isUpcoming(m)).reverse();
  return [...upcoming, ...rest];
}

export async function createMeeting(
  projectId: string,
  actor: MeetingActor,
  input: MeetingCreateInput
): Promise<MeetingResult> {
  if (input.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: input.milestoneId, projectId },
      select: { id: true },
    });
    if (!milestone) return fail(400, 'invalidInput', 'That milestone is not part of this project.');
  }

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.create({
      data: {
        projectId,
        milestoneId: input.milestoneId,
        title: input.title,
        agenda: input.agenda,
        location: input.location,
        startsAt: input.startsAt,
        durationMinutes: input.durationMinutes,
        proposedById: actor.id,
        proposedByRole: actor.role,
      },
      select: { id: true, title: true },
    });
    const activity = await logActivity(
      {
        projectId,
        actorId: actor.id,
        type: 'MEETING_PROPOSED',
        meta: { meetingId: meeting.id, title: meeting.title },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true as const, meetingId: meeting.id, event: 'MEETING_PROPOSED' as const, activityId: activity.id };
  });
}

export async function actOnMeeting(
  projectId: string,
  meetingId: string,
  actor: MeetingActor,
  input: MeetingActionInput
): Promise<MeetingResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: { id: true, title: true, status: true, proposedByRole: true, updatedAt: true },
  });
  if (!meeting) return fail(404, 'notFound', 'Meeting not found.');
  if (meeting.status === 'cancelled') return fail(409, 'meetingCancelled', 'This meeting was cancelled.');

  const now = new Date();
  let event: MeetingEvent;
  let data: Record<string, unknown>;

  if (input.action === 'accept') {
    if (meeting.status === 'confirmed') return fail(409, 'meetingConfirmed', 'This meeting is already confirmed.');
    if (meeting.proposedByRole === actor.role) {
      return fail(409, 'meetingAwaitingOther', 'The other side has to accept your proposal.');
    }
    event = 'MEETING_CONFIRMED';
    data = { status: 'confirmed', confirmedAt: now };
  } else if (input.action === 'reschedule') {
    event = 'MEETING_RESCHEDULED';
    data = {
      status: 'proposed',
      startsAt: input.startsAt,
      proposedById: actor.id,
      proposedByRole: actor.role,
      confirmedAt: null,
    };
  } else {
    event = 'MEETING_CANCELLED';
    data = { status: 'cancelled', cancelledAt: now };
  }

  return prisma.$transaction(async (tx) => {
    // Only applies if nobody changed the meeting since it was read.
    const { count } = await tx.meeting.updateMany({
      where: { id: meeting.id, updatedAt: meeting.updatedAt },
      data,
    });
    if (count !== 1) return fail(409, 'meetingChanged', 'This meeting was just changed. Reload and try again.');

    const activity = await logActivity(
      {
        projectId,
        actorId: actor.id,
        type: event,
        meta: { meetingId: meeting.id, title: meeting.title },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true as const, meetingId: meeting.id, event, activityId: activity.id };
  });
}
