import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/db';
import { authorizeAdmin } from '../../../lib/portal/access';
import { notFound, parseJsonBody } from '../../../lib/portal/http';
import { idSchema } from '../../../lib/portal/validation';

const resolveSchema = z.union([z.object({ id: idSchema }), z.object({ all: z.literal(true) })]);

/** Marks one problem, or every open one, as resolved. A resolved problem that happens again reopens and alerts. */
export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, { mutation: true });
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request, resolveSchema);
  if (!body.ok) return body.response;

  const { count } = await prisma.errorEvent.updateMany({
    where: { resolvedAt: null, ...('id' in body.data ? { id: body.data.id } : {}) },
    data: { resolvedAt: new Date() },
  });
  if ('id' in body.data && count === 0) return notFound('No open problem with that id.');
  return NextResponse.json({ resolved: count });
}
