import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { isLeadStatus, parseLead } from '../../../../lib/leads';
import { assertSameOrigin } from '../../../../lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { statusEvents: { orderBy: { createdAt: 'desc' } } },
  });

  if (!lead) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  return NextResponse.json({ lead: parseLead(lead), statusEvents: lead.statusEvents });
}

function sanitizeNotes(notes: unknown): string | undefined {
  if (typeof notes !== 'string') return undefined;
  // Strip control characters and cap length — notes are plain text, never rendered as HTML.
  return notes.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 5000);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { status, notes, lastContactedAt } = (body ?? {}) as {
    status?: string;
    notes?: string;
    lastContactedAt?: string | null;
  };

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  const data: {
    status?: string;
    notes?: string;
    lastContactedAt?: Date | null;
  } = {};

  if (status !== undefined) {
    if (!isLeadStatus(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }
    data.status = status;
  }

  const sanitizedNotes = sanitizeNotes(notes);
  if (sanitizedNotes !== undefined) {
    data.notes = sanitizedNotes;
  }

  if (lastContactedAt !== undefined) {
    data.lastContactedAt = lastContactedAt ? new Date(lastContactedAt) : null;
  }

  const [updated] = await prisma.$transaction([
    prisma.lead.update({ where: { id }, data }),
    ...(status !== undefined && status !== existing.status
      ? [
          prisma.leadStatusEvent.create({
            data: {
              leadId: id,
              fromStatus: existing.status,
              toStatus: status,
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ lead: parseLead(updated) });
}
