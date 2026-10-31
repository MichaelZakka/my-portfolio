import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { PASSWORD_MIN_LENGTH } from '../../../../lib/portal/constants';
import { checkPasswordPolicy, hashPassword, hashToken } from '../../../../lib/portal/credentials';
import { apiError, parseJsonBody, rateLimited, rejectCrossOrigin } from '../../../../lib/portal/http';
import { isPortalAuthConfigured, setPortalSessionCookie } from '../../../../lib/portal/session';
import { resetPasswordSchema } from '../../../../lib/portal/validation';

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (!rateLimit(`portal-reset:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }
  if (!isPortalAuthConfigured()) {
    return apiError(503, 'notConfigured', 'Portal sign-in is not configured. Set AUTH_SECRET.');
  }

  const body = await parseJsonBody(request, resetPasswordSchema);
  if (!body.ok) return body.response;
  const { token, password } = body.data;

  const policyError = checkPasswordPolicy(password);
  if (policyError) {
    return apiError(400, policyError, 'Password does not meet the requirements.', { min: PASSWORD_MIN_LENGTH });
  }

  const now = new Date();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, role: true, emailVerifiedAt: true } } },
  });
  if (!record || record.usedAt || record.expiresAt <= now || record.user.role !== 'client') {
    return apiError(400, 'invalidToken', 'This reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    // Claim the token atomically so a double submit can't use it twice.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;

    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
    return tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        // Signs out every existing session.
        sessionVersion: { increment: 1 },
        emailVerifiedAt: record.user.emailVerifiedAt ?? now,
        lastLoginAt: now,
      },
      select: { id: true, sessionVersion: true },
    });
  });
  if (!user) return apiError(400, 'invalidToken', 'This reset link is invalid or has expired.');

  const response = NextResponse.json({ success: true, redirectTo: '/portal' });
  await setPortalSessionCookie(response, user);
  return response;
}
