import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { formatDateTime } from '../../../../lib/portal/format';
import { getUserDetail, type UserDetail } from '../../../../lib/portal/users';
import { idSchema } from '../../../../lib/portal/validation';
import { requireAdminSession } from '../../../../lib/session';
import { ArchivedBadge, ProjectStatusBadge } from '../../../_components/ProjectBadges';
import StatusBadge from '../../../_components/StatusBadge';
import styles from '../../../admin.module.css';
import AccountBadge from '../AccountBadge';
import { LANGUAGE_LABELS, formatDay, timeAgo } from '../format';
import pageStyles from '../users.module.css';
import { InvitationList, SignOutButton } from './UserActions';

export const dynamic = 'force-dynamic';

const ADMIN = '/admin-jfaygpory6';

type Params = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireAdminSession();
  const { userId } = await params;
  if (!idSchema.safeParse(userId).success) return { title: 'User' };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  return { title: user ? `User: ${user.name || user.email}` : 'User' };
}

export default async function AdminUserPage({ params }: Params) {
  await requireAdminSession();
  const { userId } = await params;
  if (!idSchema.safeParse(userId).success) notFound();
  const user = await getUserDetail(userId);
  if (!user) notFound();

  const isAdmin = user.role === 'admin';
  const label = user.name || user.email;

  return (
    <div>
      <Link href={`${ADMIN}/users`} className={pageStyles.backLink}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        All users
      </Link>

      <div className={pageStyles.headerRow}>
        <div>
          <div className={pageStyles.titleRow}>
            <h1 className={styles.pageTitle} dir="auto">
              {label}
            </h1>
            <AccountBadge status={user.status} />
          </div>
          <p className={styles.pageSubtitle}>
            <a href={`mailto:${user.email}`} className={styles.link} dir="ltr">
              {user.email}
            </a>
          </p>
        </div>
        {!isAdmin && user.status === 'active' && <SignOutButton userId={user.id} label={label} />}
      </div>

      {isAdmin && (
        <p className={styles.banner}>
          This is your own account: it authors your messages, files and activity in the portal. You sign in to the
          admin with your environment credentials, so it has no portal login.
        </p>
      )}

      <div className={pageStyles.stack}>
        <Profile user={user} />
        {!isAdmin && (
          <>
            <Engagement user={user} />
            <Projects user={user} />
            {user.invitations.length > 0 && <Invitations user={user} />}
            {user.requests.length > 0 && <Requests user={user} />}
            {user.reviews.length > 0 && <Reviews user={user} />}
          </>
        )}
        <RecentActivity user={user} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.detailField}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{children}</span>
    </div>
  );
}

const muted = (text: string) => <span className={pageStyles.muted}>{text}</span>;

function Profile({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <div className={styles.cardHeader}>
        <h2 id="profile-title" className={styles.cardTitle}>
          Profile
        </h2>
      </div>
      <div className={styles.detailGrid}>
        <Field label="Name">{user.name ? <span dir="auto">{user.name}</span> : muted('Not given')}</Field>
        <Field label="Email">
          <span dir="ltr">{user.email}</span>
          {user.emailVerifiedAt ? '' : <span className={pageStyles.muted}> · not verified</span>}
        </Field>
        <Field label="Language">{LANGUAGE_LABELS[user.locale] ?? user.locale}</Field>
        <Field label="Time zone">{user.timeZone ?? muted('Not detected yet')}</Field>
        {user.company && <Field label="Company">{user.company}</Field>}
        {user.phone && (
          <Field label="Phone">
            <a href={`tel:${user.phone}`} className={styles.link} dir="ltr">
              {user.phone}
            </a>
          </Field>
        )}
        <Field label="Added">{formatDay(user.createdAt)}</Field>
        <Field label="Last login">
          {user.lastLoginAt ? (
            <time dateTime={user.lastLoginAt.toISOString()} title={formatDateTime(user.lastLoginAt, 'en')}>
              {timeAgo(user.lastLoginAt)}
            </time>
          ) : (
            muted('Never')
          )}
        </Field>
      </div>
    </section>
  );
}

function Engagement({ user }: { user: UserDetail }) {
  const { messages, lastMessageAt, files, pendingReviews } = user.engagement;
  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Messages sent</div>
        <div className={styles.kpiValue}>{messages}</div>
        <div className={styles.kpiHint}>{lastMessageAt ? `Last ${timeAgo(lastMessageAt)}` : 'None yet'}</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Files uploaded</div>
        <div className={styles.kpiValue}>{files}</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Approvals waiting</div>
        <div className={styles.kpiValue}>{pendingReviews}</div>
        <div className={styles.kpiHint}>Milestones waiting on their projects</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Projects</div>
        <div className={styles.kpiValue}>{user.projects.length}</div>
        <div className={styles.kpiHint}>
          {user.projectCounts.active} active · {user.projectCounts.completed} completed
          {user.projectCounts.archived ? ` · ${user.projectCounts.archived} archived` : ''}
        </div>
      </div>
    </div>
  );
}

