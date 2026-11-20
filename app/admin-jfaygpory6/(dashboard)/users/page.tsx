import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireAdminSession } from '../../../lib/session';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  INACTIVE_DAYS,
  listUsers,
  userSummary,
  type ProjectCounts,
  type UserFilters,
} from '../../../lib/portal/users';
import EmptyState from '../../_components/EmptyState';
import KpiCard from '../../_components/KpiCard';
import { LoadingRegion, TableSkeleton, type SkeletonColumn } from '../../_components/Skeleton';
import styles from '../../admin.module.css';
import AccountBadge from './AccountBadge';
import { LANGUAGE_LABELS, formatDay, timeAgo } from './format';
import pageStyles from './users.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Users' };

const ADMIN = '/admin-jfaygpory6';

const SKELETON_COLUMNS: SkeletonColumn[] = [
  { label: 'User', width: 12 },
  { label: 'Status', width: 5, badge: true },
  { label: 'Projects', width: 7 },
  { label: 'Last login', width: 6 },
  { label: 'Language', width: 4 },
  { label: 'Added', width: 6 },
];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UserFilters> }) {
  await requireAdminSession();
  const params = await searchParams;
  const filtered = Boolean(params.q || (params.status && params.status !== 'all') || params.locale || params.inactive);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Users</h1>
        <p className={styles.pageSubtitle}>Everyone with a portal account or an invitation to one.</p>
      </div>

      <Suspense fallback={null}>
        <Summary />
      </Suspense>

      <form className={styles.filtersBar} method="get">
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="q">
            Search
          </label>
          <input id="q" name="q" className={styles.input} placeholder="Name or email" defaultValue={params.q ?? ''} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className={styles.select} defaultValue={params.status ?? 'all'}>
            <option value="all">All statuses</option>
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ACCOUNT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="locale">
            Language
          </label>
          <select id="locale" name="locale" className={styles.select} defaultValue={params.locale ?? ''}>
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
        <label className={pageStyles.checkField}>
          <input type="checkbox" name="inactive" value="1" defaultChecked={params.inactive === '1'} />
          No login in {INACTIVE_DAYS}+ days
        </label>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
          Apply
        </button>
        {filtered && (
          <Link href={`${ADMIN}/users`} className={`${styles.button} ${styles.buttonSecondary}`}>
            Clear
          </Link>
        )}
      </form>

      {/* Keyed on the query so filtering shows the skeleton instead of the old list */}
      <Suspense
        key={JSON.stringify(params)}
        fallback={
          <LoadingRegion label="Loading users…" fade={false}>
            <div className={styles.card}>
              <TableSkeleton columns={SKELETON_COLUMNS} rows={5} />
            </div>
          </LoadingRegion>
        }
      >
        <UsersTable params={params} filtered={filtered} />
      </Suspense>
    </div>
  );
}

async function Summary() {
  const summary = await userSummary();
  return (
    <div className={styles.kpiGrid}>
      <KpiCard label="Clients" value={summary.clients} hint="Accounts, invited or active" />
      <KpiCard label="Active" value={summary.active} hint="Accepted their invitation" />
      <KpiCard label="Waiting to join" value={summary.waiting} hint="Invited, not signed up yet" />
      <KpiCard label="Inactive" value={summary.inactive} hint={`Active, no login in ${INACTIVE_DAYS}+ days`} />
    </div>
  );
}

function ProjectsCell({ counts, isAdmin }: { counts: ProjectCounts; isAdmin: boolean }) {
  if (isAdmin) return <>—</>;
  const parts = [
    counts.active && `${counts.active} active`,
    counts.completed && `${counts.completed} completed`,
    counts.archived && `${counts.archived} archived`,
  ].filter(Boolean);
  return parts.length ? <>{parts.join(' · ')}</> : <span className={pageStyles.muted}>None</span>;
}

async function UsersTable({ params, filtered }: { params: UserFilters; filtered: boolean }) {
  const users = await listUsers(params);

  return (
    <div className={styles.card}>
      {users.length === 0 ? (
        <EmptyState
          title={filtered ? 'No users match these filters' : 'No users yet'}
          description={
            filtered
              ? 'Try clearing the filters.'
              : 'Accounts are created when you invite a client to a project.'
          }
        />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Projects</th>
                <th>Last login</th>
                <th>Language</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="User">
                    <Link href={`${ADMIN}/users/${user.id}`} className={pageStyles.nameLink} dir="auto">
                      {user.name || user.email}
                    </Link>
                    {user.name && (
                      <div className={pageStyles.email} dir="ltr">
                        {user.email}
                      </div>
                    )}
                  </td>
                  <td data-label="Status">
                    <AccountBadge status={user.status} />
                  </td>
                  <td data-label="Projects">
                    <ProjectsCell counts={user.projects} isAdmin={user.role === 'admin'} />
                  </td>
                  <td data-label="Last login">
                    {user.lastLoginAt ? (
                      <time dateTime={user.lastLoginAt.toISOString()} title={formatDay(user.lastLoginAt)}>
                        {timeAgo(user.lastLoginAt)}
                      </time>
                    ) : (
                      <span className={pageStyles.muted}>Never</span>
                    )}
                  </td>
                  <td data-label="Language">{LANGUAGE_LABELS[user.locale] ?? user.locale}</td>
                  <td data-label="Added">{formatDay(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
