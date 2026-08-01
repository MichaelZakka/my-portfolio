import {
  getDailySeries,
  getDeviceBreakdown,
  getFunnel,
  getTopPaths,
  getTopReferrers,
  getVisitorCounts,
} from '../../../lib/analyticsServer';
import { prisma } from '../../../lib/db';
import KpiCard from '../../_components/KpiCard';
import EmptyState from '../../_components/EmptyState';
import LineChart from '../../_components/LineChart';
import BarList from '../../_components/BarList';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getUtmSources(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['utmSource'],
    where: { type: 'page_view', createdAt: { gte: since }, utmSource: { not: null } },
    _count: { utmSource: true },
    orderBy: { _count: { utmSource: 'desc' } },
    take: 8,
  });
  return rows
    .filter((r) => r.utmSource)
    .map((r) => ({ label: r.utmSource as string, value: r._count.utmSource }));
}

export default async function AdminVisitorsPage() {
  const [visitorCounts, dailySeries, topPaths, topReferrers, devices, funnel, utmSources] =
    await Promise.all([
      getVisitorCounts(),
      getDailySeries(30),
      getTopPaths(30, 10),
      getTopReferrers(30, 10),
      getDeviceBreakdown(30),
      getFunnel(30),
      getUtmSources(30),
    ]);

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <p className={styles.pageSubtitle}>First-party visitor and funnel data — last 30 days.</p>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard label="Views today" value={visitorCounts.viewsToday} />
        <KpiCard label="Views 7d" value={visitorCounts.viewsLast7} />
        <KpiCard label="Views 30d" value={visitorCounts.viewsLast30} />
        <KpiCard label="Unique visitors 30d" value={visitorCounts.uniqueLast30} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Page views over time</span>
        </div>
        {dailySeries.some((d) => d.views > 0) ? (
          <LineChart data={dailySeries} />
        ) : (
          <EmptyState title="No traffic data yet" />
        )}
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
            <span className={styles.cardTitle}>Devices</span>
          </div>
          <div className={pageStyles.deviceGrid}>
            {(['desktop', 'mobile', 'tablet'] as const).map((device) => (
              <div key={device} className={pageStyles.deviceCard}>
                <div className={pageStyles.deviceValue}>{devices[device]}</div>
                <div className={pageStyles.deviceLabel}>{device}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Referrers</span>
          </div>
          {topReferrers.length === 0 ? (
            <EmptyState title="No referrer data yet" description="Direct traffic only so far." />
          ) : (
            <BarList items={topReferrers.map((r) => ({ label: r.referrer, value: r.views }))} />
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>UTM sources</span>
          </div>
          {utmSources.length === 0 ? (
            <EmptyState title="No campaign traffic yet" description="Add ?utm_source=… to your links to see campaigns here." />
          ) : (
            <BarList items={utmSources} />
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Funnel: Home → Work with me → Survey</span>
        </div>
        <div className={pageStyles.funnel}>
          {funnel.map((stage) => (
            <div key={stage.stage} className={pageStyles.funnelRow}>
              <span className={pageStyles.funnelLabel}>{stage.stage}</span>
              <span className={pageStyles.funnelTrack}>
                <span
                  className={pageStyles.funnelFill}
                  style={{ width: `${Math.max(2, (stage.count / maxFunnel) * 100)}%` }}
                />
              </span>
              <span className={pageStyles.funnelValue}>{stage.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
