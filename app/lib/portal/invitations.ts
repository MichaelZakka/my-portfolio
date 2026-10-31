import type { EmailSendResult } from '../email';
import { prisma } from '../db';
import { isAdminEmail } from './access';
import { logActivity, updateActivityMeta } from './activity';
import { INVITATION_TTL_DAYS, invitationState, type PortalLocale } from './constants';
import { generateToken, hashToken, TOKEN_PATTERN } from './credentials';
import { portalUrl, sendInvitationEmail, type InvitationEmailKind } from './email';

/**
 * Invitation lifecycle for the admin side. Only the token's hash is stored, so
 * the raw link exists in exactly two places: the email, and the API response
 * to the admin who created or resent it (to share by hand if email fails).
 */

type InvitationFailure = { ok: false; status: number; code: string; error: string };
export type InvitationSuccess = {
  ok: true;
  invitationId: string;
  inviteUrl: string;
  email: EmailSendResult;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const expiryFrom = (now: Date) => new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS);

async function sendAndRecord(input: {
  invitationId: string;
  activityId?: string;
  email: string;
  name: string;
  projectName: string;
  token: string;
  expiresAt: Date;
  locale: string;
  kind?: InvitationEmailKind;
}): Promise<InvitationSuccess> {
  const inviteUrl = portalUrl(`/portal/invite/${input.token}`);
  const result = await sendInvitationEmail({
    to: input.email,
    name: input.name,
    projectName: input.projectName,
    inviteUrl,
    expiresAt: input.expiresAt,
    locale: input.locale,
    kind: input.kind,
  });

  await prisma.invitation.update({
    where: { id: input.invitationId },
    data: { emailSent: result.sent, emailError: result.error ?? null },
  });
  if (input.activityId) {
    await updateActivityMeta(input.activityId, { emailSent: result.sent, emailError: result.error ?? null });
  }
  if (!result.sent) console.error('[portal] Invitation email not sent:', result.error);

  return { ok: true, invitationId: input.invitationId, inviteUrl, email: result };
}

export async function createInvitation(input: {
  projectId: string;
  projectName: string;
  email: string;
  name: string;
  locale: PortalLocale;
  actorId: string;
  kind?: InvitationEmailKind;
}): Promise<InvitationSuccess | InvitationFailure> {
  const { projectId, email } = input;

  if (isAdminEmail(email)) {
    return {
      ok: false,
      status: 409,
      code: 'adminEmail',
      error: 'That is the admin address. Invite clients with their own email.',
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'client') {
    return { ok: false, status: 409, code: 'notClient', error: 'That email belongs to a non-client account.' };
  }
  if (existing) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: existing.id } },
    });
    if (member) {
      return { ok: false, status: 409, code: 'alreadyMember', error: 'This client already has access.' };
    }
  }

  const { token, tokenHash } = generateToken();
  const now = new Date();
  const expiresAt = expiryFrom(now);

  const { invitation, activity, user } = await prisma.$transaction(async (tx) => {
    let user = existing;
    if (!user) {
      user = await tx.user.create({
        data: { email, name: input.name, role: 'client', locale: input.locale },
      });
    } else if (!user.name && input.name) {
      user = await tx.user.update({ where: { id: user.id }, data: { name: input.name } });
    }

    // One live link per person and project: older pending ones stop working.
    await tx.invitation.updateMany({
      where: { projectId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });

    const invitation = await tx.invitation.create({
      data: { projectId, email, tokenHash, userId: user.id, expiresAt, lastSentAt: now },
    });
    const activity = await logActivity(
      {
        projectId,
        actorId: input.actorId,
        type: 'CLIENT_INVITED',
        meta: { email, invitationId: invitation.id },
        visibleToClient: false,
      },
      tx
    );
    return { invitation, activity, user };
  });

  return sendAndRecord({
    invitationId: invitation.id,
    activityId: activity.id,
    email,
    name: user.name,
    projectName: input.projectName,
    token,
    expiresAt,
    locale: input.locale,
    kind: input.kind,
  });
}

/** Issues a fresh link (the old one stops working) and a new expiry, then emails it again. */
export async function resendInvitation(input: {
  projectId: string;
  projectName: string;
  invitationId: string;
}): Promise<InvitationSuccess | InvitationFailure> {
  const invitation = await prisma.invitation.findFirst({
    where: { id: input.invitationId, projectId: input.projectId },
    include: { user: { select: { name: true, locale: true } } },
  });
  if (!invitation) return { ok: false, status: 404, code: 'notFound', error: 'Invitation not found.' };

  const state = invitationState(invitation);
  if (state === 'accepted' || state === 'revoked') {
    return { ok: false, status: 409, code: state, error: `This invitation was already ${state}.` };
  }

  const { token, tokenHash } = generateToken();
  const now = new Date();
  const expiresAt = expiryFrom(now);
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { tokenHash, expiresAt, lastSentAt: now },
  });

  return sendAndRecord({
    invitationId: invitation.id,
    email: invitation.email,
    name: invitation.user?.name ?? '',
    projectName: input.projectName,
    token,
    expiresAt,
    locale: invitation.user?.locale ?? 'en',
  });
}

/** Resolves an invite link for the accept page and API. */
export async function findInvitationByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      project: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, role: true, passwordHash: true, emailVerifiedAt: true } },
    },
  });
  if (!invitation) return null;
  return { ...invitation, state: invitationState(invitation) };
}

export async function revokeInvitation(projectId: string, invitationId: string): Promise<boolean> {
  const { count } = await prisma.invitation.updateMany({
    where: { id: invitationId, projectId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count === 1;
}
