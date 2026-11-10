import type { ReactNode } from 'react';
import {
  BADGE_HEIGHT,
  BackLinkSkeleton,
  BarListSkeleton,
  Bone,
  ButtonSkeleton,
  CardSkeleton,
  ChartSkeleton,
  DetailGridSkeleton,
  FiltersSkeleton,
  FormSkeleton,
  KpiGridSkeleton,
  LinesSkeleton,
  LoadingRegion,
  PageHeaderSkeleton,
  TabsSkeleton,
  vary,
} from './Skeleton';
import styles from '../admin.module.css';
import overviewStyles from '../(dashboard)/page.module.css';
import requestStyles from '../(dashboard)/requests/[id]/page.module.css';
import projectStyles from '../(dashboard)/projects/projects.module.css';
import analyticsStyles from '../(dashboard)/visitors/page.module.css';
import siteStyles from '../(dashboard)/site/page.module.css';
import contentStyles from '../(dashboard)/content/content.module.css';
import RequestsTableSkeleton from '../(dashboard)/requests/RequestsTableSkeleton';
import ProjectsTableSkeleton from '../(dashboard)/projects/ProjectsTableSkeleton';

/**
 * The shimmer skeleton for each dashboard screen, picked by path. Each mirrors
 * its page's layout (same classes), so nothing jumps when the data arrives.
 * When a page's layout changes, update its skeleton here.
 */
export default function ScreenSkeleton({ path }: { path: string }) {
  const [, section, id, sub] = path.split('/').filter(Boolean); // ['admin', section, id, sub]
  const { label, screen } = pick(section, id, sub);
  return <LoadingRegion label={label}>{screen}</LoadingRegion>;
}

function pick(section?: string, id?: string, sub?: string): { label: string; screen: ReactNode } {
  switch (section) {
    case undefined:
      return { label: 'Loading the overview…', screen: <OverviewSkeleton /> };
    case 'requests':
      return id
        ? { label: 'Loading the request…', screen: <RequestSkeleton /> }
        : { label: 'Loading requests…', screen: <RequestsSkeleton /> };
    case 'projects':
      if (id === 'new') return { label: 'Loading…', screen: <NewProjectSkeleton /> };
      return id
        ? { label: 'Loading the project…', screen: <ProjectSkeleton /> }
        : { label: 'Loading projects…', screen: <ProjectsSkeleton /> };
    case 'proposals':
      return sub === 'preview'
        ? { label: 'Loading the preview…', screen: <ProposalPreviewSkeleton /> }
        : { label: 'Loading the proposal…', screen: <ProposalSkeleton /> };
    case 'visitors':
      return { label: 'Loading analytics…', screen: <AnalyticsSkeleton /> };
    case 'site':
      return { label: 'Loading site status…', screen: <SiteSkeleton /> };
    case 'content':
      return { label: 'Loading content…', screen: <ContentSkeleton /> };
    default:
      return {
        label: 'Loading…',
        screen: (
          <>
            <PageHeaderSkeleton />
            <CardSkeleton>
              <LinesSkeleton lines={4} />
            </CardSkeleton>
          </>
        ),
      };
  }
}

function OverviewSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Overview" />
      <KpiGridSkeleton count={6} />

      <div className={styles.grid2}>
        <CardSkeleton title="11em" meta="12em">
          <div className={overviewStyles.legend}>
            <span className={overviewStyles.legendItem}>
              <Bone width="6em" />
            </span>
            <span className={overviewStyles.legendItem}>
              <Bone width="7.5em" />
            </span>
          </div>
          <ChartSkeleton />
        </CardSkeleton>
        <CardSkeleton title="9em">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={overviewStyles.statusRow}>
              <Bone round width={vary(6, i)} height={BADGE_HEIGHT} />
              <Bone width="1em" />
            </div>
          ))}
        </CardSkeleton>
      </div>

      <div className={styles.grid2}>
        <CardSkeleton title="9em" meta="4.5em">
          <div className={overviewStyles.recentList}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={overviewStyles.recentRow}>
                <div className={overviewStyles.recentInfo}>
                  <div className={overviewStyles.recentTitle}>
                    <Bone width={vary(14, i)} />
                  </div>
                  <div className={overviewStyles.recentMeta}>
                    <Bone width={vary(11, i + 2)} />
                  </div>
                </div>
                <Bone round width="5.5em" height={BADGE_HEIGHT} />
              </div>
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton title="6em">
          <BarListSkeleton rows={4} />
        </CardSkeleton>
      </div>

      <div className={styles.grid2}>
        <CardSkeleton title="6em">
          <BarListSkeleton rows={6} />
        </CardSkeleton>
        <CardSkeleton title="7em">
          <BarListSkeleton rows={4} />
        </CardSkeleton>
      </div>
    </>
  );
}

function RequestsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Requests" />
      <FiltersSkeleton fields={['14rem', '9.5rem', '9.5rem', '9rem', '9rem']} />
      <RequestsTableSkeleton />
    </>
  );
}

function RequestSkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <div className={requestStyles.headerRow}>
        <div>
          <div className={styles.pageTitle}>
            <Bone width="13em" />
          </div>
          <p className={styles.pageSubtitle}>
            <Bone width="18em" />
          </p>
        </div>
        <Bone round width="5.5rem" height={BADGE_HEIGHT} />
      </div>

      <div className={styles.grid2} style={{ marginTop: '1.5rem' }}>
        <div>
          <CardSkeleton title="9em">
            <DetailGridSkeleton fields={2} />
            <div style={{ marginTop: '1rem' }}>
              <LinesSkeleton lines={4} />
            </div>
          </CardSkeleton>
          <CardSkeleton title="4em">
            <DetailGridSkeleton fields={4} />
          </CardSkeleton>
          <CardSkeleton title="11em">
            <DetailGridSkeleton fields={2} />
          </CardSkeleton>
        </div>
        <div>
          <CardSkeleton title="6em">
            <LinesSkeleton lines={2} />
            <div style={{ marginTop: '1rem' }}>
              <ButtonSkeleton width="9rem" />
            </div>
          </CardSkeleton>
          <CardSkeleton title="8em">
            <LinesSkeleton lines={2} />
          </CardSkeleton>
          <CardSkeleton title="5em">
            <FormSkeleton fields={2} multiline={1} />
            <ButtonSkeleton />
          </CardSkeleton>
        </div>
      </div>
    </>
  );
}

