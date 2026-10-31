import { prisma } from '../db';
import { progressPercent } from './constants';

/**
 * Read models shared by portal pages and the portal GET APIs. Client queries
 * apply the visibleToClient filters here, in one place; callers must already
 * have checked membership (see access.ts).
 */

const byOrder = [{ order: 'asc' as const }, { createdAt: 'asc' as const }];

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
      milestones: { select: { status: true } },
    },
  });
  return projects.map(({ milestones, ...project }) => ({
    ...project,
    milestoneCount: milestones.length,
    progress: progressPercent(milestones),
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
        select: { id: true, title: true, description: true, status: true, dueDate: true, completedAt: true },
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
  return { ...project, progress: progressPercent(project.milestones) };
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
          user: { select: { id: true, email: true, name: true, lastLoginAt: true, passwordHash: true } },
        },
      },
      invitations: { orderBy: { createdAt: 'desc' } },
      milestones: { orderBy: byOrder },
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
