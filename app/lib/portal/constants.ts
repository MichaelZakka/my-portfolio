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

/**
 * What the admin may set on a milestone. "done" is not among them: a milestone
 * is done only when the client approves it (reviews.ts). The admin can still
 * move a done milestone back (e.g. it needs rework).
 */
export const MILESTONE_ADMIN_STATUSES = ['todo', 'in_progress'] as const;
export type MilestoneAdminStatus = (typeof MILESTONE_ADMIN_STATUSES)[number];

/**
 * The phase a project is in: the first milestone (in order) that isn't done,
 * or the last one once all are. Projects without milestones fall back to the
 * phase typed in by hand (Project.currentPhase). `milestones` must be in
 * display order.
 */
export function currentPhaseOf(milestones: { title: string; status: string }[], manualPhase: string): string {
  if (milestones.length === 0) return manualPhase;
  return (milestones.find((m) => m.status !== 'done') ?? milestones[milestones.length - 1]).title;
}

export const ACTIVITY_TYPES = [
  'PROJECT_CREATED',
  'CLIENT_INVITED',
  'INVITE_ACCEPTED',
  'MILESTONE_CREATED',
  'MILESTONE_COMPLETED',
  'MILESTONE_REVIEW_REQUESTED',
  'MILESTONE_APPROVED',
  'MILESTONE_CHANGES_REQUESTED',
  'MILESTONE_CHANGES_COMMENTED',
  'TASK_CREATED',
  'TASK_COMPLETED',
  'TASK_COMMENTED',
  'MESSAGE_SENT',
  'FILE_UPLOADED',
  'STATUS_CHANGED',
  'MEETING_PROPOSED',
  'MEETING_RESCHEDULED',
  'MEETING_CONFIRMED',
  'MEETING_CANCELLED',
  'MEETING_UPDATED',
  'MEETING_LINK_ADDED',
  'MEETING_NO_SHOW',
  'MEETING_NOTES_PUBLISHED',
  'MEETING_NOTES_UPDATED',
  'MEETING_NOTES_ACKNOWLEDGED',
  'MEETING_NOTES_COMMENTED',
  'MEETING_ACTION_ITEM_DONE',
  'PROPOSAL_ACCEPTED',
  'PROJECT_COMPLETION_CONFIRMED',
  'PROJECT_COMPLETION_NOT_YET',
  // The survey answers are private: this entry is internal (visibleToClient false).
  'CLIENT_REVIEW_SUBMITTED',
  // Audit trail: admin-side changes, always internal (visibleToClient false)
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'PROJECT_RESTORED',
  'MILESTONE_DELETED',
  'MILESTONE_REVIEW_WITHDRAWN',
  'TASK_DELETED',
  'TASK_VISIBILITY_CHANGED',
  'FILE_DELETED',
  'FILE_VISIBILITY_CHANGED',
  'MEMBER_REMOVED',
  'INVITE_REVOKED',
  'INVITE_RESENT',
  'SESSIONS_REVOKED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** held / no_show come after the meeting: notes published, or marked as not having taken place. */
export const MEETING_STATUSES = ['proposed', 'confirmed', 'cancelled', 'held', 'no_show'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  proposed: 'Awaiting reply',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  held: 'Held',
  no_show: 'Did not take place',
};

/** Meetings that are over by status, whatever their time says. */
export const isMeetingFinished = (status: string) => status === 'held' || status === 'no_show';

/** Who an action item from a meeting is for. */
export const ACTION_ITEM_OWNERS = ['admin', 'client'] as const;
export type ActionItemOwner = (typeof ACTION_ITEM_OWNERS)[number];

export const MEETING_NOTES_MAX_LENGTH = 10_000;
export const MEETING_ACTION_ITEMS_MAX = 30;
export const MEETING_COMMENT_MAX_LENGTH = 3000;

export const MEETING_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

/**
 * Activity types grouped into colour-coded categories (the activity feeds
 * colour each entry and show a legend). Colours live in the CSS modules
 * under [data-category].
 */
export const ACTIVITY_CATEGORIES = ['project', 'clients', 'progress', 'meetings', 'messages', 'files'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

const ACTIVITY_CATEGORY_OF: Record<ActivityType, ActivityCategory> = {
  PROJECT_CREATED: 'project',
  PROPOSAL_ACCEPTED: 'project',
  PROJECT_UPDATED: 'project',
  PROJECT_ARCHIVED: 'project',
  PROJECT_RESTORED: 'project',
  PROJECT_COMPLETION_CONFIRMED: 'project',
  PROJECT_COMPLETION_NOT_YET: 'project',
  CLIENT_REVIEW_SUBMITTED: 'project',
  MILESTONE_DELETED: 'progress',
  MILESTONE_REVIEW_WITHDRAWN: 'progress',
  TASK_DELETED: 'progress',
  TASK_VISIBILITY_CHANGED: 'progress',
  FILE_DELETED: 'files',
  FILE_VISIBILITY_CHANGED: 'files',
  MEMBER_REMOVED: 'clients',
  INVITE_REVOKED: 'clients',
  INVITE_RESENT: 'clients',
  SESSIONS_REVOKED: 'clients',
  STATUS_CHANGED: 'project',
  CLIENT_INVITED: 'clients',
  INVITE_ACCEPTED: 'clients',
  MILESTONE_CREATED: 'progress',
  MILESTONE_COMPLETED: 'progress',
  MILESTONE_REVIEW_REQUESTED: 'progress',
  MILESTONE_APPROVED: 'progress',
  MILESTONE_CHANGES_REQUESTED: 'progress',
  MILESTONE_CHANGES_COMMENTED: 'progress',
  TASK_CREATED: 'progress',
  TASK_COMPLETED: 'progress',
  TASK_COMMENTED: 'progress',
  MEETING_PROPOSED: 'meetings',
  MEETING_RESCHEDULED: 'meetings',
  MEETING_CONFIRMED: 'meetings',
  MEETING_CANCELLED: 'meetings',
  MEETING_UPDATED: 'meetings',
  MEETING_LINK_ADDED: 'meetings',
  MEETING_NO_SHOW: 'meetings',
  MEETING_NOTES_PUBLISHED: 'meetings',
  MEETING_NOTES_UPDATED: 'meetings',
  MEETING_NOTES_ACKNOWLEDGED: 'meetings',
  MEETING_NOTES_COMMENTED: 'meetings',
  MEETING_ACTION_ITEM_DONE: 'meetings',
  MESSAGE_SENT: 'messages',
  FILE_UPLOADED: 'files',
};

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  project: 'Project',
  clients: 'Clients',
  progress: 'Milestones & tasks',
  meetings: 'Meetings',
  messages: 'Messages',
  files: 'Files',
};

export function activityCategory(type: string): ActivityCategory {
  return ACTIVITY_CATEGORY_OF[type as ActivityType] ?? 'project';
}

export const USER_ROLES = ['client', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PORTAL_LOCALES = ['en', 'ar'] as const;
export type PortalLocale = (typeof PORTAL_LOCALES)[number];

export const PROPOSAL_STATUSES = ['draft', 'sent', 'changes_requested', 'accepted', 'declined', 'superseded'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** A sent proposal past its validUntil shows as expired; the stored status stays "sent". */
export type ProposalState = ProposalStatus | 'expired';

export const PROPOSAL_STATE_LABELS: Record<ProposalState, string> = {
  draft: 'Draft',
  sent: 'Sent',
  changes_requested: 'Changes requested',
  accepted: 'Accepted',
  declined: 'Declined',
  superseded: 'Replaced',
  expired: 'Expired',
};

export const PROPOSAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'SYP'] as const;
export type ProposalCurrency = (typeof PROPOSAL_CURRENCIES)[number];

export const PROPOSAL_DEFAULT_VALID_DAYS = 14;
export const PROPOSAL_MAX_PHASES = 12;
export const PROPOSAL_MAX_LIST_ITEMS = 20;

export function proposalState(
  proposal: { status: string; validUntil: Date | null },
  now = new Date()
): ProposalState {
  const status = (PROPOSAL_STATUSES as readonly string[]).includes(proposal.status)
    ? (proposal.status as ProposalStatus)
    : 'draft';
  if (status === 'sent' && proposal.validUntil && proposal.validUntil.getTime() <= now.getTime()) return 'expired';
  return status;
}

export const INVITATION_TTL_DAYS = 7;
export const PASSWORD_RESET_TTL_MINUTES = 60;

/** bcrypt only reads the first 72 bytes of a password, so longer ones are rejected. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export const MESSAGE_MAX_LENGTH = 5000;

/** Files per message; together they still have to fit the upload size limit (one request). */
export const MESSAGE_MAX_ATTACHMENTS = 5;

/**
 * Allowed upload types by extension. The server checks each file's bytes
 * against its extension (files.ts); browsers use this map to label direct
 * uploads to Vercel Blob, whose upload token only accepts these types.
 */
export const UPLOAD_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
} as const satisfies Record<string, string>;

/** Upload limits and mode for the browser (formatted on the server). */
export type UploadSettings = {
  /** Per file. */
  maxBytes: number;
  maxSizeLabel: string;
  /** For <input type="file" accept>. */
  accept: string;
  /** Upload straight to Vercel Blob (see uploadClient.ts); otherwise through the app. */
  direct: boolean;
};

/** Images shown as thumbnails in the Files gallery (the types above that browsers display). */
export const isGalleryImage = (mimeType: string) => mimeType.startsWith('image/');

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

/** An in-progress milestone never counts as more than this share of its weight: only Done (or approval) completes it. */
const IN_PROGRESS_CAP = 0.9;

export type ProgressMilestone = {
  status: string;
  estimatedDays?: number | null;
  /** All of its tasks, internal ones included (only their statuses are read). */
  tasks?: { status: string }[];
};

/**
 * Share of the work done, 0–100. Each milestone weighs its estimated days, so
 * a 3-week milestone moves the bar further than a 2-day one; milestones
 * without an estimate weigh the average of those with one (all equal when
 * none has one). Done counts fully; in progress counts the share of its tasks
 * that are done, capped below full. 100 only when every milestone is done.
 */
export function progressPercent(milestones: ProgressMilestone[]): number {
  if (milestones.length === 0) return 0;
  const estimates = milestones.map((m) => m.estimatedDays).filter((d): d is number => typeof d === 'number' && d > 0);
  const fallback = estimates.length ? estimates.reduce((sum, d) => sum + d, 0) / estimates.length : 1;

  let total = 0;
  let done = 0;
  for (const milestone of milestones) {
    const weight = milestone.estimatedDays && milestone.estimatedDays > 0 ? milestone.estimatedDays : fallback;
    total += weight;
    if (milestone.status === 'done') {
      done += weight;
    } else if (milestone.status === 'in_progress' && milestone.tasks?.length) {
      const share = milestone.tasks.filter((t) => t.status === 'done').length / milestone.tasks.length;
      done += weight * Math.min(share, IN_PROGRESS_CAP);
    }
  }

  const percent = Math.round((done / total) * 100);
  const allDone = milestones.every((m) => m.status === 'done');
  return allDone ? 100 : Math.min(percent, 99);
}

export const REVIEW_STATUSES = ['pending', 'approved', 'changes_requested', 'withdrawn'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Awaiting client approval',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  withdrawn: 'Withdrawn',
};

// --- End-of-project sign-off and client review (completion.ts) ---------------

/** A client's answer to "is the project complete?". */
export const COMPLETION_ANSWERS = ['confirmed', 'not_yet'] as const;
export type CompletionAnswer = (typeof COMPLETION_ANSWERS)[number];

/** Parts of the portal a client can flag as hard or confusing (labels: portal.completion.painPoints.*). */
export const REVIEW_PAIN_POINTS = [
  'signin',
  'proposal',
  'progress',
  'approvals',
  'messages',
  'files',
  'meetings',
  'notifications',
  'language',
  'mobile',
] as const;
export type ReviewPainPoint = (typeof REVIEW_PAIN_POINTS)[number];

export const REVIEW_PAIN_POINT_LABELS: Record<ReviewPainPoint, string> = {
  signin: 'Signing in / invitation',
  proposal: 'Reading & accepting the proposal',
  progress: 'Following progress',
  approvals: 'Approving milestones',
  messages: 'Messages',
  files: 'Files & uploads',
  meetings: 'Booking meetings',
  notifications: 'Emails & notifications',
  language: 'Arabic / English',
  mobile: 'Using it on a phone',
};

/** The 1–5 ratings after the two required ones, grouped as the survey shows them. */
export const SERVICE_RATINGS = ['quality', 'deadlines', 'requirements', 'value'] as const;
export const COMMUNICATION_RATINGS = ['responsiveness', 'updates', 'involvement'] as const;
export type ReviewRatingField =
  | 'overall'
  | 'portalEase'
  | (typeof SERVICE_RATINGS)[number]
  | (typeof COMMUNICATION_RATINGS)[number];

export const REVIEW_RATING_LABELS: Record<ReviewRatingField, string> = {
  overall: 'Overall satisfaction',
  portalEase: 'Portal ease of use',
  quality: 'Quality of the work',
  deadlines: 'Meeting deadlines',
  requirements: 'Understood the requirements',
  value: 'Value for money',
  responsiveness: 'Responsiveness',
  updates: 'Clear progress updates',
  involvement: 'Involved in decisions',
};

export const REVIEW_TEXT_MAX_LENGTH = 2000;
