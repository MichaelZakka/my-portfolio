import { prisma } from '../db';
import { updateActivityMeta } from './activity';
import { buildMeetingIcs, icsContentType, type CalendarMeeting } from './calendar';
import type { EmailSendResult } from '../email';
import { reportDeliveryFailure } from '../monitoring';
import { getPortalTimeZone, resolveTimeZone } from './format';
import { countUnreadForAdmin, countUnreadForClient } from './messages';
import {
  adminNotifyAddress,
  combineResults,
  portalUrl,
  sendClientJoinedEmail,
  sendMeetingEmail,
  type MeetingEmailEvent,
  sendNewMessageEmail,
  sendReviewRequestEmail,
  sendReviewResponseEmail,
  sendStatusChangedEmail,
} from './email';

/**
 * "Tell the other party" notifications. These run after the response is sent
 * (via next/server `after`), then record the outcome like Lead.emailSent.
 * Every client member gets their own email, in their own language, so
 * addresses are never exposed to each other.
 */

async function clientRecipients(projectId: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId, user: { role: 'client' } },
    select: { user: { select: { email: true, name: true, locale: true, timeZone: true } } },
  });
  return members.map(({ user }) => ({ ...user, timeZone: resolveTimeZone(user.timeZone) }));
}

/** An email about the conversation that is still unread covers newer messages for this long. */
const RENOTIFY_AFTER_MS = 24 * 60 * 60 * 1000;

/** True while the recipient's last message email is unread and recent, so a new message rides along with it. */
function stillNotified(lastNotifiedAt: Date | null, lastReadAt: Date | null, now: Date): boolean {
  if (!lastNotifiedAt) return false;
  if (lastReadAt && lastReadAt.getTime() >= lastNotifiedAt.getTime()) return false;
  return now.getTime() - lastNotifiedAt.getTime() < RENOTIFY_AFTER_MS;
}

/**
 * One email per unread batch, not per message: a recipient who has not read
 * the conversation since their last message email gets no new one (for a
 * day). When an email does go out it says how many messages are unread and
 * quotes the newest. Each send is claimed first (lastNotifiedAt), so two
 * messages arriving together cannot both email, and a failed send releases
 * the claim so the next message tries again.
 */
export async function notifyAboutMessage(input: {
  messageId: string;
  projectId: string;
  projectName: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  content: string;
  attachments: number;
}) {
  const now = new Date();
  const results: { to: string; result: EmailSendResult }[] = [];
  let batched = 0;
  let recipients = 0;
  const email = {
    projectName: input.projectName,
    senderName: input.senderName,
    content: input.content,
    attachments: input.attachments,
  };

  if (input.senderRole === 'client') {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { adminLastReadAt: true, adminLastNotifiedAt: true },
    });
    if (project) {
      recipients = 1;
      const previous = project.adminLastNotifiedAt;
      const claimed =
        !stillNotified(previous, project.adminLastReadAt, now) &&
        (await prisma.project.updateMany({
          where: { id: input.projectId, adminLastNotifiedAt: previous },
          data: { adminLastNotifiedAt: now },
        })).count === 1;
      if (!claimed) {
        batched++;
      } else {
        const to = adminNotifyAddress();
        const result = await sendNewMessageEmail({
          ...email,
          to,
          locale: 'en',
          count: Math.max(1, await countUnreadForAdmin(input.projectId, project.adminLastReadAt)),
          url: portalUrl(`/admin/projects/${input.projectId}?tab=messages`),
          replyTo: input.senderEmail,
        });
        if (!result.sent) {
          await prisma.project.updateMany({
            where: { id: input.projectId, adminLastNotifiedAt: now },
            data: { adminLastNotifiedAt: previous },
          });
        }
        results.push({ to, result });
      }
    }
  } else {
    const members = await prisma.projectMember.findMany({
      where: { projectId: input.projectId, user: { role: 'client' } },
      select: {
        id: true,
        lastReadAt: true,
        lastNotifiedAt: true,
        user: { select: { id: true, email: true, locale: true } },
      },
    });
    recipients = members.length;
    await Promise.all(
      members.map(async (member) => {
        const previous = member.lastNotifiedAt;
        const claimed =
          !stillNotified(previous, member.lastReadAt, now) &&
          (await prisma.projectMember.updateMany({
            where: { id: member.id, lastNotifiedAt: previous },
            data: { lastNotifiedAt: now },
          })).count === 1;
        if (!claimed) {
          batched++;
          return;
        }
        const result = await sendNewMessageEmail({
          ...email,
          to: member.user.email,
          locale: member.user.locale,
          count: Math.max(1, await countUnreadForClient(input.projectId, member.user.id, member.lastReadAt)),
          url: portalUrl(`/portal/projects/${input.projectId}?tab=messages`),
        });
        if (!result.sent) {
          await prisma.projectMember.updateMany({
            where: { id: member.id, lastNotifiedAt: now },
            data: { lastNotifiedAt: previous },
          });
        }
        results.push({ to: member.user.email, result });
      })
    );
  }

  const outcome = results.length ? combineResults(results) : null;
  await prisma.message.update({
    where: { id: input.messageId },
    data: outcome
      ? { emailSent: outcome.sent, emailError: outcome.error ?? null, emailBatched: false }
      : recipients > 0
        ? { emailSent: false, emailError: null, emailBatched: batched > 0 }
        : { emailSent: false, emailError: 'No client has access to this project yet.', emailBatched: false },
  });
  if (outcome && !outcome.sent) await reportDeliveryFailure('Message notification not sent', outcome.error);
}

