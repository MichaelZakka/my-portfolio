import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { invitationState, type InvitationState } from './constants';

/**
 * The admin's Users screens: who has a portal account, where each one stands
 * (invited, active...), and how engaged they are. Read-only apart from the two
 * support actions (resend an invite, sign out of every device).
 */

/** Where an account stands. Derived, never stored. */
export const ACCOUNT_STATUSES = ['active', 'invited', 'expired', 'no_invite', 'admin'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  invited: 'Invited',
  expired: 'Invite expired',
  no_invite: 'No open invite',
  admin: 'Admin',
};

/** "Inactive" filter: an active account with no sign-in for this long (or never). */
export const INACTIVE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type InvitationLike = { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date };

/**
 * Active once a password is set (the invite was accepted). Before that, the
 * newest open invitation decides: a live link is "invited", only dead ones is
 * "expired", none at all (revoked, or removed from every project) is "no_invite".
 */
export function accountStatus(
  user: { role: string; passwordHash: string | null },
  invitations: InvitationLike[],
  now = new Date()
): AccountStatus {
  if (user.role === 'admin') return 'admin';
  if (user.passwordHash) return 'active';
  const states = invitations.map((invitation) => invitationState(invitation, now));
  if (states.includes('pending')) return 'invited';
  if (states.includes('expired')) return 'expired';
  return 'no_invite';
}

export type ProjectCounts = { active: number; completed: number; archived: number };

function countProjects(projects: { status: string; archivedAt: Date | null }[]): ProjectCounts {
  const counts: ProjectCounts = { active: 0, completed: 0, archived: 0 };
  for (const project of projects) {
    if (project.archivedAt) counts.archived += 1;
    else if (project.status === 'completed') counts.completed += 1;
    else counts.active += 1;
  }
  return counts;
}

export type UserFilters = { q?: string; status?: string; locale?: string; inactive?: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  locale: string;
  status: AccountStatus;
  projects: ProjectCounts;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const isAccountStatus = (value: string | undefined): value is AccountStatus =>
  (ACCOUNT_STATUSES as readonly string[]).includes(value ?? '');

/**
 * Every account matching the filters, admins included (tagged), newest
 * sign-in first. A freelancer's client list is small, so the derived status
 * and inactivity filters run here rather than in SQL.
 */
export async function listUsers(filters: UserFilters, now = new Date()): Promise<UserRow[]> {
  const where: Prisma.UserWhereInput = {};
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (filters.locale === 'en' || filters.locale === 'ar') where.locale = filters.locale;

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ lastLoginAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      locale: true,
      passwordHash: true,
      lastLoginAt: true,
      createdAt: true,
      memberships: { select: { project: { select: { status: true, archivedAt: true } } } },
      invitations: {
        where: { acceptedAt: null, revokedAt: null },
        select: { acceptedAt: true, revokedAt: true, expiresAt: true },
      },
    },
  });

  const status = isAccountStatus(filters.status) ? filters.status : null;
  const inactiveBefore = now.getTime() - INACTIVE_DAYS * DAY_MS;

  return users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locale: user.locale,
      status: accountStatus(user, user.invitations, now),
      projects: countProjects(user.memberships.map((membership) => membership.project)),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }))
    .filter((user) => !status || user.status === status)
    .filter(
      (user) =>
        filters.inactive !== '1' ||
        (user.status === 'active' && (!user.lastLoginAt || user.lastLoginAt.getTime() < inactiveBefore))
    );
}

/** Headline numbers for the list screen (all accounts, before filters). */
export async function userSummary(now = new Date()) {
  const users = await prisma.user.findMany({
    where: { role: 'client' },
    select: {
      role: true,
      passwordHash: true,
      lastLoginAt: true,
      invitations: {
        where: { acceptedAt: null, revokedAt: null },
        select: { acceptedAt: true, revokedAt: true, expiresAt: true },
      },
    },
  });
  const inactiveBefore = now.getTime() - INACTIVE_DAYS * DAY_MS;
  let active = 0;
  let waiting = 0;
  let inactive = 0;
  for (const user of users) {
    const status = accountStatus(user, user.invitations, now);
    if (status === 'active') {
      active += 1;
      if (!user.lastLoginAt || user.lastLoginAt.getTime() < inactiveBefore) inactive += 1;
    } else if (status === 'invited' || status === 'expired') {
      waiting += 1;
    }
  }
  return { clients: users.length, active, waiting, inactive };
}

export type UserInvitation = {
  id: string;
  projectId: string;
  projectName: string;
  state: InvitationState;
  lastSentAt: Date | null;
  expiresAt: Date;
  emailSent: boolean;
  emailError: string | null;
};

/** Everything the user detail screen shows, or null for an unknown id. */
export async function getUserDetail(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      locale: true,
      timeZone: true,
      passwordHash: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      memberships: {
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              status: true,
              currentPhase: true,
              archivedAt: true,
              requestId: true,
            },
          },
        },
      },
      invitations: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          acceptedAt: true,
          revokedAt: true,
          expiresAt: true,
          lastSentAt: true,
          emailSent: true,
          emailError: true,
          project: { select: { id: true, name: true } },
        },
      },
      clientReviews: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          overall: true,
          recommend: true,
          submittedAt: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) return null;

  const projectIds = user.memberships.map((membership) => membership.project.id);
  const requestIds = user.memberships.flatMap((membership) => membership.project.requestId ?? []);

  const [messages, lastMessage, files, pendingReviews, activity, requests] = await Promise.all([
    prisma.message.count({ where: { senderId: user.id } }),
    prisma.message.findFirst({
      where: { senderId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.projectFile.count({ where: { uploadedById: user.id } }),
    // Approvals the admin asked for that are still waiting on this client's projects
    projectIds.length
      ? prisma.milestoneReview.count({
          where: { projectId: { in: projectIds }, status: 'pending', project: { archivedAt: null } },
        })
      : 0,
    prisma.activity.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, summary: true, createdAt: true, project: { select: { id: true, name: true } } },
    }),
    // The briefs they sent: the ones their projects came from, plus any sent under this address
    prisma.lead.findMany({
      where: {
        OR: [
          ...(requestIds.length ? [{ id: { in: requestIds } }] : []),
          { clientEmail: { equals: user.email, mode: 'insensitive' as const } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectTitle: true,
        company: true,
        phone: true,
        status: true,
        createdAt: true,
        proposals: {
          where: { status: 'accepted' },
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, signerName: true, respondedAt: true },
        },
      },
    }),
  ]);

  const openInvitations = user.invitations.filter((invitation) => !invitation.acceptedAt && !invitation.revokedAt);
  const latestRequest = requests.find((request) => request.company || request.phone);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    locale: user.locale,
    timeZone: user.timeZone,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    status: accountStatus(user, openInvitations, now),
    company: latestRequest?.company ?? '',
    phone: latestRequest?.phone ?? '',
    projects: user.memberships.map((membership) => ({ ...membership.project, joinedAt: membership.createdAt })),
    projectCounts: countProjects(user.memberships.map((membership) => membership.project)),
    invitations: user.invitations.map(
      (invitation): UserInvitation => ({
        id: invitation.id,
        projectId: invitation.project.id,
        projectName: invitation.project.name,
        state: invitationState(invitation, now),
        lastSentAt: invitation.lastSentAt,
        expiresAt: invitation.expiresAt,
        emailSent: invitation.emailSent,
        emailError: invitation.emailError,
      })
    ),
    reviews: user.clientReviews,
    engagement: {
      messages,
      lastMessageAt: lastMessage?.createdAt ?? null,
      files,
      pendingReviews,
    },
    activity,
    requests,
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;
