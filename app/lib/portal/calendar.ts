import { prisma } from '../db';
import { SITE_NAME } from '../seo';
import { getSiteUrl } from '../site';
import { notFound } from './http';

/**
 * iCalendar (RFC 5545) files for meetings: the "Add to calendar" download and
 * the attachment on confirmation and cancellation emails. Times are written in
 * UTC, so every calendar app shows them in its owner's own time zone. The UID
 * is stable per meeting and SEQUENCE grows with every change, so importing a
 * newer file updates (or, for a cancellation, removes) the same event. Two
 * alarms, a day and an hour before, are the built-in reminders.
 */

export type CalendarMeeting = {
  id: string;
  title: string;
  agenda: string;
  location: string;
  startsAt: Date;
  durationMinutes: number;
  status: string;
  updatedAt: Date;
};

/** 20261103T140000Z */
const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** TEXT values escape backslashes, separators and newlines. */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Lines longer than 75 octets are folded (CRLF + space), never inside a UTF-8 character (Arabic titles). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const length = encoder.encode(char).length;
    // Continuation lines start with the folding space, so they carry one octet less.
    if (size + length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += length;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildMeetingIcs(input: { meeting: CalendarMeeting; projectName: string; url: string }): string {
  const { meeting } = input;
  const cancelled = meeting.status === 'cancelled';
  const ends = new Date(meeting.startsAt.getTime() + meeting.durationMinutes * 60 * 1000);
  const summary = `${meeting.title} · ${input.projectName}`;
  const description = [meeting.agenda, input.url].filter(Boolean).join('\n\n');
  const alarm = (trigger: string) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
  ];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${SITE_NAME}//Client portal//EN`,
    'CALSCALE:GREGORIAN',
    `METHOD:${cancelled ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:meeting-${meeting.id}@${new URL(getSiteUrl()).host}`,
    `SEQUENCE:${Math.floor(meeting.updatedAt.getTime() / 1000)}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(meeting.startsAt)}`,
    `DTEND:${icsDate(ends)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(meeting.location ? [`LOCATION:${escapeText(meeting.location)}`] : []),
    `URL:${input.url}`,
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    ...(cancelled ? [] : [...alarm('-P1D'), ...alarm('-PT1H')]),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Content type for email attachments; the method parameter lets mail apps offer "Add to calendar". */
export const icsContentType = (meeting: { status: string }) =>
  `text/calendar; charset=utf-8; method=${meeting.status === 'cancelled' ? 'CANCEL' : 'PUBLISH'}`;

const calendarSelect = {
  id: true,
  title: true,
  agenda: true,
  location: true,
  startsAt: true,
  durationMinutes: true,
  status: true,
  updatedAt: true,
} as const;

export function getCalendarMeeting(projectId: string, meetingId: string) {
  return prisma.meeting.findFirst({ where: { id: meetingId, projectId }, select: calendarSelect });
}

/** The download for the authorized portal and admin routes; `url` is where the viewer opens the meeting. */
export async function meetingIcsResponse(input: {
  projectId: string;
  projectName: string;
  meetingId: string;
  url: string;
}): Promise<Response> {
  const meeting = await getCalendarMeeting(input.projectId, input.meetingId);
  if (!meeting) return notFound('Meeting not found.');
  return new Response(buildMeetingIcs({ meeting, projectName: input.projectName, url: input.url }), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meeting.ics"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
