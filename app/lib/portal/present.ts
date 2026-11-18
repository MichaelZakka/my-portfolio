import { clientActivityParams } from './activity';
import { isMeetingFinished, isProjectStatus } from './constants';
import {
  dayKey,
  formatBytes,
  formatDate,
  formatDateParts,
  formatDateTime,
  formatDayLabel,
  formatTime,
} from './format';
import type { getPortalTranslations } from './locale';
import { sortMeetings, type ProjectMeeting } from './meetings';
import { displayName, type MessageRow, type getProjectActivity, type getProjectFiles } from './queries';

/**
 * Client-facing JSON shapes, shared by the portal page (initial render) and
 * the portal GET APIs (live updates). Labels are formatted here on the
 * server in the viewer's language, so the client never formats dates and
 * server and client markup always match. Internal fields (email delivery
 * bookkeeping, storage keys, other people's addresses) never leave the server.
 */

type PortalTranslator = Awaited<ReturnType<typeof getPortalTranslations>>['t'];

/**
 * Which API the links point at: the client portal's, or the admin's for the
 * "view as client" preview (the admin has no portal session).
 */
type LinkApi = 'portal' | 'admin';

/** viewerId is null in the admin preview of a project without clients. */
export function presentMessages(
  messages: MessageRow[],
  viewerId: string | null,
  { locale, timeZone, projectId, api = 'portal' }: { locale: string; timeZone: string; projectId: string; api?: LinkApi }
) {
  return messages.map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    timeLabel: formatDateTime(message.createdAt, locale, timeZone),
    time: formatTime(message.createdAt, locale, timeZone),
    dayKey: dayKey(message.createdAt, timeZone),
    dayLabel: formatDayLabel(message.createdAt, locale, timeZone),
    sender: {
      name: displayName(message.sender),
      isProjectLead: message.sender.role === 'admin',
      isYou: message.sender.id === viewerId,
    },
    attachments: message.attachments.map((file) => ({
      id: file.id,
      filename: file.filename,
      sizeLabel: formatBytes(file.fileSize, locale),
      downloadUrl: `/api/${api}/projects/${projectId}/files/${file.id}`,
    })),
  }));
}

export function presentFiles(
  files: Awaited<ReturnType<typeof getProjectFiles>>,
  projectId: string,
  { locale, api = 'portal' }: { locale: string; api?: LinkApi }
) {
  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdAt.toISOString(),
    sizeLabel: formatBytes(file.fileSize, locale),
    dateLabel: formatDate(file.createdAt, locale),
    uploadedBy: { name: displayName(file.uploadedBy), isProjectLead: file.uploadedBy.role === 'admin' },
    downloadUrl: `/api/${api}/projects/${projectId}/files/${file.id}`,
  }));
}

/** Placeholders each activity sentence needs; rows missing them (legacy data) use the fallback. */
const ACTIVITY_PARAMS: Record<string, string[]> = {
  INVITE_ACCEPTED: ['name'],
  MILESTONE_CREATED: ['title'],
  MILESTONE_COMPLETED: ['title'],
  MILESTONE_REVIEW_REQUESTED: ['title'],
  MILESTONE_APPROVED: ['name', 'title'],
  MILESTONE_CHANGES_REQUESTED: ['name', 'title'],
  MILESTONE_CHANGES_COMMENTED: ['name', 'title'],
  PROPOSAL_ACCEPTED: ['name'],
  TASK_CREATED: ['title'],
  TASK_COMPLETED: ['title'],
  TASK_COMMENTED: ['name', 'title'],
  MESSAGE_SENT: ['senderName'],
  FILE_UPLOADED: ['filename'],
  STATUS_CHANGED: ['to'],
  MEETING_PROPOSED: ['title'],
  MEETING_RESCHEDULED: ['title'],
  MEETING_CONFIRMED: ['title'],
  MEETING_CANCELLED: ['title'],
  MEETING_UPDATED: ['title'],
  MEETING_LINK_ADDED: ['title'],
  MEETING_NO_SHOW: ['title'],
  MEETING_NOTES_PUBLISHED: ['title'],
  MEETING_NOTES_UPDATED: ['title'],
  MEETING_NOTES_ACKNOWLEDGED: ['name', 'title'],
  MEETING_NOTES_COMMENTED: ['name', 'title'],
  MEETING_ACTION_ITEM_DONE: ['title'],
};

function describeActivity(type: string, params: Record<string, string>, t: PortalTranslator): string {
  const required = ACTIVITY_PARAMS[type] ?? [];
  if (!t.has(`activity.${type}`) || required.some((key) => !params[key])) return t('activity.fallback');
  const values = { ...params };
  if (values.to && isProjectStatus(values.to)) values.to = t(`status.${values.to}`);
  return t(`activity.${type}`, values);
}

export function presentActivity(
  activity: Awaited<ReturnType<typeof getProjectActivity>>,
  { locale, t, timeZone }: { locale: string; t: PortalTranslator; timeZone: string }
) {
  return activity.map((entry) => {
    const params = clientActivityParams(entry.meta);
    return {
      id: entry.id,
      type: entry.type,
      params,
      createdAt: entry.createdAt.toISOString(),
      timeLabel: formatDateTime(entry.createdAt, locale, timeZone),
      text: describeActivity(entry.type, params, t),
    };
  });
}

