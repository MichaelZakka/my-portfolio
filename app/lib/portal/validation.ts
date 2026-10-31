import { z } from 'zod';
import {
  MEETING_DURATIONS,
  MESSAGE_MAX_LENGTH,
  PORTAL_LOCALES,
  PROJECT_STATUSES,
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

export const messageSchema = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

// --- Meetings (both sides) --------------------------------------------------

/** An ISO instant from the browser (it converts the local time it shows). Must be in the future. */
const meetingTimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() > Date.now(), 'Pick a time in the future.');

export const meetingCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  agenda: z.string().trim().max(2000).default(''),
  location: z.string().trim().max(500).default(''),
  startsAt: meetingTimeSchema,
  durationMinutes: z.union(MEETING_DURATIONS.map((d) => z.literal(d))).default(30),
  milestoneId: idSchema.nullable().default(null),
});

export const meetingActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reschedule'), startsAt: meetingTimeSchema }),
  z.object({ action: z.literal('cancel') }),
]);

export type MeetingCreateInput = z.output<typeof meetingCreateSchema>;
export type MeetingActionInput = z.output<typeof meetingActionSchema>;

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

export const milestoneCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(WORK_STATUSES).default('todo'),
  dueDate: dateOnlySchema.optional(),
});

export const milestoneUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(WORK_STATUSES).optional(),
    dueDate: dateOnlySchema.optional(),
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
