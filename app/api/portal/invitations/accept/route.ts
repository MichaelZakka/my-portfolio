import { NextResponse, after } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { logActivity } from '../../../../lib/portal/activity';
import { PASSWORD_MIN_LENGTH } from '../../../../lib/portal/constants';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '../../../../lib/portal/credentials';
import { apiError, parseJsonBody, rateLimited, rejectCrossOrigin } from '../../../../lib/portal/http';
import { findInvitationByToken } from '../../../../lib/portal/invitations';
import { getPortalLocale } from '../../../../lib/portal/locale';
import { notifyAboutClientJoined } from '../../../../lib/portal/notify';
import { isPortalAuthConfigured, setPortalSessionCookie } from '../../../../lib/portal/session';
import { acceptInvitationSchema } from '../../../../lib/portal/validation';

const STATE_ERRORS = {
  revoked: [410, 'invitationRevoked', 'This invitation was withdrawn.'],
  expired: [410, 'invitationExpired', 'This invitation has expired.'],
  accepted: [409, 'invitationAccepted', 'This invitation was already accepted.'],
} as const;

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (!rateLimit(`portal-invite:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }
  if (!isPortalAuthConfigured()) {
    return apiError(503, 'notConfigured', 'Portal sign-in is not configured. Set AUTH_SECRET.');
  }

  const body = await parseJsonBody(request, acceptInvitationSchema);
  if (!body.ok) return body.response;
  const { token, password } = body.data;
  const name = body.data.name?.trim() ?? '';

  const invitation = await findInvitationByToken(token);
  if (!invitation) return apiError(404, 'invitationInvalid', 'This invitation link is not valid.');
  if (invitation.state !== 'pending') {
    const [status, code, error] = STATE_ERRORS[invitation.state];
    return apiError(status, code, error);
  }

  // The invitee's account: linked at invite time, or found by email for older invitations.
  const existing =
    invitation.user ??
    (await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, name: true, role: true, passwordHash: true, emailVerifiedAt: true },
    }));
  if (existing && existing.role !== 'client') {
    return apiError(403, 'forbidden', 'This invitation cannot be accepted by this account.');
  }

  // Existing accounts prove ownership with their password; new ones choose one.
  let passwordHash: string | undefined;
  if (existing?.passwordHash) {
    if (!(await verifyPassword(password, existing.passwordHash))) {
      return apiError(401, 'invalidCredentials', 'Incorrect password.');
    }
  } else {
    const policyError = checkPasswordPolicy(password);
    if (policyError) {
      return apiError(400, policyError, 'Password does not meet the requirements.', { min: PASSWORD_MIN_LENGTH });
    }
    passwordHash = await hashPassword(password);
  }

  const now = new Date();
  const locale = await getPortalLocale();
  const { projectId } = invitation;

  const joined = await prisma.$transaction(async (tx) => {
    // Claim the invitation atomically: a second submit (or a revoke racing this) loses.
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
    });
    if (claimed.count !== 1) return null;

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            ...(passwordHash ? { passwordHash } : {}),
            ...(passwordHash && name ? { name } : {}),
            // Opening the emailed link proves the address.
            emailVerifiedAt: existing.emailVerifiedAt ?? now,
            lastLoginAt: now,
            locale,
          },
        })
      : await tx.user.create({
          data: {
            email: invitation.email,
            name,
            role: 'client',
            passwordHash,
            emailVerifiedAt: now,
            lastLoginAt: now,
            locale,
          },
        });

    await tx.invitation.update({ where: { id: invitation.id }, data: { userId: user.id } });
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      update: {},
      create: { projectId, userId: user.id, role: invitation.role },
    });
    // Any other pending link for this person and project is now redundant.
    await tx.invitation.updateMany({
      where: { projectId, email: invitation.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    const activity = await logActivity(
      {
        projectId,
        actorId: user.id,
        type: 'INVITE_ACCEPTED',
        meta: { name: user.name || user.email },
        visibleToClient: true,
      },
      tx
    );
    return { user, activityId: activity.id };
  });

  if (!joined) return apiError(409, 'invitationAccepted', 'This invitation was already accepted.');
  const { user: account, activityId } = joined;

  after(() =>
    notifyAboutClientJoined({
      activityId,
      projectId,
      projectName: invitation.project.name,
      clientName: account.name,
      clientEmail: account.email,
    })
  );

  const response = NextResponse.json({ success: true, redirectTo: `/portal/projects/${projectId}` });
  await setPortalSessionCookie(response, account);
  return response;
}
