import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, fromJsonArray, type LeadStatus } from '../../../lib/leads';
import { PROJECT_TYPE_LABELS } from '../../../lib/projectBrief';
import StatusBadge from '../../_components/StatusBadge';
import EmptyState from '../../_components/EmptyState';
import styles from '../../admin.module.css';
import pageStyles from './page.module.css';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

type SearchParams = {
  status?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
};

function buildWhere(params: SearchParams): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }

  if (params.type && params.type !== 'all') {
    where.projectTypes = { contains: `"${params.type}"` };
  }

  if (params.from || params.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (params.from) createdAt.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { projectTitle: { contains: q } },
      { projectDescription: { contains: q } },
      { clientName: { contains: q } },
      { clientEmail: { contains: q } },
      { company: { contains: q } },
      { budget: { contains: q } },
      { timeline: { contains: q } },
    ];
  }

  return where;
}

function formatProjectTypes(raw: string): string {
  const types = fromJsonArray(raw);
  if (types.length === 0) return '—';
  return types.map((id) => PROJECT_TYPE_LABELS[id] ?? id).join(', ');
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const where = buildWhere(params);
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (overrides: Partial<SearchParams>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && value !== 'all') next.set(key, value);
    });
    return `?${next.toString()}`;
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Requests</h1>
        <p className={styles.pageSubtitle}>
          {total} project brief{total === 1 ? '' : 's'} received
        </p>
      </div>

      <form className={styles.filtersBar} method="get">
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            className={styles.input}
            placeholder="Title, name, email, budget…"
            defaultValue={params.q ?? ''}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className={styles.select} defaultValue={params.status ?? 'all'}>
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status as LeadStatus]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="type">
            Project type
          </label>
          <select id="type" name="type" className={styles.select} defaultValue={params.type ?? 'all'}>
            <option value="all">All types</option>
            {Object.entries(PROJECT_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            className={styles.input}
            defaultValue={params.from ?? ''}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            className={styles.input}
            defaultValue={params.to ?? ''}
          />
        </div>
        <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
          Apply
        </button>
        {(params.q || params.status || params.type || params.from || params.to) && (
          <Link href="/admin/requests" className={`${styles.button} ${styles.buttonSecondary}`}>
            Clear
          </Link>
        )}
      </form>

      <div className={styles.card}>
        {leads.length === 0 ? (
          <EmptyState
            title="No requests match these filters"
            description="Try clearing filters, or wait for new submissions from the Work with me survey."
          />
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/admin/requests/${lead.id}`} className={pageStyles.titleLink}>
                        {lead.projectTitle || '(untitled)'}
                      </Link>
                    </td>
                    <td>
                      {lead.clientName}
                      <div className={pageStyles.emailCell}>{lead.clientEmail}</div>
                    </td>
                    <td>{formatProjectTypes(lead.projectTypes)}</td>
                    <td>{lead.budget || '—'}</td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={pageStyles.pagination}>
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className={pageStyles.pageLinks}>
                  <Link
                    href={buildQuery({ page: String(Math.max(1, page - 1)) })}
                    className={`${pageStyles.pageLink} ${page <= 1 ? pageStyles.pageLinkDisabled : ''}`}
                  >
                    ← Prev
                  </Link>
                  <Link
                    href={buildQuery({ page: String(Math.min(totalPages, page + 1)) })}
                    className={`${pageStyles.pageLink} ${page >= totalPages ? pageStyles.pageLinkDisabled : ''}`}
                  >
                    Next →
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
