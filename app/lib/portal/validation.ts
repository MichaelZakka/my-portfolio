import { z } from 'zod';
import {
  MEETING_DURATIONS,
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
