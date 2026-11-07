import { NextResponse } from 'next/server';
import { prisma } from '../../lib/db';
import { reportError } from '../../lib/monitoring';

export const dynamic = 'force-dynamic';

/**
 * For an uptime monitor (UptimeRobot, Better Stack…): 200 when the site and
 * its database answer, 503 otherwise. Deliberately says nothing about
 * configuration; the admin Site page has the details.
 */
export async function GET() {
  const started = Date.now();
  let database: 'ok' | 'down' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    database = 'down';
    await reportError({ source: 'database', message: 'Health check: the database is not reachable', error: err });
  }
  const ok = database === 'ok';
  return NextResponse.json(
    { status: ok ? 'ok' : 'down', checks: { database }, ms: Date.now() - started, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
