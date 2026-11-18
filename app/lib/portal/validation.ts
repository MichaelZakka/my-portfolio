import { z } from 'zod';
import {
  ACTION_ITEM_OWNERS,
  MILESTONE_ADMIN_STATUSES,
  MEETING_ACTION_ITEMS_MAX,
  MEETING_COMMENT_MAX_LENGTH,
  MEETING_DURATIONS,
  MEETING_NOTES_MAX_LENGTH,
  MESSAGE_MAX_ATTACHMENTS,
  MESSAGE_MAX_LENGTH,
  PORTAL_LOCALES,
  PROJECT_STATUSES,
  PROPOSAL_CURRENCIES,
  PROPOSAL_MAX_LIST_ITEMS,
  PROPOSAL_MAX_PHASES,
  WORK_STATUSES,
} from './constants';
import { TOKEN_PATTERN } from './credentials';

/** Zod schemas for every portal and admin-portal API input. */

/** Prisma cuid() ids. Anything else cannot exist, so routes answer 404. */
export const idSchema = z.string().regex(/^[a-z0-9]{20,40}$/i);

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const localeSchema = z.enum(PORTAL_LOCALES);

export const tokenSchema = z.string().regex(TOKEN_PATTERN);

const nameSchema = z.string().trim().max(100);

/** Passwords are length-capped here; the policy itself is checked by checkPasswordPolicy(). */
const passwordInputSchema = z.string().max(256);

/** "YYYY-MM-DD" stored as UTC midnight; "" or null clears the field. */
const dateOnlySchema = z
  .union([z.iso.date(), z.literal(''), z.null()])
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));

const moveSchema = z.enum(['up', 'down']);

// --- Client portal ----------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordInputSchema,
});

export const acceptInvitationSchema = z.object({
  token: tokenSchema,
  name: nameSchema.optional(),
  password: passwordInputSchema,
});

export const localeBodySchema = z.object({ locale: localeSchema });

export const accountUpdateSchema = z.object({ name: nameSchema.pipe(z.string().min(1)) });

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: passwordInputSchema,
});

/** Text, and/or references to files the browser uploaded straight to Vercel Blob. */
export const messageSchema = z
  .object({
    content: z.string().trim().max(MESSAGE_MAX_LENGTH).default(''),
    uploads: z
      .array(z.object({ pathname: z.string().min(1).max(300), filename: z.string().min(1).max(300) }))
      .max(MESSAGE_MAX_ATTACHMENTS)
      .default([]),
  })
  .refine((value) => value.content !== '' || value.uploads.length > 0, 'Write a message or attach a file.');

/** "Read up to here": the createdAt of the newest message the screen showed. */
export const readMarkSchema = z.object({
  until: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
});

// --- Meetings (both sides) --------------------------------------------------

/** An ISO instant from the browser (it converts the local time it shows). Must be in the future. */
const meetingTimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() > Date.now(), 'Pick a time in the future.');

/** Meetings run on Google Meet: the link, or "" until the admin adds it. Stored in Meeting.location. */
const meetLinkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (value === '') return true;
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'meet.google.com';
  }, 'Use a Google Meet link (https://meet.google.com/…).');

export const meetingCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  agenda: z.string().trim().max(2000).default(''),
  location: meetLinkSchema.default(''),
  startsAt: meetingTimeSchema,
  durationMinutes: z.union(MEETING_DURATIONS.map((d) => z.literal(d))).default(30),
  milestoneId: idSchema.nullable().default(null),
});

export const meetingActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reschedule'), startsAt: meetingTimeSchema }),
  z.object({ action: z.literal('cancel') }),
]);

/**
 * Changes to an upcoming meeting; fields left out stay as they are (the time
 * goes through "reschedule"). Who may change what is decided in editMeeting():
 * the details belong to the meeting's creator, the link to the admin.
 */
const meetingDetailEdits = {
  action: z.literal('edit'),
  title: z.string().trim().min(1).max(200).optional(),
  agenda: z.string().trim().max(2000).optional(),
  durationMinutes: z.union(MEETING_DURATIONS.map((d) => z.literal(d))).optional(),
  milestoneId: idSchema.nullable().optional(),
};

export const meetingEditSchema = z.object({ ...meetingDetailEdits, location: meetLinkSchema.optional() });

/** The client never sends a link: adding it is the admin's job. */
const clientMeetingEditSchema = z.object(meetingDetailEdits);

export const adminMeetingActionSchema = z.discriminatedUnion('action', [
  ...meetingActionSchema.options,
  meetingEditSchema,
  // After the start time, when no notes were published: it did not take place.
  z.object({ action: z.literal('no_show') }),
]);

export const clientMeetingActionSchema = z.discriminatedUnion('action', [
  ...meetingActionSchema.options,
  clientMeetingEditSchema,
]);

export type MeetingCreateInput = z.output<typeof meetingCreateSchema>;
export type MeetingActionInput = z.output<typeof meetingActionSchema>;
export type MeetingEditInput = z.output<typeof meetingEditSchema>;

// --- Meeting notes ------------------------------------------------------------

/**
 * The admin's notes: the whole summary and action-item list each time (items
 * keep their id, so ticks survive edits; items left out are removed).
 * `publish` shares a draft with the client; once shared, every save is live.
 */
export const meetingNotesSchema = z.object({
  summary: z.string().trim().max(MEETING_NOTES_MAX_LENGTH),
  actionItems: z
    .array(
      z.object({
        id: idSchema.optional(),
        text: z.string().trim().min(1).max(500),
        owner: z.enum(ACTION_ITEM_OWNERS),
      })
    )
    .max(MEETING_ACTION_ITEMS_MAX)
    .default([]),
  publish: z.boolean().default(false),
});

