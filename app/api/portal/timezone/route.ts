import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/db';
import { isValidTimeZone } from '../../../lib/portal/format';
import { parseJsonBody, rejectCrossOrigin, unauthorized } from '../../../lib/portal/http';
import { getPortalUser } from '../../../lib/portal/session';

const timeZoneSchema = z.object({
  timeZone: z.string().trim().min(1).max(100).refine(isValidTimeZone, 'Unknown time zone.'),
});

/** Saves the signed-in client's browser time zone (sent by TimeZoneSync); portal times and emails then use it. */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const user = await getPortalUser();
  if (!user) return unauthorized();

  const body = await parseJsonBody(request, timeZoneSchema);
  if (!body.ok) return body.response;

  await prisma.user.update({ where: { id: user.id }, data: { timeZone: body.data.timeZone } });
  return NextResponse.json({ timeZone: body.data.timeZone });
}