function ProjectsSkeleton() {
  return (
    <>
      <div className={projectStyles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Projects</h1>
          <p className={styles.pageSubtitle}>
            <Bone width="20em" />
          </p>
        </div>
        <ButtonSkeleton width="8.5rem" />
      </div>
      <div className={projectStyles.viewSwitch}>
        <ButtonSkeleton width="4.6rem" />
        <ButtonSkeleton width="5.6rem" />
        <ButtonSkeleton width="3.4rem" />
      </div>
      <ProjectsTableSkeleton />
    </>
  );
}

function NewProjectSkeleton() {
  return (
    <>
      <PageHeaderSkeleton back />
      <div className={styles.card}>
        <FormSkeleton fields={5} multiline={1} />
        <ButtonSkeleton width="9rem" />
      </div>
    </>
  );
}

/** The project screen opens on its Overview tab, so that is the shape shown. */
function ProjectSkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <div className={projectStyles.headerRow}>
        <div>
          <div className={projectStyles.titleRow}>
            <div className={styles.pageTitle} style={{ marginBottom: 0 }}>
              <Bone width="11em" />
            </div>
            <Bone round width="5.5rem" height={BADGE_HEIGHT} />
          </div>
          <p className={styles.pageSubtitle} style={{ marginTop: '0.4rem' }}>
            <Bone width="22em" />
          </p>
        </div>
        <ButtonSkeleton width="9rem" />
      </div>

      <TabsSkeleton
        className={projectStyles.tabList}
        widths={['4.5em', '5.5em', '5em', '5em', '2.5em', '3.5em', '4em', '4em']}
      />

      <div className={projectStyles.statGrid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={projectStyles.stat}>
            <span className={projectStyles.statLabel}>
              <Bone width={vary(6, i)} />
            </span>
            <span className={projectStyles.statValue}>
              <Bone width={vary(7, i + 2)} />
            </span>
          </div>
        ))}
      </div>

      <div className={projectStyles.overviewGrid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${styles.card} ${projectStyles.summaryCard}`}>
            <div className={projectStyles.summaryHeading}>
              <Bone block width={28} height={28} style={{ borderRadius: 8, flexShrink: 0 }} />
              <Bone width={vary(9, i)} />
            </div>
            <LinesSkeleton lines={2} />
          </div>
        ))}
      </div>
    </>
  );
}

function ProposalSkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <div className={projectStyles.headerRow}>
        <div>
          <div className={projectStyles.titleRow}>
            <div className={styles.pageTitle}>
              <Bone width="12em" />
            </div>
            <Bone round width="4.5rem" height={BADGE_HEIGHT} />
          </div>
          <p className={styles.pageSubtitle}>
            <Bone width="20em" />
          </p>
        </div>
      </div>
      <CardSkeleton title="5em">
        <FormSkeleton fields={3} multiline={2} />
      </CardSkeleton>
      <CardSkeleton title="4.5em">
        <FormSkeleton fields={2} />
      </CardSkeleton>
      <CardSkeleton title="8em">
        <FormSkeleton fields={2} />
      </CardSkeleton>
    </>
  );
}

function ProposalPreviewSkeleton() {
  return (
    <>
      <BackLinkSkeleton />
      <Bone block height="3.4rem" style={{ borderRadius: 8, marginBottom: '1rem' }} />
      <div className={styles.card} style={{ display: 'grid', gap: '1.75rem' }}>
        <div style={{ fontSize: '1.6rem' }}>
          <Bone width="12em" />
          <div style={{ fontSize: '0.9rem' }}>
            <Bone width="16em" />
          </div>
        </div>
        {['7em', '9em', '6em'].map((width) => (
          <div key={width}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              <Bone width={width} />
            </div>
            <LinesSkeleton lines={3} />
          </div>
        ))}
      </div>
    </>
  );
}

const FUNNEL_FILL = [100, 46, 12];

function AnalyticsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Analytics" />
      <KpiGridSkeleton count={4} hint={false} />

      <CardSkeleton title="11em">
        <ChartSkeleton />
      </CardSkeleton>

      <div className={styles.grid2}>
        <CardSkeleton title="6em">
          <BarListSkeleton rows={6} />
        </CardSkeleton>
        <CardSkeleton title="4.5em">
          <div className={analyticsStyles.deviceGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={analyticsStyles.deviceCard}>
                <div className={analyticsStyles.deviceValue}>
                  <Bone width={vary(1.8, i)} />
                </div>
                <div className={analyticsStyles.deviceLabel}>
                  <Bone width={vary(5, i + 1)} />
                </div>
              </div>
            ))}
          </div>
        </CardSkeleton>
      </div>

      <div className={styles.grid2}>
        <CardSkeleton title="6em">
          <BarListSkeleton rows={5} />
        </CardSkeleton>
        <CardSkeleton title="7em">
          <BarListSkeleton rows={3} />
        </CardSkeleton>
      </div>

      <CardSkeleton title="17em">
        <div className={analyticsStyles.funnel}>
          {FUNNEL_FILL.map((fill, i) => (
            <div key={i} className={analyticsStyles.funnelRow}>
              <span className={analyticsStyles.funnelLabel}>
                <Bone width={vary(8, i)} />
              </span>
              <span className={analyticsStyles.funnelTrack}>
                <Bone block width={`${fill}%`} height="100%" />
              </span>
              <span className={analyticsStyles.funnelValue}>
                <Bone width="1.6em" />
              </span>
            </div>
          ))}
        </div>
      </CardSkeleton>
    </>
  );
}

/** Site: the health checks (database, email, uptime…) can take a moment. */
function SiteSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Site" />

      <CardSkeleton title="8em" meta="13em">
        <div className={siteStyles.healthSummary}>
          {['5em', '5.5em', '4.5em'].map((width) => (
            <Bone key={width} round width={width} height="1.75rem" />
          ))}
        </div>
        <div className={siteStyles.healthGrid}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={siteStyles.healthCard}>
              <div className={siteStyles.healthCardHeader}>
                <div className={siteStyles.healthIdentity}>
                  <Bone block width={34} height={34} style={{ borderRadius: 8, flexShrink: 0 }} />
                  <span className={siteStyles.healthLabel}>
                    <Bone width={vary(9, i)} />
                  </span>
                </div>
                <Bone round width="4.5em" height={BADGE_HEIGHT} />
              </div>
              <div className={siteStyles.healthDetail}>
                <LinesSkeleton lines={2} />
              </div>
            </div>
          ))}
        </div>
      </CardSkeleton>

      <CardSkeleton title="7em" meta="9em">
        <LinesSkeleton lines={2} />
      </CardSkeleton>

      <div className={styles.grid2}>
        <CardSkeleton title="10em">
          <DetailGridSkeleton fields={4} />
        </CardSkeleton>
        <CardSkeleton title="6em">
          <div className={styles.chipList}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Bone key={i} round width={vary(7, i)} height="1.6rem" />
            ))}
          </div>
        </CardSkeleton>
      </div>

      <CardSkeleton title="10em">
        <div className={siteStyles.contactList}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={siteStyles.contactRow}>
              <Bone width={vary(5, i)} />
              <Bone width={vary(13, i + 1)} />
            </div>
          ))}
        </div>
      </CardSkeleton>
    </>
  );
}

/** Content editors: the area's header and sub-navigation, then form blocks. */
function ContentSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Content" />
      <div className={contentStyles.subnav} aria-hidden="true">
        {['4.5em', '7.5em', '6em', '8em', '5.5em', '5em', '3em', '6.5em'].map((width) => (
          <span key={width} className={contentStyles.subnavLink}>
            <Bone width={width} />
          </span>
        ))}
      </div>
      <CardSkeleton title="9em">
        <FormSkeleton fields={3} multiline={2} />
      </CardSkeleton>
      <CardSkeleton title="7em">
        <FormSkeleton fields={2} />
      </CardSkeleton>
    </>
  );
}
