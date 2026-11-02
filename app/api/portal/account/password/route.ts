import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { rateLimit } from '../../../../lib/rateLimit';
import { PASSWORD_MIN_LENGTH } from '../../../../lib/portal/constants';
import { checkPasswordPolicy, hashPassword, verifyPassword } from '../../../../lib/portal/credentials';
import { apiError, parseJsonBody, rateLimited, rejectCrossOrigin, unauthorized } from '../../../../lib/portal/http';
import { getPortalUser, setPortalSessionCookie } from '../../../../lib/portal/session';
import { passwordChangeSchema } from '../../../../lib/portal/validation';

/**
 * Changes the password after checking the current one. Every other session
 * ends (sessionVersion bump); this browser gets a fresh cookie and stays in.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const user = await getPortalUser();
  if (!user) return unauthorized();
  if (!rateLimit(`portal-password:${user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, passwordChangeSchema);
  if (!body.ok) return body.response;

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(body.data.currentPassword, account?.passwordHash))) {
    return apiError(400, 'wrongCurrentPassword', 'The current password is not correct.');
  }
  const policyError = checkPasswordPolicy(body.data.newPassword);
  if (policyError) {
    return apiError(400, policyError, 'Password does not meet the requirements.', { min: PASSWORD_MIN_LENGTH });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.data.newPassword), sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  });
  const response = NextResponse.json({ success: true });
  await setPortalSessionCookie(response, updated);
  return response;
}
