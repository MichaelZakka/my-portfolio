import { NextResponse } from 'next/server';
import { authorizeAdmin } from '../../../lib/portal/access';
import { getAdminBadges } from '../../../lib/notices';

export const dynamic = 'force-dynamic';

/** The numbers on the admin sidebar: unread messages, problems, new requests, project updates, notifications. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(await getAdminBadges(), { headers: { 'Cache-Control': 'private, no-store' } });
}