function Projects({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="projects-title">
      <div className={styles.cardHeader}>
        <h2 id="projects-title" className={styles.cardTitle}>
          Projects
        </h2>
        <span className={styles.cardMeta}>Projects they can open in the portal</span>
      </div>
      {user.projects.length === 0 ? (
        <p className={pageStyles.muted}>No project access yet.</p>
      ) : (
        <ul className={pageStyles.list}>
          {user.projects.map((project) => (
            <li key={project.id} className={pageStyles.listItem}>
              <div className={pageStyles.listMain}>
                <Link href={`${ADMIN}/projects/${project.id}`} className={styles.link}>
                  {project.name}
                </Link>
                <ProjectStatusBadge status={project.status} />
                {project.archivedAt && <ArchivedBadge />}
                {project.currentPhase && <span className={pageStyles.muted}>{project.currentPhase}</span>}
              </div>
              <span className={pageStyles.time}>Member since {formatDay(project.joinedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Invitations({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="invitations-title">
      <div className={styles.cardHeader}>
        <h2 id="invitations-title" className={styles.cardTitle}>
          Invitations
        </h2>
        <span className={styles.cardMeta}>A resent link replaces the old one and is valid for 7 more days</span>
      </div>
      <InvitationList
        email={user.email}
        invitations={user.invitations.map((invitation) => ({
          id: invitation.id,
          projectId: invitation.projectId,
          projectName: invitation.projectName,
          state: invitation.state,
          lastSent: invitation.lastSentAt ? `Sent ${formatDay(invitation.lastSentAt)}` : 'Not sent',
          expires: formatDay(invitation.expiresAt),
          emailProblem: !invitation.emailSent && Boolean(invitation.emailError),
        }))}
      />
    </section>
  );
}

function Requests({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="requests-title">
      <div className={styles.cardHeader}>
        <h2 id="requests-title" className={styles.cardTitle}>
          Where they came from
        </h2>
        <span className={styles.cardMeta}>Project briefs and signed proposals</span>
      </div>
      <ul className={pageStyles.list}>
        {user.requests.map((request) => {
          const accepted = request.proposals[0];
          return (
            <li key={request.id} className={pageStyles.listItem}>
              <div className={pageStyles.listMain}>
                <Link href={`${ADMIN}/requests/${request.id}`} className={styles.link} dir="auto">
                  {request.projectTitle || '(untitled)'}
                </Link>
                <StatusBadge status={request.status} />
                {accepted && (
                  <Link href={`${ADMIN}/proposals/${accepted.id}`} className={pageStyles.muted}>
                    Proposal v{accepted.version} signed
                    {accepted.signerName ? ` by ${accepted.signerName}` : ''}
                    {accepted.respondedAt ? ` on ${formatDay(accepted.respondedAt)}` : ''}
                  </Link>
                )}
              </div>
              <span className={pageStyles.time}>Sent {formatDay(request.createdAt)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Reviews({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="reviews-title">
      <div className={styles.cardHeader}>
        <h2 id="reviews-title" className={styles.cardTitle}>
          Their reviews
        </h2>
        <span className={styles.cardMeta}>Private: never shown on the site</span>
      </div>
      <ul className={pageStyles.list}>
        {user.reviews.map((review) => (
          <li key={review.id} className={pageStyles.listItem}>
            <div className={pageStyles.listMain}>
              <Link href={`${ADMIN}/reviews#review-${review.id}`} className={styles.link}>
                {review.project.name}
              </Link>
              <span className={pageStyles.muted}>
                {review.overall !== null ? `${review.overall}/5 overall` : 'No overall rating'}
                {review.recommend !== null ? ` · would recommend ${review.recommend}/10` : ''}
              </span>
            </div>
            {review.submittedAt && <span className={pageStyles.time}>{formatDay(review.submittedAt)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentActivity({ user }: { user: UserDetail }) {
  return (
    <section className={styles.card} aria-labelledby="activity-title">
      <div className={styles.cardHeader}>
        <h2 id="activity-title" className={styles.cardTitle}>
          Recent activity
        </h2>
        <span className={styles.cardMeta}>The last 10 things they did, across projects</span>
      </div>
      {user.activity.length === 0 ? (
        <p className={pageStyles.muted}>Nothing yet.</p>
      ) : (
        <ul className={pageStyles.list}>
          {user.activity.map((entry) => (
            <li key={entry.id} className={pageStyles.listItem}>
              <div className={pageStyles.listMain}>
                <span dir="auto">{entry.summary}</span>
                <Link href={`${ADMIN}/projects/${entry.project.id}?tab=activity`} className={pageStyles.muted}>
                  {entry.project.name}
                </Link>
              </div>
              <time className={pageStyles.time} dateTime={entry.createdAt.toISOString()} title={formatDateTime(entry.createdAt, 'en')}>
                {timeAgo(entry.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
