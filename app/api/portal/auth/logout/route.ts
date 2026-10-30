import { NextResponse } from 'next/server';
import { rejectCrossOrigin } from '../../../../lib/portal/http';
import { clearPortalSessionCookie } from '../../../../lib/portal/session';

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const response = NextResponse.json({ success: true });
  clearPortalSessionCookie(response);
  return response;
}
