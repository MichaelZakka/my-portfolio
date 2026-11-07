import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Mail,
  ShieldCheck,
  Globe,
  Activity,
  BellRing,
  HeartPulse,
} from 'lucide-react';
import { prisma } from '../../../lib/db';
import { alertChannels } from '../../../lib/monitoring';
import { formatDateTime } from '../../../lib/portal/format';
import ProblemsPanel, { type Problem } from './ProblemsPanel';
import { requireAdminSession } from '../../../lib/session';
import { PERSON } from '../../../lib/seo';
import { STRENGTHS } from '../../../../data/strengths';
import { PUBLISHED_PROJECTS } from '../../../../data/projects';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';

export const dynamic = 'force-dynamic';

type HealthTone = 'ok' | 'warn' | 'bad';

type HealthCheck = {
  id: string;
  label: string;
  tone: HealthTone;
  detail: string;
  meta?: { label: string; value: string | number }[];
};

const STATUS_LABEL: Record<HealthTone, string> = {
  ok: 'Healthy',
  warn: 'Warning',
  bad: 'Action needed',
};

const CARD_CLASS: Record<HealthTone, string> = {
  ok: pageStyles.healthCardOk,
  warn: pageStyles.healthCardWarn,
  bad: pageStyles.healthCardBad,
};

const STATUS_CLASS: Record<HealthTone, string> = {
  ok: pageStyles.statusOk,
  warn: pageStyles.statusWarn,
  bad: pageStyles.statusBad,
};

const ICON_BY_ID = {
  database: Database,
  email: Mail,
  auth: ShieldCheck,
  siteUrl: Globe,
  analytics: Activity,
  alerts: BellRing,
  uptime: HeartPulse,
} as const;

function StatusIcon({ tone }: { tone: HealthTone }) {
  if (tone === 'ok') return <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />;
  if (tone === 'warn') return <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" />;
  return <XCircle size={12} strokeWidth={2.5} aria-hidden="true" />;
}

