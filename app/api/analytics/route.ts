import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '../../lib/rateLimit';
import { isAnalyticsEventType, recordAnalyticsEvent } from '../../lib/analyticsServer';

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = rateLimit(`analytics:${ip}`, { limit: 120, windowMs: 60 * 1000 });
  if (!success) {
    // Fail silently for a beacon endpoint — no need to surface rate limits to visitors.
    return NextResponse.json({ success: false }, { status: 202 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 202 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const type = asOptionalString(payload.type);

  if (!type || !isAnalyticsEventType(type)) {
    return NextResponse.json({ success: false }, { status: 202 });
  }

  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-country') ||
    undefined;

  try {
    await recordAnalyticsEvent({
      type,
      path: asOptionalString(payload.path),
      label: asOptionalString(payload.label),
      referrer: asOptionalString(payload.referrer),
      utmSource: asOptionalString(payload.utmSource),
      utmMedium: asOptionalString(payload.utmMedium),
      utmCampaign: asOptionalString(payload.utmCampaign),
      utmTerm: asOptionalString(payload.utmTerm),
      utmContent: asOptionalString(payload.utmContent),
      sessionId: asOptionalString(payload.sessionId),
      meta:
        payload.meta && typeof payload.meta === 'object'
          ? (payload.meta as Record<string, unknown>)
          : null,
      userAgent: request.headers.get('user-agent'),
      country,
    });
  } catch {
    // Never fail the request for analytics errors.
  }

  return NextResponse.json({ success: true });
}
