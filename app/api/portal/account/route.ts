import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { parseJsonBody, rejectCrossOrigin, unauthorized } from '../../../lib/portal/http';
import { getPortalUser } from '../../../lib/portal/session';
import { accountUpdateSchema } from '../../../lib/portal/validation';

/** The signed-in client's display name (shown on their messages, files and approvals). */
export async function PATCH(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const user = await getPortalUser();
  if (!user) return unauthorized();

  const body = await parseJsonBody(request, accountUpdateSchema);
  if (!body.ok) return body.response;

  await prisma.user.update({ where: { id: user.id }, data: { name: body.data.name } });
  return NextResponse.json({ name: body.data.name });
}
