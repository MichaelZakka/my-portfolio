import { NextResponse, after } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { PASSWORD_RESET_TTL_MINUTES } from '../../../../lib/portal/constants';
import { generateToken } from '../../../../lib/portal/credentials';
import { portalUrl, sendPasswordResetEmail } from '../../../../lib/portal/email';
import { parseJsonBody, rateLimited, rejectCrossOrigin } from '../../../../lib/portal/http';
import { getPortalLocale } from '../../../../lib/portal/locale';
import { forgotPasswordSchema } from '../../../../lib/portal/validation';

/**
 * Always answers 200 with the same body, whether or not the address has an
 * account, and sends the email after responding, so neither the response nor
 * its timing reveals which emails are registered.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const ip = getClientIp(request);
  if (!rateLimit(`portal-forgot:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 }).success) {
    return rateLimited();
  }

  const body = await parseJsonBody(request, forgotPasswordSchema);
  if (!body.ok) return body.response;
  const { email } = body.data;
  const ok = NextResponse.json({ success: true });

  // Quietly cap emails per address (stops mailbox flooding) without revealing anything.
  if (!rateLimit(`portal-forgot-email:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 }).success) {
    return ok;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });
  // Only activated client accounts can reset; invitees finish setup through their invitation.
  if (!user || user.role !== 'client' || !user.passwordHash) return ok;

  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
  ]);

  const locale = await getPortalLocale();
  after(async () => {
    const result = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: portalUrl(`/portal/reset-password/${token}`),
      locale,
    });
    await prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { emailSent: result.sent, emailError: result.error ?? null },
    });
    if (!result.sent) console.error('[portal] Password reset email not sent:', result.error);
  });

  return ok;
}