async function getHealthChecks(): Promise<HealthCheck[]> {
  const analyticsCount = await prisma.analyticsEvent.count();
  const leadsCount = await prisma.lead.count();

  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasAuth = Boolean(
    process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.AUTH_SECRET
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const channels = alertChannels();
  const openProblems = await prisma.errorEvent.count({ where: { resolvedAt: null } });

  return [
    {
      id: 'database',
      label: 'Database connection',
      tone: 'ok',
      detail: 'Postgres (Prisma) is connected and accepting writes.',
      meta: [
        { label: 'Requests', value: leadsCount },
        { label: 'Events', value: analyticsCount },
      ],
    },
    {
      id: 'email',
      label: 'Resend email',
      tone: hasResend ? 'ok' : 'bad',
      detail: hasResend
        ? 'Notification emails will send after each survey submission.'
        : 'Missing RESEND_API_KEY — briefs still save, but email notifications will fail.',
    },
    {
      id: 'auth',
      label: 'Admin auth',
      tone: hasAuth ? 'ok' : 'bad',
      detail: hasAuth
        ? 'ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and AUTH_SECRET are configured.'
        : 'Missing one or more of ADMIN_EMAIL / ADMIN_PASSWORD_HASH / AUTH_SECRET.',
    },
    {
      id: 'siteUrl',
      label: 'Site URL',
      tone: siteUrl ? 'ok' : 'warn',
      detail: siteUrl
        ? siteUrl
        : 'Not set — falling back to Vercel URL / localhost for SEO metadata.',
    },
    {
      id: 'analytics',
      label: 'Visitor analytics',
      tone: analyticsCount > 0 ? 'ok' : 'warn',
      detail:
        analyticsCount > 0
          ? 'First-party analytics are collecting page views and CTA events.'
          : 'No events recorded yet — will populate once the site receives traffic.',
      meta: [{ label: 'Events recorded', value: analyticsCount }],
    },
    {
      id: 'alerts',
      label: 'Problem alerts',
      tone: channels.webhook || channels.email ? 'ok' : 'bad',
      detail: channels.webhook
        ? `Problems are emailed to ${channels.to} and posted to the alert webhook.`
        : channels.email
          ? `Problems are emailed to ${channels.to}. Add ALERT_WEBHOOK_URL (Slack/Discord) so you still hear about it when email itself fails.`
          : 'Nothing can alert you: set RESEND_API_KEY and/or ALERT_WEBHOOK_URL. Problems are still listed below.',
      meta: [{ label: 'Open problems', value: openProblems }],
    },
    {
      id: 'uptime',
      label: 'Uptime check',
      tone: 'warn',
      detail: `Point a free uptime monitor (UptimeRobot, Better Stack…) at ${siteUrl || 'your site URL'}/api/health every 5 minutes. A site that is down cannot alert you itself.`,
    },
  ];
}

async function getProblems(): Promise<Problem[]> {
  const events = await prisma.errorEvent.findMany({
    where: { resolvedAt: null },
    orderBy: { lastSeenAt: 'desc' },
    take: 30,
  });
  return events.map((event) => ({
    id: event.id,
    source: event.source,
    message: event.message,
    detail: event.detail,
    path: event.path,
    count: event.count,
    firstSeen: formatDateTime(event.firstSeenAt, 'en'),
    lastSeen: formatDateTime(event.lastSeenAt, 'en'),
    alerted: event.alertedAt ? formatDateTime(event.alertedAt, 'en') : null,
  }));
}

export default async function AdminSitePage() {
  await requireAdminSession();
  const [health, problems] = await Promise.all([getHealthChecks(), getProblems()]);
  const okCount = health.filter((c) => c.tone === 'ok').length;
  const warnCount = health.filter((c) => c.tone === 'warn').length;
  const badCount = health.filter((c) => c.tone === 'bad').length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Site</h1>
        <p className={styles.pageSubtitle}>
          Read-only snapshot of public site content and configuration.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Health checks</span>
          <span className={styles.cardMeta}>
            {okCount} healthy · {warnCount} warning · {badCount} action needed
          </span>
        </div>

        <div className={pageStyles.healthSummary}>
          {okCount > 0 && (
            <span className={`${pageStyles.summaryPill} ${pageStyles.summaryOk}`}>
              <CheckCircle2 size={13} strokeWidth={2.5} aria-hidden="true" />
              {okCount} healthy
            </span>
          )}
          {warnCount > 0 && (
            <span className={`${pageStyles.summaryPill} ${pageStyles.summaryWarn}`}>
              <AlertTriangle size={13} strokeWidth={2.5} aria-hidden="true" />
              {warnCount} warning{warnCount === 1 ? '' : 's'}
            </span>
          )}
          {badCount > 0 && (
            <span className={`${pageStyles.summaryPill} ${pageStyles.summaryBad}`}>
              <XCircle size={13} strokeWidth={2.5} aria-hidden="true" />
              {badCount} need{badCount === 1 ? 's' : ''} attention
            </span>
          )}
        </div>

        <div className={pageStyles.healthGrid}>
          {health.map((check) => {
            const Icon = ICON_BY_ID[check.id as keyof typeof ICON_BY_ID] ?? Activity;
            return (
              <article
                key={check.id}
                className={`${pageStyles.healthCard} ${CARD_CLASS[check.tone]}`}
              >
                <div className={pageStyles.healthCardHeader}>
                  <div className={pageStyles.healthIdentity}>
                    <span className={pageStyles.healthIcon}>
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <h3 className={pageStyles.healthLabel}>{check.label}</h3>
                  </div>
                  <span className={`${pageStyles.healthStatus} ${STATUS_CLASS[check.tone]}`}>
                    <StatusIcon tone={check.tone} />
                    {STATUS_LABEL[check.tone]}
                  </span>
                </div>

                <p className={pageStyles.healthDetail}>{check.detail}</p>

                {check.meta && check.meta.length > 0 && (
                  <div className={pageStyles.healthMeta}>
                    {check.meta.map((item) => (
                      <span key={item.label} className={pageStyles.metaChip}>
                        <strong>{item.value}</strong> {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <ProblemsPanel problems={problems} />

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Content inventory</span>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Featured projects</span>
              <span className={styles.detailValue}>
                {PUBLISHED_PROJECTS.length} —{' '}
                <span className={pageStyles.fileLink}>data/projects.ts</span>
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Strengths</span>
              <span className={styles.detailValue}>
                {STRENGTHS.length} — <span className={pageStyles.fileLink}>data/strengths.ts</span>
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Public pages</span>
              <span className={styles.detailValue}>/, /projects/[slug] and /work-with-me</span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Project intake survey</span>
              <span className={styles.detailValue}>
                <span className={pageStyles.fileLink}>
                  app/components/ProjectIntakeSurvey.tsx
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Strengths</span>
          </div>
          <div className={styles.chipList}>
            {STRENGTHS.map((item) => (
              <span key={item.id} className={styles.chip} title={item.proof}>
                {item.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Contact channels</span>
        </div>
        <div className={pageStyles.contactList}>
          <div className={pageStyles.contactRow}>
            <span>Email</span>
            <span>{PERSON.email}</span>
          </div>
          <div className={pageStyles.contactRow}>
            <span>Phone / WhatsApp</span>
            <span>{PERSON.telephone}</span>
          </div>
          <div className={pageStyles.contactRow}>
            <span>Location</span>
            <span>
              {PERSON.addressLocality}, {PERSON.addressCountry}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
