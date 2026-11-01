import { createHash } from 'crypto';
import type { Prisma, Proposal } from '@prisma/client';
import { z } from 'zod';
import type { EmailSendResult } from '../email';
import { prisma } from '../db';
import { fromJsonArray, guessLeadLocale, toJsonArray } from '../leads';
import { getAdminActor, isAdminEmail } from './access';
import { logActivity } from './activity';
import {
  PROPOSAL_DEFAULT_VALID_DAYS,
  PROPOSAL_STATE_LABELS,
  isPortalLocale,
  proposalState,
  type PortalLocale,
  type ProposalState,
} from './constants';
import { checkPasswordPolicy, generateToken, hashPassword, hashToken, TOKEN_PATTERN, verifyPassword } from './credentials';
import {
  adminNotifyAddress,
  portalUrl,
  sendProposalEmail,
  sendProposalResponseEmail,
  type ProposalResponseKind,
} from './email';
import { formatMoney } from './format';
import { createProjectInTransaction, isUniqueViolation } from './projects';
import { proposalDefaults } from './proposalDefaults';
import { emailSchema, proposalPhaseSchema, type ProposalPhase, type ProposalUpdateInput } from './validation';

/**
 * Proposal lifecycle: a draft (pre-filled from the request's brief) is edited
 * by the admin, then sent, which locks it and emails a one-time link. The
 * client accepts, asks for changes or declines on /portal/proposal/[token].
 * Revising creates the next version; sending it replaces the older one.
 * Accepting creates the project, a milestone per phase and the client's portal
 * account in one transaction, and freezes what was accepted in `snapshot`.
 */

type Failure = { ok: false; status: number; code: string; error: string };
const fail = (status: number, code: string, error: string): Failure => ({ ok: false, status, code, error });

const DAY_MS = 24 * 60 * 60 * 1000;

export type ProposalContent = {
  version: number;
  locale: PortalLocale;
  title: string;
  summary: string;
  phases: ProposalPhase[];
  included: string[];
  excluded: string[];
  clientProvides: string[];
  currency: string;
  totalAmount: number;
  paymentTerms: string;
  revisionRounds: number;
  startDate: Date | null;
  validDays: number;
};

const phasesSchema = z.array(proposalPhaseSchema);

