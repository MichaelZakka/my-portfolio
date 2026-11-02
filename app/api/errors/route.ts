import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reportError } from '../../lib/monitoring';
import { getClientIp, rateLimit } from '../../lib/rateLimit';
import { parseJsonBody, rejectCrossOrigin } from '../../lib/portal/http';

const browserErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(500).optional(),
});

/**
 * Crashes in the browser, sent by the error boundaries (app/portal/error.tsx,
 * the admin's). Server-side failures are already reported by
 * instrumentation.ts, so boundaries only send errors that have no digest.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  if (!rateLimit(`browser-error:${getClientIp(request)}`, { limit: 10, windowMs: 10 * 60 * 1000 }).success) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await parseJsonBody(request, browserErrorSchema);
  if (!body.ok) return body.response;

  await reportError({
    source: 'browser',
    message: body.data.message,
    error: body.data.stack,
    path: body.data.path,
    context: { userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? null },
  });
  return new NextResponse(null, { status: 204 });
}
