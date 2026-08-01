import { Resend } from 'resend';
import {
  buildBriefEmailBody,
  buildBriefSubject,
  INBOX_EMAIL,
  type ProjectBriefPayload,
} from './projectBrief';
import { buildBriefEmailHtml } from './briefEmailHtml';

export type EmailSendResult = { sent: boolean; error?: string };

const DEFAULT_FROM = 'Michael Zakka <onboarding@resend.dev>';

export function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || '';
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  return {
    configured: Boolean(apiKey),
    apiKey,
    from,
    to: INBOX_EMAIL,
  };
}

export async function sendProjectBriefEmail(
  data: ProjectBriefPayload
): Promise<EmailSendResult> {
  const { configured, apiKey, from, to } = getResendConfig();
  if (!configured) {
    return { sent: false, error: 'RESEND_API_KEY is not configured.' };
  }

  try {
    const resend = new Resend(apiKey);
    const { data: result, error } = await resend.emails.send({
      from,
      to,
      replyTo: data.clientEmail,
      subject: buildBriefSubject(data),
      text: buildBriefEmailBody(data),
      html: buildBriefEmailHtml(data),
    });

    if (error) {
      return { sent: false, error: error.message || 'Resend rejected the request.' };
    }
    if (!result?.id) {
      return { sent: false, error: 'Resend returned no message id.' };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error.' };
  }
}
