import { NextResponse } from 'next/server';
import {
  parseProjectBrief,
  validateProjectBrief,
} from '../../lib/projectBrief';
import { sendProjectBriefEmail } from '../../lib/email';
import { prisma } from '../../lib/db';
import { briefToLeadCreateInput } from '../../lib/leads';
import { getClientIp, rateLimit } from '../../lib/rateLimit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success: withinLimit } = rateLimit(`project-brief:${ip}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const data = parseProjectBrief(raw);
  if (!data) {
    return NextResponse.json({ error: 'Invalid project brief.' }, { status: 400 });
  }

  const validationError = validateProjectBrief(data);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const landingPath =
    raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).landingPath === 'string'
      ? ((raw as Record<string, unknown>).landingPath as string).slice(0, 256)
      : null;

  // 1) Persist to the database first — this is the source of truth. A lead
  //    must never be lost just because the notification email fails.
  let leadId: string;
  try {
    const lead = await prisma.lead.create({
      data: briefToLeadCreateInput(data, {
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
        landingPath,
      }),
    });
    leadId = lead.id;
  } catch (err) {
    console.error('Failed to save project brief to database:', err);
    return NextResponse.json(
      { error: 'Could not save your brief right now. Please try again shortly.' },
      { status: 500 }
    );
  }

  // 2) Best-effort notification email — failures are logged and stored on
  //    the lead, but never turn a saved lead into an error response.
  const emailResult = await sendProjectBriefEmail(data);
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { emailSent: emailResult.sent, emailError: emailResult.error ?? null },
    });
  } catch (err) {
    console.error('Failed to record email status on lead:', err);
  }

  if (!emailResult.sent) {
    console.error('Project brief email notification failed:', emailResult.error);
  }

  return NextResponse.json({
    success: true,
    id: leadId,
  });
}
