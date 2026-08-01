import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Mail,
  ShieldCheck,
  Globe,
  Activity,
} from 'lucide-react';
import { prisma } from '../../../lib/db';
import { PERSON, SERVICES } from '../../../lib/seo';
import { PROJECTS } from '../../../lib/projectsData';
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

  return [
    {
      id: 'database',
      label: 'Database connection',
      tone: 'ok',
      detail: 'SQLite / Prisma is connected and accepting writes.',
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
  ];
}

export default async function AdminSitePage() {
  const health = await getHealthChecks();
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

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Content inventory</span>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Featured projects</span>
              <span className={styles.detailValue}>
                {PROJECTS.length} —{' '}
                <span className={pageStyles.fileLink}>app/lib/projectsData.ts</span>
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Services offered</span>
              <span className={styles.detailValue}>
                {SERVICES.length} — <span className={pageStyles.fileLink}>app/lib/seo.ts</span>
              </span>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Public pages</span>
              <span className={styles.detailValue}>/ and /work-with-me</span>
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
            <span className={styles.cardTitle}>Services taxonomy</span>
          </div>
          <div className={styles.chipList}>
            {SERVICES.map((service) => (
              <span key={service.name} className={styles.chip} title={service.description}>
                {service.name}
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
