import { prisma } from '../db';
import { logActivity } from './activity';
import { isMeetingFinished, type UserRole } from './constants';
import type { MeetingActionInput, MeetingCreateInput, MeetingEditInput } from './validation';

/**
 * Meeting rules, shared by the admin and client routes. Each side acts as a
 * role ("client" covers every client member of the project):
 *
 * - creating a meeting proposes it, and the other side must answer;
 * - only the side that did not make the pending proposal can accept it;
 * - either side can propose a new time (the other side then has to answer)
 *   or cancel, including after it was confirmed;
 * - an upcoming meeting's details (topic, agenda, duration, milestone) belong
 *   to the side that created it (createdByRole), which can edit them without
 *   asking again; the Google Meet link is always the admin's to add or change,
 *   and doing so emails the clients (MEETING_LINK_ADDED).
 *
 * Once the meeting has started, the admin writes notes (meetingNotes.ts);
 * publishing them marks it "held". A meeting that did not take place is
 * marked "no_show" instead. Both are final for the rules above.
 *
 * Updates are conditional on the state that was checked, so two people
 * answering at once cannot both win.
 */

export type MeetingActor = { id: string; role: UserRole };
export type MeetingEvent =
  | 'MEETING_PROPOSED'
  | 'MEETING_RESCHEDULED'
  | 'MEETING_CONFIRMED'
  | 'MEETING_CANCELLED'
  | 'MEETING_UPDATED'
  | 'MEETING_LINK_ADDED'
  | 'MEETING_NO_SHOW'
  | 'MEETING_NOTES_PUBLISHED'
  | 'MEETING_NOTES_UPDATED'
  | 'MEETING_NOTES_ACKNOWLEDGED'
  | 'MEETING_NOTES_COMMENTED'
  | 'MEETING_ACTION_ITEM_DONE';

export type Failure = { ok: false; status: number; code: string; error: string };
export type MeetingResult = { ok: true; meetingId: string; event: MeetingEvent; activityId: string } | Failure;

export const fail = (status: number, code: string, error: string): Failure => ({ ok: false, status, code, error });

const meetingOver = () => fail(409, 'meetingPast', 'This meeting is already over.');

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
      createdByRole: true,
      milestone: { select: { id: true, title: true } },
      proposedBy: { select: { name: true, email: true } },
      // Notes: present.ts shows clients only published ones.
      outputSummary: true,
      outputSavedAt: true,
      outputPublishedAt: true,
      acknowledgedAt: true,
      acknowledgedBy: { select: { name: true, email: true } },
      actionItems: {
        orderBy: { position: 'asc' },
        select: { id: true, text: true, owner: true, doneAt: true, doneBy: { select: { name: true, email: true } } },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, authorRole: true, createdAt: true, author: { select: { name: true, email: true } } },
      },
    },
  });

export type ProjectMeeting = Awaited<ReturnType<typeof getProjectMeetings>>[number];

