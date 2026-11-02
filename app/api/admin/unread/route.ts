import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { authorizeAdmin } from '../../../lib/portal/access';
import { adminUnreadByProject } from '../../../lib/portal/messages';

/** Badge counts for the admin sidebar: unread client messages and open problems. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  const [unread, problems] = await Promise.all([
    adminUnreadByProject(),
    prisma.errorEvent.count({ where: { resolvedAt: null } }),
  ]);
  return NextResponse.json(
    { messages: [...unread.values()].reduce((sum, n) => sum + n, 0), problems },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
