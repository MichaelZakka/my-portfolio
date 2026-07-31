import { NextResponse } from 'next/server';
import {
  buildBriefEmailBody,
  buildBriefSubject,
  INBOX_EMAIL,
  parseProjectBrief,
  validateProjectBrief,
} from '../../lib/projectBrief';

export async function POST(request: Request) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json(
      {
        error:
          'Email delivery is not configured. Add WEB3FORMS_ACCESS_KEY to your environment.',
      },
      { status: 503 }
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

  const subject = buildBriefSubject(data);
  const message = buildBriefEmailBody(data);

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject,
        from_name: data.clientName,
        email: data.clientEmail,
        replyto: data.clientEmail,
        to: INBOX_EMAIL,
        message,
      }),
    });

    const result = (await response.json()) as { success?: boolean; message?: string };

    if (!response.ok || !result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to send project brief.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to send project brief right now. Please try again.' },
      { status: 502 }
    );
  }
}
