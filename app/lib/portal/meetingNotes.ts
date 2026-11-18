import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logActivity } from './activity';
import { fail, type Failure, type MeetingActor, type MeetingEvent } from './meetings';
import type { MeetingFollowUpInput, MeetingNotesInput } from './validation';

/**
 * Meeting notes: what came out of a meeting, and what happens next.
 *
 * - Once a meeting has started, the admin writes a summary and action items
 *   (each for the admin or the client). They stay a private draft until
 *   published; publishing marks the meeting "held" and emails the clients.
 * - Published notes can still be edited; an edit that changes them clears
 *   the client's confirmation, since it no longer covers what is written.
 * - Under published notes a client confirms them ("looks right"), both sides
 *   comment, and items are ticked off: by the admin, or by a client when the
 *   item is theirs.
 *
 * Every change also bumps Meeting.updatedAt, which the open screens poll.
 */

export type NotesResult =
  | { ok: true; meetingId: string; event: MeetingEvent | null; activityId: string | null; commentId?: string }
  | Failure;

const changedMeanwhile = () => fail(409, 'meetingChanged', 'This meeting was just changed. Reload and try again.');
const nothingNew = (meetingId: string): NotesResult => ({ ok: true, meetingId, event: null, activityId: null });

/** Saves the admin's notes: a draft, the first publish, or an edit of published notes. */
export async function saveMeetingNotes(
  projectId: string,
  meetingId: string,
  actor: MeetingActor,
  input: MeetingNotesInput
): Promise<NotesResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      updatedAt: true,
      outputSummary: true,
      outputPublishedAt: true,
      actionItems: { orderBy: { position: 'asc' }, select: { id: true, text: true, owner: true, position: true } },
    },
  });
  if (!meeting) return fail(404, 'notFound', 'Meeting not found.');
  if (meeting.status === 'cancelled') return fail(409, 'meetingCancelled', 'This meeting was cancelled.');
  if (meeting.startsAt.getTime() > Date.now()) {
    return fail(409, 'meetingNotStarted', 'Notes can be written once the meeting has started.');
  }

  const keptIds = input.actionItems.flatMap((item) => (item.id ? [item.id] : []));
  if (new Set(keptIds).size !== keptIds.length) return fail(400, 'invalidInput', 'An action item is listed twice.');
  const existing = new Map(meeting.actionItems.map((item) => [item.id, item]));
  // An id we no longer have: another save removed it while this form was open.
  if (keptIds.some((id) => !existing.has(id))) return changedMeanwhile();

  const published = meeting.outputPublishedAt !== null;
  const publishing = !published && input.publish;
  if ((published || publishing) && !input.summary) {
    return fail(400, 'invalidInput', 'Write a summary before sharing the notes.');
  }

  const changed =
    input.summary !== meeting.outputSummary ||
    input.actionItems.length !== meeting.actionItems.length ||
    input.actionItems.some((item, index) => {
      const before = meeting.actionItems[index];
      return !before || item.id !== before.id || item.text !== before.text || item.owner !== before.owner;
    });
  if (published && !changed) return nothingNew(meeting.id);

  const now = new Date();
  const event: MeetingEvent | null = publishing
    ? 'MEETING_NOTES_PUBLISHED'
    : published
      ? 'MEETING_NOTES_UPDATED'
      : null;

  return prisma.$transaction(async (tx) => {
    // Only applies if nobody changed the meeting since it was read.
    const { count } = await tx.meeting.updateMany({
      where: { id: meeting.id, updatedAt: meeting.updatedAt },
      data: {
        outputSummary: input.summary,
        outputSavedAt: now,
        ...(publishing ? { outputPublishedAt: now, status: 'held', noShowAt: null } : {}),
        // The client confirmed what was written before; changed notes need confirming again.
        ...(published ? { acknowledgedAt: null, acknowledgedById: null } : {}),
      },
    });
    if (count !== 1) return changedMeanwhile();

    await tx.meetingActionItem.deleteMany({ where: { meetingId: meeting.id, id: { notIn: keptIds } } });
    for (const [position, item] of input.actionItems.entries()) {
      const before = item.id ? existing.get(item.id) : undefined;
      if (!before) {
        await tx.meetingActionItem.create({
          data: { meetingId: meeting.id, text: item.text, owner: item.owner, position },
        });
      } else if (before.text !== item.text || before.owner !== item.owner || before.position !== position) {
        // Ticks are kept: rewording an item does not reopen it.
        await tx.meetingActionItem.update({
          where: { id: before.id },
          data: { text: item.text, owner: item.owner, position },
        });
      }
    }

    if (!event) return nothingNew(meeting.id);
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

/** Lets the open screens (which poll Meeting.updatedAt) see a new comment or tick. */
const touch = (tx: Prisma.TransactionClient, meetingId: string, now: Date) =>
  tx.meeting.update({ where: { id: meetingId }, data: { updatedAt: now }, select: { id: true } });

/** Confirming, commenting and ticking items, under published notes. */
export async function followUpMeetingNotes(
  projectId: string,
  meetingId: string,
  actor: MeetingActor & { name: string },
  input: MeetingFollowUpInput
): Promise<NotesResult> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: { id: true, title: true, outputPublishedAt: true, acknowledgedAt: true },
  });
  if (!meeting) return fail(404, 'notFound', 'Meeting not found.');
  if (!meeting.outputPublishedAt) {
    // Clients never see draft notes, so for them there is nothing here.
    return actor.role === 'admin'
      ? fail(409, 'meetingNotesDraft', 'Publish the notes first.')
      : fail(404, 'notFound', 'Meeting not found.');
  }
  const now = new Date();
  const meta = { meetingId: meeting.id, title: meeting.title };

  if (input.action === 'acknowledge') {
    if (actor.role !== 'client') return fail(403, 'forbidden', 'Only a client confirms the notes.');
    if (meeting.acknowledgedAt) return nothingNew(meeting.id);
    return prisma.$transaction(async (tx) => {
      // Only the version the client read: notes edited since then need reading again.
      const { count } = await tx.meeting.updateMany({
        where: { id: meeting.id, acknowledgedAt: null, outputSavedAt: new Date(input.version) },
        data: { acknowledgedAt: now, acknowledgedById: actor.id },
      });
      if (count !== 1) return fail(409, 'meetingNotesChanged', 'These notes were just changed. Read them again.');
      const activity = await logActivity(
        {
          projectId,
          actorId: actor.id,
          type: 'MEETING_NOTES_ACKNOWLEDGED',
          meta: { ...meta, name: actor.name },
          visibleToClient: true,
        },
        tx
      );
      return { ok: true as const, meetingId: meeting.id, event: 'MEETING_NOTES_ACKNOWLEDGED' as const, activityId: activity.id };
    });
  }

  if (input.action === 'comment') {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.meetingComment.create({
        data: { meetingId: meeting.id, authorId: actor.id, authorRole: actor.role, body: input.body },
        select: { id: true },
      });
      await touch(tx, meeting.id, now);
      const activity = await logActivity(
        {
          projectId,
          actorId: actor.id,
          type: 'MEETING_NOTES_COMMENTED',
          meta: { ...meta, name: actor.name, commentId: comment.id },
          visibleToClient: true,
        },
        tx
      );
      return {
        ok: true as const,
        meetingId: meeting.id,
        event: 'MEETING_NOTES_COMMENTED' as const,
        activityId: activity.id,
        commentId: comment.id,
      };
    });
  }

  const item = await prisma.meetingActionItem.findFirst({
    where: { id: input.itemId, meetingId: meeting.id },
    select: { id: true, text: true, owner: true },
  });
  if (!item) return fail(404, 'notFound', 'Action item not found.');
  if (actor.role === 'client' && item.owner !== 'client') {
    return fail(403, 'forbidden', 'Only the project lead ticks off this item.');
  }
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.meetingActionItem.updateMany({
      where: { id: item.id, doneAt: input.done ? null : { not: null } },
      data: input.done ? { doneAt: now, doneById: actor.id } : { doneAt: null, doneById: null },
    });
    // Already in that state (someone else just ticked it).
    if (count !== 1) return nothingNew(meeting.id);
    await touch(tx, meeting.id, now);
    // Reopening an item is not news; finishing one is.
    if (!input.done) return nothingNew(meeting.id);
    const activity = await logActivity(
      {
        projectId,
        actorId: actor.id,
        type: 'MEETING_ACTION_ITEM_DONE',
        meta: { meetingId: meeting.id, itemId: item.id, title: item.text.slice(0, 200) },
        visibleToClient: true,
      },
      tx
    );
    return { ok: true as const, meetingId: meeting.id, event: 'MEETING_ACTION_ITEM_DONE' as const, activityId: activity.id };
  });
}
