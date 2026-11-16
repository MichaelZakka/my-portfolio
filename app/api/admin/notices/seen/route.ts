import { NextResponse } from 'next/server';
import { authorizeAdmin } from '../../../../lib/portal/access';
import { getAdminBadges, markNoticesSeen } from '../../../../lib/notices';

/**
 * The notifications screen was opened: everything shown counts as seen, and
 * the fresh badge numbers go back so the sidebar can update at once.
 */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;

  await markNoticesSeen();
  return NextResponse.json(await getAdminBadges(), { headers: { 'Cache-Control': 'private, no-store' } });
}