function parsePhases(value: string): ProposalPhase[] {
  try {
    const parsed = phasesSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function proposalContent(row: Proposal): ProposalContent {
  return {
    version: row.version,
    locale: isPortalLocale(row.locale) ? row.locale : 'en',
    title: row.title,
    summary: row.summary,
    phases: parsePhases(row.phases),
    included: fromJsonArray(row.included),
    excluded: fromJsonArray(row.excluded),
    clientProvides: fromJsonArray(row.clientProvides),
    currency: row.currency,
    totalAmount: row.totalAmount,
    paymentTerms: row.paymentTerms,
    revisionRounds: row.revisionRounds,
    startDate: row.startDate,
    validDays: row.validDays,
  };
}

/** The editable columns, as stored (lists are JSON text like the brief's). */
function contentData(content: Omit<ProposalContent, 'version'> | ProposalUpdateInput) {
  return {
    locale: content.locale,
    title: content.title,
    summary: content.summary,
    phases: JSON.stringify(content.phases),
    included: toJsonArray(content.included),
    excluded: toJsonArray(content.excluded),
    clientProvides: toJsonArray(content.clientProvides),
    currency: content.currency,
    totalAmount: content.totalAmount,
    paymentTerms: content.paymentTerms,
    revisionRounds: content.revisionRounds,
    startDate: content.startDate,
    validDays: content.validDays,
  } satisfies Prisma.ProposalUncheckedUpdateInput;
}

const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** Phases run back to back from the start: each phase's end date (the milestone due date) and the completion date. */
export function proposalSchedule(phases: ProposalPhase[], start: Date) {
  let cursor = utcDay(start).getTime();
  const ends = phases.map((phase) => {
    cursor += phase.durationDays * DAY_MS;
    return new Date(cursor);
  });
  return {
    ends,
    completion: phases.length > 0 ? new Date(cursor) : null,
    totalDays: phases.reduce((sum, phase) => sum + phase.durationDays, 0),
  };
}

export const proposalTotal = (content: Pick<ProposalContent, 'totalAmount' | 'currency'>, locale: string) =>
  formatMoney(content.totalAmount, content.currency, locale);

/** When a proposal sent now would expire (previews of drafts show this). */
export const expiryIfSentNow = (validDays: number, now = new Date()) => new Date(now.getTime() + validDays * DAY_MS);

// --- Admin ------------------------------------------------------------------

/** Opens the request's draft, creating one if needed: v1 from the brief, later versions as a copy of the latest. */
export async function createProposalDraft(leadId: string): Promise<{ ok: true; proposalId: string } | Failure> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      projectTitle: true,
      projectDescription: true,
      landingPath: true,
      projectTypes: true,
      hasBrand: true,
      project: { select: { id: true } },
      proposals: { orderBy: { version: 'desc' }, take: 1 },
    },
  });
  if (!lead) return fail(404, 'notFound', 'Request not found.');
  if (lead.project) return fail(409, 'alreadyConverted', 'This request was already converted to a project.');

  const latest = lead.proposals[0];
  if (latest?.status === 'draft') return { ok: true, proposalId: latest.id };
  if (latest?.status === 'accepted') return fail(409, 'alreadyAccepted', 'This request already has an accepted proposal.');

  let data;
  if (latest) {
    data = contentData(proposalContent(latest));
  } else {
    const locale = guessLeadLocale(lead);
    const defaults = proposalDefaults({ locale, projectTypes: fromJsonArray(lead.projectTypes), hasBrand: lead.hasBrand });
    data = contentData({
      locale,
      title: (lead.projectTitle.trim() || (locale === 'ar' ? 'مشروعك' : 'Your project')).slice(0, 200),
      summary: lead.projectDescription.trim().slice(0, 5000),
      ...defaults,
      currency: 'USD',
      totalAmount: 0,
      revisionRounds: 2,
      startDate: null,
      validDays: PROPOSAL_DEFAULT_VALID_DAYS,
    });
  }

  try {
    const created = await prisma.proposal.create({
      data: { leadId, version: (latest?.version ?? 0) + 1, ...data },
      select: { id: true },
    });
    return { ok: true, proposalId: created.id };
  } catch (err) {
    // Two "new version" clicks racing on @@unique([leadId, version]).
    if (isUniqueViolation(err)) return fail(409, 'conflict', 'Another version was just created. Reload the page.');
    throw err;
  }
}

export async function updateProposalDraft(proposalId: string, input: ProposalUpdateInput): Promise<{ ok: true } | Failure> {
  const { count } = await prisma.proposal.updateMany({
    where: { id: proposalId, status: 'draft' },
    data: contentData(input),
  });
  if (count === 1) return { ok: true };
  const exists = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { id: true } });
  return exists
    ? fail(409, 'notDraft', 'Only drafts can be edited. Revise it as a new version instead.')
    : fail(404, 'notFound', 'Proposal not found.');
}

export async function deleteProposalDraft(proposalId: string): Promise<boolean> {
  const { count } = await prisma.proposal.deleteMany({ where: { id: proposalId, status: 'draft' } });
  return count === 1;
}

export type ProposalSendSuccess = { ok: true; proposalUrl: string; email: EmailSendResult; resent: boolean };

/**
 * Sends a draft (locking it), or issues a fresh link for a sent one: the old
 * link stops working and the validity period restarts. Like invitations, the
 * raw link exists only in the email and in this result.
 */
