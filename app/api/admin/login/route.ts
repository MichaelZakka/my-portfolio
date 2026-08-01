import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from '../../../lib/auth';
import { verifyPassword } from '../../../lib/password';
import { getClientIp, rateLimit } from '../../../lib/rateLimit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = rateLimit(`admin-login:${ip}`, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      {
        error:
          'Admin auth is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and AUTH_SECRET.',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: string; password?: string };

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim().toLowerCase() !== adminEmail ||
    !verifyPassword(password, adminPasswordHash)
  ) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await createSessionToken(adminEmail);
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