/** Only http(s) links become clickable; anything else is shown as plain text. */
function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Meetings as one side sees them (the admin screen uses viewerRole "admin" and English labels). */
export function presentMeetings(
  meetings: ProjectMeeting[],
  viewerRole: 'client' | 'admin',
  {
    locale,
    timeZone,
    projectId,
    api = viewerRole === 'admin' ? 'admin' : 'portal',
    otherZones = [],
  }: {
    locale: string;
    timeZone: string;
    projectId: string;
    api?: LinkApi;
    /** The admin screen also shows each client's local time when it differs from the admin's. */
    otherZones?: { name: string; timeZone: string }[];
  }
) {
  const now = new Date();
  const zones = otherZones.filter((zone) => zone.timeZone !== timeZone);
  const admin = viewerRole === 'admin';
  return sortMeetings(meetings, now).map((meeting) => {
    const ends = meeting.startsAt.getTime() + meeting.durationMinutes * 60 * 1000;
    const finished = isMeetingFinished(meeting.status);
    const past = ends < now.getTime() || finished;
    const open = meeting.status !== 'cancelled' && !past;
    const started = meeting.status !== 'cancelled' && meeting.startsAt.getTime() <= now.getTime();
    const published = meeting.outputPublishedAt !== null;
    const hasDraft = meeting.outputSummary !== '' || meeting.actionItems.length > 0;
    return {
      id: meeting.id,
      title: meeting.title,
      agenda: meeting.agenda,
      location: meeting.location,
      locationUrl: safeUrl(meeting.location),
      startsAt: meeting.startsAt.toISOString(),
      whenLabel: formatDateTime(meeting.startsAt, locale, timeZone),
      date: formatDateParts(meeting.startsAt, locale, timeZone),
      localTimes: zones.map((zone) => ({ name: zone.name, label: formatDateTime(meeting.startsAt, locale, zone.timeZone) })),
      // An .ics for the viewer's calendar, once the time is agreed.
      calendarUrl:
        meeting.status === 'confirmed' && !past ? `/api/${api}/projects/${projectId}/meetings/${meeting.id}/ics` : null,
      durationMinutes: meeting.durationMinutes,
      status: meeting.status,
      past,
      milestone: meeting.milestone,
      proposedBy: meeting.proposedBy ? displayName(meeting.proposedBy) : null,
      proposedByYou: meeting.proposedByRole === viewerRole,
      canAccept: open && meeting.status === 'proposed' && meeting.proposedByRole !== viewerRole,
      canChange: open,
      /** Topic, agenda, duration, milestone: the side that created the meeting edits them. */
      canEditDetails: open && meeting.createdByRole === viewerRole,
      /** The Google Meet link: always the admin's. */
      canEditLink: open && viewerRole === 'admin',
      createdByClient: meeting.createdByRole === 'client',
      /** Admin: notes can be written (or a draft continued) from the start time on, also after a no-show. */
      canWriteNotes: admin && started,
      /** Admin: it started, nothing was published, and it is not marked yet. */
      canMarkNoShow: admin && started && !finished,
      /** Admin: a confirmed meeting that is over and still has no published notes. */
      needsNotes: admin && meeting.status === 'confirmed' && ends < now.getTime(),
      // Clients only ever receive published notes; drafts never leave the server.
      notes: published || (admin && hasDraft) ? presentNotes(meeting, viewerRole, { locale, timeZone }) : null,
    };
  });
}

function presentNotes(
  meeting: ProjectMeeting,
  viewerRole: 'client' | 'admin',
  { locale, timeZone }: { locale: string; timeZone: string }
) {
  const published = meeting.outputPublishedAt !== null;
  const at = (date: Date) => formatDateTime(date, locale, timeZone);
  return {
    published,
    publishedLabel: meeting.outputPublishedAt ? at(meeting.outputPublishedAt) : null,
    savedLabel: meeting.outputSavedAt ? at(meeting.outputSavedAt) : null,
    /** The version a client confirms (outputSavedAt). */
    version: meeting.outputSavedAt?.toISOString() ?? null,
    summary: meeting.outputSummary,
    items: meeting.actionItems.map((item) => ({
      id: item.id,
      text: item.text,
      owner: item.owner === 'client' ? ('client' as const) : ('admin' as const),
      done: item.doneAt !== null,
      doneBy: item.doneAt && item.doneBy ? displayName(item.doneBy) : null,
      doneLabel: item.doneAt ? at(item.doneAt) : null,
      canToggle: published && (viewerRole === 'admin' || item.owner === 'client'),
    })),
    acknowledged: meeting.acknowledgedAt
      ? {
          by: meeting.acknowledgedBy ? displayName(meeting.acknowledgedBy) : null,
          label: at(meeting.acknowledgedAt),
        }
      : null,
    canAcknowledge: published && viewerRole === 'client' && meeting.acknowledgedAt === null,
    comments: meeting.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: comment.author ? displayName(comment.author) : null,
      fromLead: comment.authorRole === 'admin',
      createdAt: comment.createdAt.toISOString(),
      timeLabel: at(comment.createdAt),
    })),
  };
}

export type ClientMeeting = ReturnType<typeof presentMeetings>[number];
export type ClientMessage = ReturnType<typeof presentMessages>[number];
export type ClientFile = ReturnType<typeof presentFiles>[number];
export type ClientActivity = ReturnType<typeof presentActivity>[number];
