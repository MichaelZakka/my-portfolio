import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from './auth';

/** Reads and verifies the admin session cookie from a Server Component / Route Handler. */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * For admin pages: redirects to the login page without a valid session.
 * proxy.ts already gates /admin, but every page calls this too so the
 * dashboard never depends on the proxy alone (layouts are not enough: they
 * render in parallel with the page and are skipped on client navigation).
 */
export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect('/admin-jfaygpory6/login');
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