export async function notifyAboutStatusChange(input: {
  activityId: string;
  projectId: string;
  projectName: string;
  fromStatus: string;
  toStatus: string;
  phase: string;
}) {
  const recipients = await clientRecipients(input.projectId);
  const results = await Promise.all(
    recipients.map(async (user) => ({
      to: user.email,
      result: await sendStatusChangedEmail({
        to: user.email,
        locale: user.locale,
        projectName: input.projectName,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        phase: input.phase,
        url: portalUrl(`/portal/projects/${input.projectId}`),
      }),
    }))
  );
  const outcome = recipients.length
    ? combineResults(results)
    : { sent: false, error: 'No client has access to this project yet.' };

  await updateActivityMeta(input.activityId, {
    emailSent: outcome.sent,
    emailError: outcome.error ?? null,
  });
  if (!outcome.sent) await reportDeliveryFailure('Status notification not sent', outcome.error);
}

export async function notifyAboutClientJoined(input: {
  activityId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
}) {
  const result = await sendClientJoinedEmail({
    to: adminNotifyAddress(),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    url: portalUrl(`/admin/projects/${input.projectId}`),
  });

  await updateActivityMeta(input.activityId, { emailSent: result.sent, emailError: result.error ?? null });
  if (!result.sent) await reportDeliveryFailure('Client-joined notification not sent', result.error);
}

const MEETING_EMAIL_EVENTS = {
  MEETING_PROPOSED: 'proposed',
  MEETING_RESCHEDULED: 'rescheduled',
  MEETING_CONFIRMED: 'confirmed',
  MEETING_CANCELLED: 'cancelled',
} as const satisfies Record<string, MeetingEmailEvent>;

/** Tells the other side about a meeting change: the admin when a client acted, every client when the admin did. */
export async function notifyAboutMeeting(input: {
  activityId: string;
  meetingId: string;
  event: keyof typeof MEETING_EMAIL_EVENTS;
  projectId: string;
  projectName: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
}) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: input.meetingId },
    select: {
      id: true,
      title: true,
      agenda: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      status: true,
      updatedAt: true,
      milestone: { select: { title: true } },
    },
  });
  if (!meeting) return;

  const event = MEETING_EMAIL_EVENTS[input.event];
  const email = {
    event,
    actorName: input.actorName,
    projectName: input.projectName,
    meeting: { ...meeting, milestoneTitle: meeting.milestone?.title ?? null },
  };
  // Agreed and cancelled meetings carry an .ics, so the calendar entry appears (or goes away) in one click.
  const calendar = (url: string) =>
    event === 'confirmed' || event === 'cancelled' ? meetingCalendar(meeting, input.projectName, url) : undefined;

  let outcome;
  if (input.actorRole === 'client') {
    const to = adminNotifyAddress();
    const url = portalUrl(`/admin/projects/${input.projectId}?tab=meetings`);
    const result = await sendMeetingEmail({
      ...email,
      to,
      locale: 'en',
      timeZone: getPortalTimeZone(),
      url,
      replyTo: input.actorEmail,
      calendar: calendar(url),
    });
    outcome = combineResults([{ to, result }]);
  } else {
    const recipients = await clientRecipients(input.projectId);
    const url = portalUrl(`/portal/projects/${input.projectId}?tab=meetings`);
    const results = await Promise.all(
      recipients.map(async (user) => ({
        to: user.email,
        result: await sendMeetingEmail({
          ...email,
          to: user.email,
          locale: user.locale,
          timeZone: user.timeZone,
          url,
          calendar: calendar(url),
        }),
      }))
    );
    outcome = recipients.length
      ? combineResults(results)
      : { sent: false, error: 'No client has access to this project yet.' };
  }

  await updateActivityMeta(input.activityId, { emailSent: outcome.sent, emailError: outcome.error ?? null });
  if (!outcome.sent) await reportDeliveryFailure('Meeting notification not sent', outcome.error);
}

