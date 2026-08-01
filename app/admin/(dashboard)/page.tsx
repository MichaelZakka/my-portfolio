import Link from 'next/link';
import { prisma } from '../../lib/db';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../../lib/leads';
import {
  getCtaBreakdown,
  getDailySeries,
  getConversionRate,
  getTopPaths,
  getTopReferrers,
  getVisitorCounts,
} from '../../lib/analyticsServer';
import KpiCard from '../_components/KpiCard';
import StatusBadge from '../_components/StatusBadge';
import EmptyState from '../_components/EmptyState';
import LineChart from '../_components/LineChart';
import BarList from '../_components/BarList';
import styles from '../admin.module.css';
import pageStyles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getData() {
  const [
    visitorCounts,
    dailySeries,
    conversionRate,
    topPaths,
    topReferrers,
    ctaBreakdown,
    totalLeads,
    leadsToday,
    statusCounts,
    recentLeads,
  ] = await Promise.all([
    getVisitorCounts(),
    getDailySeries(30),
    getConversionRate(30),
    getTopPaths(30, 6),
    getTopReferrers(30, 6),
    getCtaBreakdown(30),
    prisma.lead.count(),
    prisma.lead.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.lead.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);

  return {
    visitorCounts,
    dailySeries,
    conversionRate,
    topPaths,
    topReferrers,
    ctaBreakdown,
    totalLeads,
    leadsToday,
    statusCounts,
    recentLeads,
  };
}

export default async function AdminOverviewPage() {
  const {
    visitorCounts,
    dailySeries,
    conversionRate,
    topPaths,
    topReferrers,
    ctaBreakdown,
    totalLeads,
    leadsToday,
    statusCounts,
    recentLeads,
  } = await getData();

  const statusMap = new Map(statusCounts.map((s) => [s.status, s._count.status]));

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Overview</h1>
        <p className={styles.pageSubtitle}>Business activity across the last 30 days.</p>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard
          label="Visitors today"
          value={visitorCounts.viewsToday}
          hint={`${visitorCounts.uniqueToday} unique`}
        />
        <KpiCard
          label="Visitors 7d"
          value={visitorCounts.viewsLast7}
          hint={`${visitorCounts.uniqueLast7} unique`}
        />
        <KpiCard
          label="Visitors 30d"
          value={visitorCounts.viewsLast30}
          hint={`${visitorCounts.uniqueLast30} unique`}
        />
        <KpiCard label="Total requests" value={totalLeads} hint={`${leadsToday} today`} />
        <KpiCard
          label="New requests"
          value={statusMap.get('new') ?? 0}
          hint="Awaiting first reply"
        />
        <KpiCard
          label="Conversion rate"
          value={`${conversionRate.toFixed(1)}%`}
          hint="Survey submits / work-with-me visits"
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Traffic — last 30 days</span>
            <span className={styles.cardMeta}>Page views &amp; unique visitors</span>
          </div>
          <div className={pageStyles.legend}>
            <span className={pageStyles.legendItem}>
              <span className={pageStyles.legendDot} style={{ background: '#dc2626' }} />
              Page views
            </span>
            <span className={pageStyles.legendItem}>
              <span className={pageStyles.legendDot} style={{ background: '#4a90ff' }} />
              Unique visitors
            </span>
          </div>
          {dailySeries.some((d) => d.views > 0) ? (
            <LineChart data={dailySeries} />
          ) : (
            <EmptyState
              title="No traffic yet"
              description="Page view data will appear here once visitors start browsing the site."
            />
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Requests by status</span>
          </div>
          {statusCounts.length === 0 ? (
            <EmptyState title="No requests yet" />
          ) : (
            (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((status) => (
              <div key={status} className={pageStyles.statusRow}>
                <StatusBadge status={status} />
                <span>{statusMap.get(status) ?? 0}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Recent requests</span>
            <Link href="/admin/requests" className={styles.link}>
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Submissions from the Work with me survey will show up here."
            />
          ) : (
            <div className={pageStyles.recentList}>
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/requests/${lead.id}`}
                  className={pageStyles.recentRow}
                >
                  <div className={pageStyles.recentInfo}>
                    <div className={pageStyles.recentTitle}>
                      {lead.projectTitle || lead.clientName}
                    </div>
                    <div className={pageStyles.recentMeta}>
                      {lead.clientName} · {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>CTA clicks</span>
          </div>
          {ctaBreakdown.length === 0 ? (
            <EmptyState title="No CTA clicks yet" />
          ) : (
            <BarList items={ctaBreakdown.map((c) => ({ label: c.label, value: c.clicks }))} />
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Top pages</span>
          </div>
          {topPaths.length === 0 ? (
            <EmptyState title="No page views yet" />
          ) : (
            <BarList items={topPaths.map((p) => ({ label: p.path, value: p.views }))} />
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Top referrers</span>
          </div>
          {topReferrers.length === 0 ? (
            <EmptyState title="No referrer data yet" description="Direct traffic only so far." />
          ) : (
            <BarList
              items={topReferrers.map((r) => ({ label: r.referrer, value: r.views }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
