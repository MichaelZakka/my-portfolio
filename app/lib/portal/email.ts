import { Resend } from 'resend';
import { createTranslator } from 'next-intl';
import enMessages from '../../../messages/en.json';
import arMessages from '../../../messages/ar.json';
import { getResendConfig, type EmailSendResult } from '../email';
import { getSiteUrl } from '../site';
import {
  PASSWORD_RESET_TTL_MINUTES,
  isPortalLocale,
  isProjectStatus,
  type PortalLocale,
} from './constants';
import { formatDate } from './format';

/**
 * Portal emails (Resend). Each send returns { sent, error } so callers can
 * record emailSent/emailError the same way Lead does. Without RESEND_API_KEY
 * nothing is sent: in development invitation and reset links are printed to
 * the server console instead, so the flow still works locally.
 */

const NOT_CONFIGURED = 'RESEND_API_KEY is not configured.';
const MESSAGES = { en: enMessages, ar: arMessages } as const;

/** Links in emails always use the configured site URL, never the request Host header. */
export function portalUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}

function translator(locale: string) {
  const lang: PortalLocale = isPortalLocale(locale) ? locale : 'en';
  return {
    lang,
    t: createTranslator({ locale: lang, messages: MESSAGES[lang], namespace: 'portalEmail' }),
    status: createTranslator({ locale: lang, messages: MESSAGES[lang], namespace: 'portal.status' }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type EmailContent = {
  heading: string;
  paragraphs: string[];
  quote?: string;
  cta?: { label: string; url: string };
  notes?: string[];
  footer: string;
};

/** Minimal table layout with inline styles (email clients ignore CSS variables). */
function renderEmail(lang: PortalLocale, content: EmailContent): { html: string; text: string } {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const p = (text: string, style = 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2a3d') =>
    `<p style="${style}">${escapeHtml(text)}</p>`;

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<body style="margin:0;padding:0;background:#f2f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f8">
<tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e3e8f0">
<tr><td style="padding:30px 28px;text-align:${align};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif">
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.35;color:#0a1628">${escapeHtml(content.heading)}</h1>
${content.paragraphs.map((text) => p(text)).join('\n')}
${
  content.quote
    ? `<div dir="auto" style="margin:0 0 18px;padding:12px 16px;background:#f5f7fb;border-${align === 'left' ? 'left' : 'right'}:3px solid #1668e8;border-radius:6px;font-size:14px;line-height:1.6;color:#1f2a3d;white-space:pre-wrap">${escapeHtml(content.quote)}</div>`
    : ''
}
${
  content.cta
    ? `<p style="margin:22px 0 10px"><a href="${escapeHtml(content.cta.url)}" style="display:inline-block;background:#1668e8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600">${escapeHtml(content.cta.label)}</a></p>
<p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:#5b6b85;word-break:break-all" dir="ltr">${escapeHtml(content.cta.url)}</p>`
    : ''
}
${(content.notes ?? []).map((text) => p(text, 'margin:0 0 10px;font-size:13px;line-height:1.6;color:#5b6b85')).join('\n')}
<hr style="border:0;border-top:1px solid #e3e8f0;margin:22px 0 14px">
${p(content.footer, 'margin:0;font-size:12px;line-height:1.6;color:#7d8ba3')}
</td></tr></table>
</td></tr></table>
</body>
</html>`;

  const text = [
    content.heading,
    '',
    ...content.paragraphs,
    ...(content.quote ? ['', content.quote] : []),
    ...(content.cta ? ['', `${content.cta.label}: ${content.cta.url}`] : []),
    ...(content.notes?.length ? ['', ...content.notes] : []),
    '',
    '—',
    content.footer,
  ].join('\n');

  return { html, text };
}

async function deliver(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  const { configured, apiKey, from } = getResendConfig();
  if (!configured) return { sent: false, error: NOT_CONFIGURED };

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from, ...message });
    if (error) return { sent: false, error: error.message || 'Resend rejected the request.' };
    if (!data?.id) return { sent: false, error: 'Resend returned no message id.' };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error.' };
  }
}

/** Dev fallback: print the link so invitations and resets can be completed without Resend. */
function logLinkFallback(kind: string, to: string, url: string) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[portal] ${NOT_CONFIGURED} ${kind} email to ${to} was not sent.`);
  } else {
    console.info(`[portal] ${NOT_CONFIGURED} ${kind} link for ${to}:\n  ${url}`);
  }
}

export async function sendInvitationEmail(input: {
  to: string;
  name: string;
  projectName: string;
  inviteUrl: string;
  expiresAt: Date;
  locale: string;
}): Promise<EmailSendResult> {
  if (!getResendConfig().configured) {
    logLinkFallback('Invitation', input.to, input.inviteUrl);
    return { sent: false, error: NOT_CONFIGURED };
  }
  const { lang, t } = translator(input.locale);
  const content = renderEmail(lang, {
    heading: t('invite.heading'),
    paragraphs: [
      input.name ? t('greeting', { name: input.name }) : t('greetingNoName'),
      t('invite.body', { project: input.projectName }),
    ],
    cta: { label: t('invite.cta'), url: input.inviteUrl },
    notes: [t('invite.expiry', { date: formatDate(input.expiresAt, lang) }), t('invite.ignore')],
    footer: t('footer'),
  });
  return deliver({ to: input.to, subject: t('invite.subject', { project: input.projectName }), ...content });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  locale: string;
}): Promise<EmailSendResult> {
  if (!getResendConfig().configured) {
    logLinkFallback('Password reset', input.to, input.resetUrl);
    return { sent: false, error: NOT_CONFIGURED };
  }
  const { lang, t } = translator(input.locale);
  const content = renderEmail(lang, {
    heading: t('reset.heading'),
    paragraphs: [
      input.name ? t('greeting', { name: input.name }) : t('greetingNoName'),
      t('reset.body'),
    ],
    cta: { label: t('reset.cta'), url: input.resetUrl },
    notes: [t('reset.expiry', { minutes: String(PASSWORD_RESET_TTL_MINUTES) }), t('reset.ignore')],
    footer: t('footer'),
  });
  return deliver({ to: input.to, subject: t('reset.subject'), ...content });
}

const EXCERPT_LENGTH = 600;

function excerpt(content: string): string {
  return content.length > EXCERPT_LENGTH ? `${content.slice(0, EXCERPT_LENGTH).trimEnd()}…` : content;
}

/** Where client-side events (a client's message) notify the admin. */
export function adminNotifyAddress(): string {
  return process.env.PORTAL_NOTIFY_EMAIL?.trim() || getResendConfig().to;
}

export async function sendNewMessageEmail(input: {
  to: string;
  locale: string;
  projectName: string;
  senderName: string;
  content: string;
  url: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  if (!getResendConfig().configured) {
    console.info(`[portal] ${NOT_CONFIGURED} New-message email to ${input.to} was not sent.`);
    return { sent: false, error: NOT_CONFIGURED };
  }
  const { lang, t } = translator(input.locale);
  const content = renderEmail(lang, {
    heading: t('message.heading', { sender: input.senderName }),
    paragraphs: [t('message.body', { project: input.projectName })],
    quote: excerpt(input.content),
    cta: { label: t('message.cta'), url: input.url },
    footer: t('footer'),
  });
  return deliver({
    to: input.to,
    subject: t('message.subject', { project: input.projectName }),
    replyTo: input.replyTo,
    ...content,
  });
}

export async function sendStatusChangedEmail(input: {
  to: string;
  locale: string;
  projectName: string;
  fromStatus: string;
  toStatus: string;
  phase: string;
  url: string;
}): Promise<EmailSendResult> {
  if (!getResendConfig().configured) {
    console.info(`[portal] ${NOT_CONFIGURED} Status-change email to ${input.to} was not sent.`);
    return { sent: false, error: NOT_CONFIGURED };
  }
  const { lang, t, status } = translator(input.locale);
  const label = (value: string) => (isProjectStatus(value) ? status(value) : value);
  const toLabel = label(input.toStatus);
  const content = renderEmail(lang, {
    heading: t('status.heading'),
    paragraphs: [
      t('status.body', { project: input.projectName, from: label(input.fromStatus), to: toLabel }),
      ...(input.phase ? [t('status.phase', { phase: input.phase })] : []),
    ],
    cta: { label: t('status.cta'), url: input.url },
    footer: t('footer'),
  });
  return deliver({
    to: input.to,
    subject: t('status.subject', { project: input.projectName, status: toLabel }),
    ...content,
  });
}

/** Folds several per-recipient results into one { sent, error } for the record. */
export function combineResults(results: { to: string; result: EmailSendResult }[]): EmailSendResult {
  if (results.length === 0) return { sent: false, error: 'No recipients.' };
  const failures = results.filter((r) => !r.result.sent);
  if (failures.length === 0) return { sent: true };
  return {
    sent: false,
    error: failures.map((f) => `${f.to}: ${f.result.error ?? 'failed'}`).join('; ').slice(0, 1000),
  };
}
