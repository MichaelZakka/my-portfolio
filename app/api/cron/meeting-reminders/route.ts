import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { sendMeetingReminders } from '../../../lib/portal/notify';

export const dynamic = 'force-dynamic';

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Emails the day-before reminder for confirmed meetings. Called by a scheduler
 * with `Authorization: Bearer $CRON_SECRET`: Vercel Cron sends that header by
 * itself (see vercel.json); on another host, a daily or hourly crontab `curl`.
 * Fails closed when CRON_SECRET is not configured.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  if (!authorized(request, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await sendMeetingReminders();
  return NextResponse.json(result);
}