export async function sendProposal(proposalId: string): Promise<ProposalSendSuccess | Failure> {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      lead: { select: { id: true, status: true, clientName: true, clientEmail: true, project: { select: { id: true } } } },
    },
  });
  if (!proposal) return fail(404, 'notFound', 'Proposal not found.');

  const state = proposalState(proposal);
  if (state !== 'draft' && state !== 'sent' && state !== 'expired') {
    return fail(
      409,
      'notSendable',
      `This proposal is ${PROPOSAL_STATE_LABELS[state].toLowerCase()}. Revise it as a new version instead.`
    );
  }
  if (proposal.lead.project) return fail(409, 'alreadyConverted', 'This request was already converted to a project.');

  const content = proposalContent(proposal);
  if (content.phases.length === 0) return fail(400, 'incomplete', 'Add at least one phase before sending.');
  if (content.totalAmount <= 0) return fail(400, 'incomplete', 'Set the total price before sending.');

  const first = state === 'draft';
  const email = emailSchema.safeParse(first ? proposal.lead.clientEmail : proposal.recipientEmail);
  if (!email.success) return fail(400, 'invalidEmail', 'This request has no valid client email.');
  if (isAdminEmail(email.data)) {
    return fail(409, 'adminEmail', 'The client email is the admin address. Proposals go to clients.');
  }
  const account = await prisma.user.findUnique({ where: { email: email.data }, select: { role: true } });
  if (account && account.role !== 'client') {
    return fail(409, 'notClient', 'That email belongs to a non-client account.');
  }
  const name = first ? proposal.lead.clientName.trim().slice(0, 100) : (proposal.recipientName ?? '');

  const { token, tokenHash } = generateToken();
  const now = new Date();
  const validUntil = expiryIfSentNow(content.validDays, now);

  const claimed = await prisma.$transaction(async (tx) => {
    // updatedAt guards against a save from another tab between reading and sending.
    const updated = await tx.proposal.updateMany({
      where: { id: proposal.id, status: proposal.status, updatedAt: proposal.updatedAt },
      data: {
        status: 'sent',
        tokenHash,
        validUntil,
        recipientEmail: email.data,
        recipientName: name,
        ...(first ? { sentAt: now } : {}),
        emailSent: false,
        emailError: null,
      },
    });
    if (updated.count !== 1) return false;

    if (first) {
      // One live version per request: older links now say a newer version was sent.
      await tx.proposal.updateMany({
        where: { leadId: proposal.leadId, id: { not: proposal.id }, status: { in: ['sent', 'changes_requested'] } },
        data: { status: 'superseded' },
      });
      if (proposal.lead.status !== 'proposal' && proposal.lead.status !== 'won') {
        await tx.lead.update({ where: { id: proposal.leadId }, data: { status: 'proposal' } });
        await tx.leadStatusEvent.create({
          data: {
            leadId: proposal.leadId,
            fromStatus: proposal.lead.status,
            toStatus: 'proposal',
            note: `Proposal v${proposal.version} sent`,
          },
        });
      }
    }
    return true;
  });
  if (!claimed) return fail(409, 'conflict', 'The proposal changed while sending. Reload the page and try again.');

  const proposalUrl = portalUrl(`/portal/proposal/${token}`);
  const result = await sendProposalEmail({
    to: email.data,
    name,
    locale: content.locale,
    title: content.title,
    total: proposalTotal(content, content.locale),
    url: proposalUrl,
    validUntil,
  });
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { emailSent: result.sent, emailError: result.error ?? null },
  });
  if (!result.sent) console.error('[portal] Proposal email not sent:', result.error);

  return { ok: true, proposalUrl, email: result, resent: !first };
}

// --- Client -----------------------------------------------------------------

/** Resolves a proposal link for the client page and API. Drafts have no token, so they never match. */
export async function findProposalByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const proposal = await prisma.proposal.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { lead: { select: { id: true, status: true, project: { select: { id: true } } } } },
  });
  if (!proposal) return null;

  const stored = proposalState(proposal);
  // Converted some other way (e.g. "Accept without a proposal"): nothing is left to answer.
  const state: ProposalState = proposal.lead.project && stored !== 'accepted' ? 'superseded' : stored;
  return { proposal, state, content: proposalContent(proposal) };
}

