import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from './db';
import { getResendConfig } from './email';
import { getSiteUrl } from './site';

/**
 * Error monitoring without a third-party service. reportError() still logs to
 * the console, records the problem in ErrorEvent (grouped by fingerprint, so a
 * recurring problem is one row with a count), and alerts the admin the first
 * time and then at most hourly while it stays unresolved: by email (Resend)
 * and, if ALERT_WEBHOOK_URL is set, a Slack/Discord-style webhook (useful when
 * email is what broke). It never throws: monitoring must not break the
 * request that ran into the problem.
 *
 * Unhandled errors arrive through instrumentation.ts (onRequestError), browser
 * crashes through /api/errors, and handled failures (storage, email delivery)
 * are reported where they happen.
 */

export type ErrorSource = 'request' | 'browser' | 'storage' | 'email' | 'database' | 'cron' | 'intake';

const HOUR_MS = 60 * 60 * 1000;
/** Alerts across all problems per server instance and hour: a flood never turns into an email storm. */
const MAX_ALERTS_PER_HOUR = 10;

let alertBudget = { windowStart: 0, sent: 0 };
/** Used when the database (where alertedAt normally lives) is unreachable. */
const memoryAlertedAt = new Map<string, number>();

/** Ids, tokens and numbers differ between occurrences of the same problem. */
function normalize(message: string): string {
  return message
    .replace(/[A-Za-z0-9_-]{20,}/g, '<id>')
    .replace(/\d+/g, '#')
    .slice(0, 300);
}

/** Never store or send the one-time tokens that some portal URLs carry (invites, resets, proposals). */
export function safePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const [pathname] = path.split('?');
  return pathname.replace(/\/[A-Za-z0-9_-]{40,}(?=\/|$)/g, '/:token').slice(0, 300);
}

function withinBudget(now: number): boolean {
  if (now - alertBudget.windowStart > HOUR_MS) alertBudget = { windowStart: now, sent: 0 };
  if (alertBudget.sent >= MAX_ALERTS_PER_HOUR) return false;
  alertBudget.sent++;
  return true;
}

export async function reportError(input: {
  source: ErrorSource;
  message: string;
  error?: unknown;
  path?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  const message = (input.message || 'Unknown error').slice(0, 500);
  const path = safePath(input.path);
  const detailParts: string[] = [];
  if (input.error instanceof Error) detailParts.push(input.error.stack ?? `${input.error.name}: ${input.error.message}`);
  else if (input.error !== undefined && input.error !== null) detailParts.push(String(input.error));
  if (input.context) detailParts.push(JSON.stringify(input.context));
  const detail = detailParts.join('\n').slice(0, 4000) || null;

  console.error(`[monitor:${input.source}] ${message}`, input.error ?? '');

  try {
    const fingerprint = createHash('sha256').update(`${input.source}|${normalize(message)}`).digest('hex').slice(0, 32);
    const now = new Date();
    let shouldAlert = false;
    let count = 1;

    try {
      const existing = await prisma.errorEvent.findUnique({ where: { fingerprint } });
      if (existing) {
        const updated = await prisma.errorEvent.update({
          where: { id: existing.id },
          data: {
            count: { increment: 1 },
            lastSeenAt: now,
            message,
            detail: detail ?? existing.detail,
            path: path ?? existing.path,
            resolvedAt: null,
          },
        });
        count = updated.count;
        shouldAlert =
          existing.resolvedAt !== null ||
          !existing.alertedAt ||
          now.getTime() - existing.alertedAt.getTime() > HOUR_MS;
      } else {
        try {
          await prisma.errorEvent.create({ data: { fingerprint, source: input.source, message, detail, path } });
          shouldAlert = true;
        } catch (err) {
          // The same new problem reported twice at once: the other report alerts.
          if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
        }
      }
    } catch (dbError) {
      // The database may be what is down: still alert, throttled in memory.
      console.error('[monitor] Could not record the error:', dbError);
      const last = memoryAlertedAt.get(fingerprint) ?? 0;
      shouldAlert = now.getTime() - last > HOUR_MS;
    }

    if (!shouldAlert || !withinBudget(now.getTime())) return;
    memoryAlertedAt.set(fingerprint, now.getTime());
    if (await sendAlert({ source: input.source, message, detail, path, count })) {
      await prisma.errorEvent.updateMany({ where: { fingerprint }, data: { alertedAt: now } }).catch(() => {});
    }
  } catch (err) {
    console.error('[monitor] reportError failed:', err);
  }
}

/** Email delivery failures, minus "Resend is not configured" (a setup state the Site page already shows). */
export function reportDeliveryFailure(what: string, error: string | undefined, path?: string) {
  if (!error || /is not configured/i.test(error)) {
    console.error(`[portal] ${what}:`, error);
    return Promise.resolve();
  }
  return reportError({ source: 'email', message: `${what}: ${error}`, path });
}

export function alertChannels() {
  return {
    email: getResendConfig().configured,
    webhook: Boolean(process.env.ALERT_WEBHOOK_URL?.trim()),
    to: process.env.ALERT_EMAIL?.trim() || process.env.PORTAL_NOTIFY_EMAIL?.trim() || getResendConfig().to,
  };
}

/** Returns true when at least one channel accepted the alert. */
async function sendAlert(event: {
  source: ErrorSource;
  message: string;
  detail: string | null;
  path: string | null;
  count: number;
}): Promise<boolean> {
  const site = getSiteUrl();
  const link = `${site}/admin/site#errors`;
  const summary = `${event.source} error${event.count > 1 ? ` (seen ${event.count} times)` : ''}: ${event.message}`;
  const lines = [
    summary,
    ...(event.path ? [`Path: ${event.path}`] : []),
    `Details and "mark resolved": ${link}`,
  ];
  let delivered = false;

  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      // `text` for Slack-style hooks, `content` for Discord.
      const text = `[${new URL(site).host}] ${lines.join('\n')}`;
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, content: text.slice(0, 1900) }),
        signal: AbortSignal.timeout(5000),
      });
      delivered ||= response.ok;
    } catch (err) {
      console.error('[monitor] Alert webhook failed:', err);
    }
  }

  const { configured, apiKey, from } = getResendConfig();
  if (configured) {
    try {
      const { error } = await new Resend(apiKey).emails.send({
        from,
        to: alertChannels().to,
        subject: `Site problem: ${event.message.slice(0, 90)}`,
        text: [...lines, '', ...(event.detail ? ['Details:', event.detail.slice(0, 2000)] : [])].join('\n'),
      });
      delivered ||= !error;
      if (error) console.error('[monitor] Alert email failed:', error.message);
    } catch (err) {
      console.error('[monitor] Alert email failed:', err);
    }
  }
  return delivered;
}