const meetingFollowUps = [
  z.object({ action: z.literal('comment'), body: z.string().trim().min(1).max(MEETING_COMMENT_MAX_LENGTH) }),
  z.object({ action: z.literal('item'), itemId: idSchema, done: z.boolean() }),
] as const;

/** Under published notes: the admin replies and ticks any item. */
export const adminMeetingFollowUpSchema = z.discriminatedUnion('action', [...meetingFollowUps]);

/**
 * A client also confirms the notes; `version` is the outputSavedAt they read,
 * so a confirmation never covers notes changed after they looked.
 */
export const clientMeetingFollowUpSchema = z.discriminatedUnion('action', [
  ...meetingFollowUps,
  z.object({ action: z.literal('acknowledge'), version: z.iso.datetime() }),
]);

export type MeetingNotesInput = z.output<typeof meetingNotesSchema>;
export type MeetingFollowUpInput = z.output<typeof clientMeetingFollowUpSchema>;

// --- Proposals --------------------------------------------------------------

/** The client's answer on the proposal page (it has no account yet, so the token is the credential). */
export const proposalResponseSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept'),
    token: tokenSchema,
    signerName: z.string().trim().min(2).max(100),
    agree: z.literal(true),
    password: passwordInputSchema,
  }),
  z.object({ action: z.literal('changes'), token: tokenSchema, note: z.string().trim().min(1).max(3000) }),
  z.object({ action: z.literal('decline'), token: tokenSchema, note: z.string().trim().max(3000).default('') }),
]);

export const proposalPhaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  durationDays: z.number().int().min(1).max(365),
});
export type ProposalPhase = z.output<typeof proposalPhaseSchema>;

const proposalListSchema = z.array(z.string().trim().min(1).max(300)).max(PROPOSAL_MAX_LIST_ITEMS);

/** The whole draft, saved at once by the editor. Completeness is checked again when sending. */
export const proposalUpdateSchema = z.object({
  locale: localeSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5000),
  phases: z.array(proposalPhaseSchema).max(PROPOSAL_MAX_PHASES),
  included: proposalListSchema,
  excluded: proposalListSchema,
  clientProvides: proposalListSchema,
  currency: z.enum(PROPOSAL_CURRENCIES),
  totalAmount: z.number().int().min(0).max(100_000_000),
  paymentTerms: z.string().trim().max(1000),
  revisionRounds: z.number().int().min(0).max(10),
  startDate: dateOnlySchema,
  validDays: z.number().int().min(1).max(90),
});
export type ProposalUpdateInput = z.output<typeof proposalUpdateSchema>;

// --- Admin ------------------------------------------------------------------

const projectFields = {
  name: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5000),
  status: z.enum(PROJECT_STATUSES),
  currentPhase: z.string().trim().max(200),
  estimatedCompletion: dateOnlySchema,
};

export const invitationCreateSchema = z.object({
  email: emailSchema,
  name: nameSchema.default(''),
  locale: localeSchema.default('en'),
});

export const projectCreateSchema = z.object({
  name: projectFields.name,
  summary: projectFields.summary.default(''),
  status: projectFields.status.default('planning'),
  currentPhase: projectFields.currentPhase.default(''),
  estimatedCompletion: projectFields.estimatedCompletion.optional(),
  requestId: idSchema.optional(),
  markRequestWon: z.boolean().default(false),
  invite: invitationCreateSchema.optional(),
});

export const projectUpdateSchema = z
  .object({
    name: projectFields.name.optional(),
    summary: projectFields.summary.optional(),
    status: projectFields.status.optional(),
    currentPhase: projectFields.currentPhase.optional(),
    estimatedCompletion: projectFields.estimatedCompletion.optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), 'Nothing to update.');

/** A milestone's weight in the progress bar; null means "no estimate" (it weighs the average). */
const estimatedDaysSchema = z.number().int().min(1).max(365).nullable();

/** Never "done": that takes the client's approval (request it instead). */
const milestoneStatusSchema = z.enum(MILESTONE_ADMIN_STATUSES, {
  error: 'A milestone is marked done when the client approves it. Use “Request approval”.',
});

export const milestoneCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  status: milestoneStatusSchema.default('todo'),
  dueDate: dateOnlySchema.optional(),
  estimatedDays: estimatedDaysSchema.default(null),
});

export const milestoneUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: milestoneStatusSchema.optional(),
    dueDate: dateOnlySchema.optional(),
    estimatedDays: estimatedDaysSchema.optional(),
    move: moveSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), 'Nothing to update.');

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(WORK_STATUSES).default('todo'),
  milestoneId: idSchema.nullable().default(null),
  visibleToClient: z.boolean().default(false),
});

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(WORK_STATUSES).optional(),
    milestoneId: idSchema.nullable().optional(),
    visibleToClient: z.boolean().optional(),
    move: moveSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), 'Nothing to update.');

export const fileUpdateSchema = z.object({ visibleToClient: z.boolean() });

// --- Milestone sign-off -----------------------------------------------------

/** Only absolute http(s) links: the client page renders it as a link. */
const reviewLinkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === '' || (/^https?:\/\//i.test(value) && URL.canParse(value)), 'Use a full http(s) link.');

export const reviewRequestSchema = z.object({
  note: z.string().trim().max(2000).default(''),
  link: reviewLinkSchema.default(''),
});

export const reviewResponseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), comment: z.string().trim().max(2000).default('') }),
  z.object({ action: z.literal('changes'), comment: z.string().trim().min(1).max(2000) }),
]);

/** A reply under a change request (the latest answered round of the milestone). */
export const changeReplySchema = z.object({
  reviewId: idSchema,
  body: z.string().trim().min(1).max(MEETING_COMMENT_MAX_LENGTH),
});
