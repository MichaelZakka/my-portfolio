import { prisma } from '../db';
import { progressPercent } from './constants';

/**
 * Read models shared by portal pages and the portal GET APIs. Client queries
 * apply the visibleToClient filters here, in one place; callers must already
 * have checked membership (see access.ts).
 */

const byOrder = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

/**
 * What progressPercent() reads per milestone. Task statuses include internal
 * tasks, so callers that return milestones to a client strip `tasks` first.
 */
export const PROGRESS_MILESTONE_SELECT = {
  status: true,
  estimatedDays: true,
  tasks: { select: { status: true } },
} as const;

const reviewerSelect = { select: { name: true, email: true } } as const;

/** A milestone's sign-off rounds, newest first. */
const reviewsSelect = {
  orderBy: { requestedAt: 'desc' as const },
  select: {
    id: true,
    status: true,
    note: true,
    link: true,
    requestedAt: true,
    respondedAt: true,
    response: true,
    emailSent: true,
    emailError: true,
    respondedBy: reviewerSelect,
  },
};

export async function listClientProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      summary: true,
      status: true,
      currentPhase: true,
      estimatedCompletion: true,
      archivedAt: true,
      updatedAt: true,
      milestones: { select: PROGRESS_MILESTONE_SELECT },
      reviews: { where: { status: 'pending' }, select: { id: true } },
    },
  });
  return projects.map(({ milestones, reviews, ...project }) => ({
    ...project,
    milestoneCount: milestones.length,
    progress: progressPercent(milestones),
    awaitingApproval: reviews.length,
  }));
}

export async function getClientProjectDetail(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      summary: true,
      status: true,
      currentPhase: true,
      estimatedCompletion: true,
      startedAt: true,
      completedAt: true,
      archivedAt: true,
      updatedAt: true,
      milestones: {
        orderBy: byOrder,
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          completedAt: true,
          ...PROGRESS_MILESTONE_SELECT,
          reviews: { ...reviewsSelect, where: { status: { not: 'withdrawn' } } },
        },
      },
      tasks: {
        where: { visibleToClient: true },
        orderBy: byOrder,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          milestoneId: true,
          completedAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!project) return null;
  return {
    ...project,
    progress: progressPercent(project.milestones),
    // An allow-list: internal task statuses only feed the progress figure, and
    // email delivery bookkeeping is the admin's business.
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      dueDate: m.dueDate,
      completedAt: m.completedAt,
      reviews: m.reviews.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        link: r.link,
        requestedAt: r.requestedAt,
        respondedAt: r.respondedAt,
        response: r.response,
        respondedBy: r.respondedBy,
      })),
    })),
  };
}

export const MESSAGE_PAGE_SIZE = 100;

/** Newest MESSAGE_PAGE_SIZE messages, returned oldest-first for display. */
export async function getProjectMessages(projectId: string) {
  const messages = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: MESSAGE_PAGE_SIZE,
    select: {
      id: true,
      content: true,
      createdAt: true,
      emailSent: true,
      emailError: true,
      sender: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  return messages.reverse();
}

export async function getProjectFiles(projectId: string, { clientView }: { clientView: boolean }) {
  return prisma.projectFile.findMany({
    where: { projectId, ...(clientView ? { visibleToClient: true } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      fileSize: true,
      mimeType: true,
      visibleToClient: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function getProjectActivity(projectId: string, { clientView }: { clientView: boolean }) {
  return prisma.activity.findMany({
    where: { projectId, ...(clientView ? { visibleToClient: true } : {}) },
    orderBy: { createdAt: 'desc' },
    take: clientView ? 50 : 100,
    select: {
      id: true,
      type: true,
      summary: true,
      meta: true,
      visibleToClient: true,
      createdAt: true,
      actor: { select: { name: true, email: true, role: true } },
    },
  });
}

export async function getAdminProjectDetail(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      request: { select: { id: true, projectTitle: true, clientName: true, clientEmail: true } },
      members: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, email: true, name: true, timeZone: true, lastLoginAt: true, passwordHash: true } },
        },
      },
      invitations: { orderBy: { createdAt: 'desc' } },
      milestones: {
        orderBy: byOrder,
        include: { tasks: { select: { status: true } }, reviews: reviewsSelect },
      },
      tasks: { orderBy: byOrder },
    },
  });
  if (!project) return null;
  return {
    ...project,
    members: project.members.map(({ user: { passwordHash, ...user }, ...member }) => ({
      ...member,
      user: { ...user, activated: Boolean(passwordHash) },
    })),
    progress: progressPercent(project.milestones),
  };
}

/** Display name for a message/file author; the admin row shows as the site owner. */
export function displayName(user: { name: string; email: string }): string {
  return user.name.trim() || user.email;
}