/** Asks every client member, in their own language, to approve a milestone; records the outcome on the round. */
export async function notifyAboutReviewRequest(input: {
  reviewId: string;
  projectId: string;
  projectName: string;
  milestoneId: string;
  milestoneTitle: string;
  note: string;
  link: string;
}) {
  const recipients = await clientRecipients(input.projectId);
  const url = portalUrl(`/portal/projects/${input.projectId}?tab=milestones#milestone-${input.milestoneId}`);
  const results = await Promise.all(
    recipients.map(async (user) => ({
      to: user.email,
      result: await sendReviewRequestEmail({
        to: user.email,
        locale: user.locale,
        projectName: input.projectName,
        milestoneTitle: input.milestoneTitle,
        note: input.note,
        link: input.link,
        url,
      }),
    }))
  );
  const outcome = recipients.length
    ? combineResults(results)
    : { sent: false, error: 'No client has access to this project yet.' };

  await prisma.milestoneReview.update({
    where: { id: input.reviewId },
    data: { emailSent: outcome.sent, emailError: outcome.error ?? null },
  });
  if (!outcome.sent) await reportDeliveryFailure('Approval request not sent', outcome.error);
}

/** Tells the admin that a client approved a milestone or asked for changes. */
export async function notifyAboutReviewResponse(input: {
  kind: 'approved' | 'changes';
  projectId: string;
  projectName: string;
  milestoneTitle: string;
  clientName: string;
  clientEmail: string;
  comment: string;
}) {
  const result = await sendReviewResponseEmail({
    to: adminNotifyAddress(),
    url: portalUrl(`/admin/projects/${input.projectId}?tab=milestones`),
    ...input,
  });
  if (!result.sent) await reportDeliveryFailure('Approval response email not sent', result.error);
}

function meetingCalendar(meeting: CalendarMeeting, projectName: string, url: string) {
  return { content: buildMeetingIcs({ meeting, projectName, url }), contentType: icsContentType(meeting) };
}

const HOUR_MS = 60 * 60 * 1000;
/** Confirmed meetings starting within this window get their reminder (a daily run covers every day). */
export const REMINDER_WINDOW_MS = 36 * HOUR_MS;
/** A meeting confirmed this recently already has a fresh confirmation email. */
const RECENTLY_CONFIRMED_MS = 6 * HOUR_MS;

/**
 * The day-before reminder, run by the scheduled /api/cron/meeting-reminders.
 * Each meeting is claimed (reminderSentAt) before anything is sent, so
 * overlapping runs never remind twice; rescheduling clears the stamp.
 */
export async function sendMeetingReminders(now = new Date()) {
  const due = await prisma.meeting.findMany({
    where: {
      status: 'confirmed',
      reminderSentAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
      confirmedAt: { lte: new Date(now.getTime() - RECENTLY_CONFIRMED_MS) },
      project: { archivedAt: null },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      project: { select: { name: true } },
      milestone: { select: { title: true } },
    },
  });

  let reminded = 0;
  for (const meeting of due) {
    const { count } = await prisma.meeting.updateMany({
      where: { id: meeting.id, reminderSentAt: null, status: 'confirmed' },
      data: { reminderSentAt: now },
    });
    if (count !== 1) continue;
    reminded++;

    const email = {
      event: 'reminder' as const,
      actorName: '',
      projectName: meeting.project.name,
      meeting: { ...meeting, milestoneTitle: meeting.milestone?.title ?? null },
    };
    const recipients = await clientRecipients(meeting.projectId);
    const results = await Promise.all([
      ...recipients.map(async (user) => ({
        to: user.email,
        result: await sendMeetingEmail({
          ...email,
          to: user.email,
          locale: user.locale,
          timeZone: user.timeZone,
          url: portalUrl(`/portal/projects/${meeting.projectId}?tab=meetings`),
        }),
      })),
      (async () => {
        const to = adminNotifyAddress();
        return {
          to,
          result: await sendMeetingEmail({
            ...email,
            to,
            locale: 'en',
            timeZone: getPortalTimeZone(),
            url: portalUrl(`/admin/projects/${meeting.projectId}?tab=meetings`),
          }),
        };
      })(),
    ]);
    const outcome = combineResults(results);
    if (!outcome.sent) await reportDeliveryFailure('Meeting reminder not fully sent', outcome.error);
  }
  return { due: due.length, reminded };
}
