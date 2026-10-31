/**
 * Allowed values for the portal's String "enum" columns (kept as plain strings
 * in Prisma so the schema works on SQLite and Postgres). Client-safe: no
 * server imports here. UI labels live in messages/<locale>.json under
 * `portal.*` for the client portal; the admin dashboard uses the English
 * labels below.
 */

export const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'on_hold', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  in_progress: 'In progress',
  review: 'In review',
  on_hold: 'On hold',
  completed: 'Completed',
};

export const WORK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const ACTIVITY_TYPES = [
  'PROJECT_CREATED',
  'CLIENT_INVITED',
  'INVITE_ACCEPTED',
  'MILESTONE_CREATED',
  'MILESTONE_COMPLETED',
  'TASK_CREATED',
  'TASK_COMPLETED',
  'MESSAGE_SENT',
  'FILE_UPLOADED',
  'STATUS_CHANGED',
  'MEETING_PROPOSED',
  'MEETING_RESCHEDULED',
  'MEETING_CONFIRMED',
  'MEETING_CANCELLED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MEETING_STATUSES = ['proposed', 'confirmed', 'cancelled'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  proposed: 'Awaiting reply',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export const MEETING_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export const USER_ROLES = ['client', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PORTAL_LOCALES = ['en', 'ar'] as const;
export type PortalLocale = (typeof PORTAL_LOCALES)[number];

export const INVITATION_TTL_DAYS = 7;
export const PASSWORD_RESET_TTL_MINUTES = 60;

/** bcrypt only reads the first 72 bytes of a password, so longer ones are rejected. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export const MESSAGE_MAX_LENGTH = 5000;

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === 'string' && (WORK_STATUSES as readonly string[]).includes(value);
}

export function isPortalLocale(value: unknown): value is PortalLocale {
  return typeof value === 'string' && (PORTAL_LOCALES as readonly string[]).includes(value);
}

export type InvitationState = 'pending' | 'accepted' | 'revoked' | 'expired';

export function invitationState(
  invitation: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date()
): InvitationState {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.revokedAt) return 'revoked';
  if (invitation.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'pending';
}

/** Share of milestones marked done, 0–100. */
export function progressPercent(milestones: { status: string }[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === 'done').length;
  return Math.round((done / milestones.length) * 100);
}