/** The recipient's existing portal account decides whether accepting asks for their password or a new one. */
export async function findProposalAccount(email: string | null) {
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, passwordHash: true, emailVerifiedAt: true },
  });
}

/** What the admin notification needs about an answered proposal. */
export type ProposalAnswer = {
  kind: ProposalResponseKind;
  proposalId: string;
  projectId: string | null;
  version: number;
  title: string;
  total: string;
  clientName: string;
  clientEmail: string;
  note: string;
};

export async function acceptProposal(input: {
  token: string;
  signerName: string;
  password: string;
  ip: string;
  userAgent: string;
  locale: PortalLocale;
}): Promise<
  | { ok: true; projectId: string; user: { id: string; sessionVersion: number }; answer: ProposalAnswer }
  | Failure
> {
  const found = await findProposalByToken(input.token);
  if (!found) return fail(404, 'proposalInvalid', 'This proposal link is not valid.');
  if (found.state === 'expired') return fail(410, 'proposalExpired', 'This proposal has expired.');
  if (found.state !== 'sent') return fail(409, 'proposalClosed', 'This proposal can no longer be accepted.');

  const { proposal, content } = found;
  const email = proposal.recipientEmail;
  if (!email) return fail(404, 'proposalInvalid', 'This proposal link is not valid.');

  const existing = await findProposalAccount(email);
  if (existing && existing.role !== 'client') {
    return fail(403, 'forbidden', 'This proposal cannot be accepted by this account.');
  }

  // Like invitations: existing accounts prove ownership with their password, new ones choose one.
  let passwordHash: string | undefined;
  if (existing?.passwordHash) {
    if (!(await verifyPassword(input.password, existing.passwordHash))) {
      return fail(401, 'invalidCredentials', 'Incorrect password.');
    }
  } else {
    const policyError = checkPasswordPolicy(input.password);
    if (policyError) return fail(400, policyError, 'Password does not meet the requirements.');
    passwordHash = await hashPassword(input.password);
  }

  const actor = await getAdminActor();
  const now = new Date();
  const start = utcDay(content.startDate ?? now);
  const schedule = proposalSchedule(content.phases, start);
  const isoDay = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

  // Exactly what was on the page, plus who accepted it and when. The hash makes later edits detectable.
  const snapshot = JSON.stringify({
    proposalId: proposal.id,
    version: content.version,
    locale: content.locale,
    title: content.title,
    summary: content.summary,
    phases: content.phases,
    included: content.included,
    excluded: content.excluded,
    clientProvides: content.clientProvides,
    currency: content.currency,
    totalAmount: content.totalAmount,
    paymentTerms: content.paymentTerms,
    revisionRounds: content.revisionRounds,
    startDate: isoDay(start),
    estimatedCompletion: isoDay(schedule.completion),
    validUntil: proposal.validUntil?.toISOString() ?? null,
    recipientEmail: email,
    signerName: input.signerName,
    acceptedAt: now.toISOString(),
  });
  const snapshotHash = createHash('sha256').update(snapshot).digest('hex');

  let accepted;
  try {
    accepted = await prisma.$transaction(async (tx) => {
      // Claim the proposal atomically: a second click (or a new version being sent) loses.
      const claimed = await tx.proposal.updateMany({
        where: { id: proposal.id, status: 'sent', validUntil: { gt: now } },
        data: {
          status: 'accepted',
          respondedAt: now,
          signerName: input.signerName,
          signerIp: input.ip.slice(0, 100),
          signerUserAgent: input.userAgent.slice(0, 500),
          snapshot,
          snapshotHash,
        },
      });
      if (claimed.count !== 1) return null;

      const project = await createProjectInTransaction(tx, {
        name: content.title,
        summary: content.summary,
        status: 'planning',
        currentPhase: content.phases[0]?.title ?? '',
        estimatedCompletion: schedule.completion,
        request: proposal.lead,
        markRequestWon: true,
        actorId: actor.id,
      });
      await tx.milestone.createMany({
        data: content.phases.map((phase, order) => ({
          projectId: project.id,
          title: phase.title,
          description: phase.description,
          order,
          dueDate: schedule.ends[order],
        })),
      });

      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              ...(passwordHash ? { passwordHash } : {}),
              ...(existing.name ? {} : { name: input.signerName }),
              // Opening the emailed link proves the address.
              emailVerifiedAt: existing.emailVerifiedAt ?? now,
              lastLoginAt: now,
              locale: input.locale,
            },
          })
        : await tx.user.create({
            data: {
              email,
              name: input.signerName,
              role: 'client',
              passwordHash,
              emailVerifiedAt: now,
              lastLoginAt: now,
              locale: input.locale,
            },
          });
      await tx.projectMember.create({ data: { projectId: project.id, userId: user.id } });
      await logActivity(
        {
          projectId: project.id,
          actorId: user.id,
          type: 'PROPOSAL_ACCEPTED',
          meta: { proposalId: proposal.id, version: content.version, title: content.title, name: input.signerName },
          visibleToClient: true,
        },
        tx
      );
      return { project, user };
    });
  } catch (err) {
    // The request was converted another way while this was being accepted.
    if (isUniqueViolation(err)) return fail(409, 'proposalClosed', 'This proposal can no longer be accepted.');
    throw err;
  }
  if (!accepted) return fail(409, 'proposalClosed', 'This proposal can no longer be accepted.');

  return {
    ok: true,
    projectId: accepted.project.id,
    user: accepted.user,
    answer: {
      kind: 'accepted',
      proposalId: proposal.id,
      projectId: accepted.project.id,
      version: content.version,
      title: content.title,
      total: proposalTotal(content, 'en'),
      clientName: input.signerName,
      clientEmail: email,
      note: '',
    },
  };
}

