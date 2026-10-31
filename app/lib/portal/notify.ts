import { prisma } from '../db';
import { updateActivityMeta } from './activity';
import {
  adminNotifyAddress,
  combineResults,
  portalUrl,
  sendClientJoinedEmail,
  sendMeetingEmail,
  type MeetingEmailEvent,
  sendNewMessageEmail,
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
    select: { user: { select: { email: true, locale: true } } },
  });
  return members.map((m) => m.user);
}

export async function notifyAboutMessage(input: {
  messageId: string;
  projectId: string;
  projectName: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  content: string;
}) {
  let outcome;
  if (input.senderRole === 'client') {
    const to = adminNotifyAddress();
    const result = await sendNewMessageEmail({
      to,
      locale: 'en',
      projectName: input.projectName,
      senderName: input.senderName,
      content: input.content,
      url: portalUrl(`/admin/projects/${input.projectId}`),
      replyTo: input.senderEmail,
    });
    outcome = combineResults([{ to, result }]);
  } else {
    const recipients = await clientRecipients(input.projectId);
    const results = await Promise.all(
      recipients.map(async (user) => ({
        to: user.email,
        result: await sendNewMessageEmail({
          to: user.email,
          locale: user.locale,
          projectName: input.projectName,
          senderName: input.senderName,
          content: input.content,
          url: portalUrl(`/portal/projects/${input.projectId}`),
        }),
      }))
    );
    outcome = recipients.length
      ? combineResults(results)
      : { sent: false, error: 'No client has access to this project yet.' };
  }

  await prisma.message.update({
    where: { id: input.messageId },
    data: { emailSent: outcome.sent, emailError: outcome.error ?? null },
  });
  if (!outcome.sent) console.error('[portal] Message notification not sent:', outcome.error);
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
  if (!outcome.sent) console.error('[portal] Status notification not sent:', outcome.error);
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
  if (!result.sent) console.error('[portal] Client-joined notification not sent:', result.error);
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
      title: true,
      startsAt: true,
      durationMinutes: true,
      location: true,
      milestone: { select: { title: true } },
    },
  });
  if (!meeting) return;

  const email = {
    event: MEETING_EMAIL_EVENTS[input.event],
    actorName: input.actorName,
    projectName: input.projectName,
    meeting: { ...meeting, milestoneTitle: meeting.milestone?.title ?? null },
  };

  let outcome;
  if (input.actorRole === 'client') {
    const to = adminNotifyAddress();
    const result = await sendMeetingEmail({
      ...email,
      to,
      locale: 'en',
      url: portalUrl(`/admin/projects/${input.projectId}#meetings`),
      replyTo: input.actorEmail,
    });
    outcome = combineResults([{ to, result }]);
  } else {
    const recipients = await clientRecipients(input.projectId);
    const results = await Promise.all(
      recipients.map(async (user) => ({
        to: user.email,
        result: await sendMeetingEmail({
          ...email,
          to: user.email,
          locale: user.locale,
          url: portalUrl(`/portal/projects/${input.projectId}#meetings`),
        }),
      }))
    );
    outcome = recipients.length
      ? combineResults(results)
      : { sent: false, error: 'No client has access to this project yet.' };
  }

  await updateActivityMeta(input.activityId, { emailSent: outcome.sent, emailError: outcome.error ?? null });
  if (!outcome.sent) console.error('[portal] Meeting notification not sent:', outcome.error);
}
