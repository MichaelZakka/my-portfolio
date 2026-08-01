import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from './auth';

/** Reads and verifies the admin session cookie from a Server Component / Route Handler. */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}

/** Defense-in-depth CSRF check for admin mutations: same-origin only. */
export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin requests from fetch() often omit Origin; cookie SameSite=Strict is primary defense
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
