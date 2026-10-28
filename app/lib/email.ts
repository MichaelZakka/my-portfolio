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

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Sends a homepage contact-form message to the inbox (override with CONTACT_TO_EMAIL). */
export async function sendContactEmail(data: {
  name: string;
  email: string;
  message: string;
}): Promise<EmailSendResult> {
  const { configured, apiKey, from, to: defaultTo } = getResendConfig();
  if (!configured) {
    return { sent: false, error: 'RESEND_API_KEY is not configured.' };
  }
  const to = process.env.CONTACT_TO_EMAIL?.trim() || defaultTo;

  try {
    const resend = new Resend(apiKey);
    const { data: result, error } = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `Portfolio contact: ${data.name}`,
      text: `From: ${data.name} <${data.email}>\n\n${data.message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
    });
    if (error) return { sent: false, error: error.message || 'Resend rejected the request.' };
    if (!result?.id) return { sent: false, error: 'Resend returned no message id.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown Resend error.' };
  }
}