/** Upcoming meetings first (soonest on top), then past and cancelled ones, newest first. */
export function sortMeetings<T extends { startsAt: Date; status: string }>(meetings: T[], now = new Date()): T[] {
  const isUpcoming = (m: T) =>
    m.status !== 'cancelled' && !isMeetingFinished(m.status) && m.startsAt.getTime() + 60 * 60 * 1000 > now.getTime();
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
        createdByRole: actor.role,
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
  if (isMeetingFinished(meeting.status)) return meetingOver();

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
      // The new time gets its own reminder once it is confirmed.
      reminderSentAt: null,
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

/**
 * Edits an upcoming meeting; fields left out stay as they are. Details are the
 * creator's to change, the link the admin's. Only a new link is worth an email
 * (MEETING_LINK_ADDED); other edits show in the activity feed.
 */
export async function editMeeting(
  projectId: string,
  meetingId: string,
  actor: MeetingActor,
  input: MeetingEditInput
): Promise<MeetingResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: {
      id: true,
      title: true,
      agenda: true,
      location: true,
      durationMinutes: true,
      milestoneId: true,
      status: true,
      startsAt: true,
      createdByRole: true,
      updatedAt: true,
    },
  });
  if (!meeting) return fail(404, 'notFound', 'Meeting not found.');
  if (meeting.status === 'cancelled') return fail(409, 'meetingCancelled', 'This meeting was cancelled.');
  if (isMeetingFinished(meeting.status) || meeting.startsAt.getTime() + meeting.durationMinutes * 60 * 1000 < Date.now()) {
    return meetingOver();
  }

  const differs = (key: 'title' | 'agenda' | 'location' | 'durationMinutes' | 'milestoneId') =>
    input[key] !== undefined && (input[key] as unknown) !== meeting[key];
  const detailsChanged =
    differs('title') || differs('agenda') || differs('durationMinutes') || differs('milestoneId');
  const linkChanged = differs('location');
  if (!detailsChanged && !linkChanged) return fail(400, 'invalidInput', 'Nothing changed.');
  if (linkChanged && actor.role !== 'admin') {
    return fail(403, 'forbidden', 'Only the project lead adds the meeting link.');
  }
  if (detailsChanged && actor.role !== meeting.createdByRole) {
    return fail(
      403,
      'meetingDetailsLocked',
      actor.role === 'admin'
        ? 'The client proposed this meeting, so only they can change its details. You can add the link.'
        : 'Only the project lead can change the details of this meeting.'
    );
  }

  if (input.milestoneId && input.milestoneId !== meeting.milestoneId) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: input.milestoneId, projectId },
      select: { id: true },
    });
    if (!milestone) return fail(400, 'invalidInput', 'That milestone is not part of this project.');
  }

  const event: MeetingEvent = linkChanged && input.location ? 'MEETING_LINK_ADDED' : 'MEETING_UPDATED';

  return prisma.$transaction(async (tx) => {
    // Only applies if nobody changed the meeting since it was read.
    const { count } = await tx.meeting.updateMany({
      where: { id: meeting.id, updatedAt: meeting.updatedAt },
      data: {
        title: input.title,
        agenda: input.agenda,
        location: input.location,
        durationMinutes: input.durationMinutes,
        milestoneId: input.milestoneId,
      },
    });
    if (count !== 1) return fail(409, 'meetingChanged', 'This meeting was just changed. Reload and try again.');

    const activity = await logActivity(
      {
        projectId,
        actorId: actor.id,
        type: event,
        meta: { meetingId: meeting.id, title: input.title ?? meeting.title },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true as const, meetingId: meeting.id, event, activityId: activity.id };
  });
}

/**
 * The admin records that a meeting did not take place: only once its start
 * time has passed, and only while no notes are published. Publishing notes
 * later still marks it held (it happened after all).
 */
export async function markMeetingNoShow(projectId: string, meetingId: string, actor: MeetingActor): Promise<MeetingResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: { id: true, title: true, status: true, startsAt: true, updatedAt: true },
  });
  if (!meeting) return fail(404, 'notFound', 'Meeting not found.');
  if (meeting.status === 'cancelled') return fail(409, 'meetingCancelled', 'This meeting was cancelled.');
  if (isMeetingFinished(meeting.status)) return meetingOver();
  if (meeting.startsAt.getTime() > Date.now()) {
    return fail(409, 'meetingNotStarted', 'This meeting has not started yet. Cancel it instead.');
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.meeting.updateMany({
      where: { id: meeting.id, updatedAt: meeting.updatedAt },
      data: { status: 'no_show', noShowAt: new Date() },
    });
    if (count !== 1) return fail(409, 'meetingChanged', 'This meeting was just changed. Reload and try again.');

    const activity = await logActivity(
      {
        projectId,
        actorId: actor.id,
        type: 'MEETING_NO_SHOW',
        meta: { meetingId: meeting.id, title: meeting.title },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true as const, meetingId: meeting.id, event: 'MEETING_NO_SHOW' as const, activityId: activity.id };
  });
}