/** "Ask for changes" or "Decline". Both also work after the proposal expired. Declining marks the request Lost. */
export async function answerProposal(input: {
  token: string;
  action: 'changes' | 'decline';
  note: string;
}): Promise<{ ok: true; answer: ProposalAnswer } | Failure> {
  const found = await findProposalByToken(input.token);
  if (!found) return fail(404, 'proposalInvalid', 'This proposal link is not valid.');
  if (found.state !== 'sent' && found.state !== 'expired') {
    return fail(409, 'proposalClosed', 'This proposal was already answered or replaced.');
  }

  const { proposal, content } = found;
  const declined = input.action === 'decline';
  const now = new Date();

  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.proposal.updateMany({
      where: { id: proposal.id, status: 'sent' },
      data: { status: declined ? 'declined' : 'changes_requested', respondedAt: now, responseNote: input.note || null },
    });
    if (claimed.count !== 1) return false;
    if (declined && proposal.lead.status !== 'lost' && proposal.lead.status !== 'won') {
      await tx.lead.update({ where: { id: proposal.leadId }, data: { status: 'lost' } });
      await tx.leadStatusEvent.create({
        data: {
          leadId: proposal.leadId,
          fromStatus: proposal.lead.status,
          toStatus: 'lost',
          note: `Proposal v${proposal.version} declined`,
        },
      });
    }
    return true;
  });
  if (!done) return fail(409, 'proposalClosed', 'This proposal was already answered or replaced.');

  return {
    ok: true,
    answer: {
      kind: declined ? 'declined' : 'changes',
      proposalId: proposal.id,
      projectId: null,
      version: content.version,
      title: content.title,
      total: proposalTotal(content, 'en'),
      clientName: proposal.recipientName ?? '',
      clientEmail: proposal.recipientEmail ?? '',
      note: input.note,
    },
  };
}

/** Emails the admin about the answer; runs after the response is sent. */
export async function notifyAboutProposalAnswer(answer: ProposalAnswer) {
  const url = portalUrl(answer.projectId ? `/admin/projects/${answer.projectId}` : `/admin/proposals/${answer.proposalId}`);
  const result = await sendProposalResponseEmail({ to: adminNotifyAddress(), url, ...answer });
  if (!result.sent) console.error('[portal] Proposal response email not sent:', result.error);
}
