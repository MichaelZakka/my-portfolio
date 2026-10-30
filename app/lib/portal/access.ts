import type { NextResponse } from 'next/server';
import { prisma } from '../db';
import { getAdminSession } from '../session';
import { SITE_NAME } from '../seo';
import { getPortalUser, type PortalUser } from './session';
import { notFound, forbidden, parseParam, rejectCrossOrigin, unauthorized } from './http';
import { idSchema } from './validation';

/**
 * Server-side authorization for the portal. The proxy only checks that a
 * session cookie is genuine; every page and API route must still go through
 * these helpers, because membership is what grants access to a project.
 */

export type ClientProjectAccess =
  | { status: 'ok'; project: { id: string; name: string; archivedAt: Date | null } }
  | { status: 'not_found' }
  | { status: 'forbidden' };

export async function getClientProjectAccess(
  userId: string,
  projectId: string
): Promise<ClientProjectAccess> {
  if (!idSchema.safeParse(projectId).success) return { status: 'not_found' };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      members: { where: { userId }, select: { id: true } },
    },
  });

  if (!project) return { status: 'not_found' };
  if (project.members.length === 0) return { status: 'forbidden' };
  return {
    status: 'ok',
    project: { id: project.id, name: project.name, archivedAt: project.archivedAt },
  };
}

type Denied = { ok: false; response: NextResponse };

export type ClientProjectContext = {
  ok: true;
  user: PortalUser;
  project: { id: string; name: string; archivedAt: Date | null };
};

/** 401 without a valid session, 404 for unknown projects, 403 for projects the client is not a member of. */
export async function authorizeClientProject(
  request: Request,
  projectIdParam: string,
  { mutation = false } = {}
): Promise<ClientProjectContext | Denied> {
  if (mutation) {
    const crossOrigin = rejectCrossOrigin(request);
    if (crossOrigin) return { ok: false, response: crossOrigin };
  }

  const user = await getPortalUser();
  if (!user) return { ok: false, response: unauthorized() };

  const access = await getClientProjectAccess(user.id, projectIdParam);
  if (access.status === 'not_found') return { ok: false, response: notFound('Project not found.') };
  if (access.status === 'forbidden') return { ok: false, response: forbidden() };

  return { ok: true, user, project: access.project };
}

export type AdminProjectContext = {
  ok: true;
  project: { id: string; name: string; status: string; archivedAt: Date | null };
};

/**
 * Admin routes are already behind the proxy's admin gate; this repeats the
 * session check on the server (defence in depth) and loads the project.
 */
export async function authorizeAdmin(
  request: Request,
  { mutation = false } = {}
): Promise<{ ok: true } | Denied> {
  if (mutation) {
    const crossOrigin = rejectCrossOrigin(request);
    if (crossOrigin) return { ok: false, response: crossOrigin };
  }
  const session = await getAdminSession();
  if (!session) return { ok: false, response: unauthorized() };
  return { ok: true };
}

export async function authorizeAdminProject(
  request: Request,
  projectIdParam: string,
  { mutation = false } = {}
): Promise<AdminProjectContext | Denied> {
  const admin = await authorizeAdmin(request, { mutation });
  if (!admin.ok) return admin;

  const id = parseParam(idSchema, projectIdParam);
  if (!id.ok) return id;

  const project = await prisma.project.findUnique({
    where: { id: id.data },
    select: { id: true, name: true, status: true, archivedAt: true },
  });
  if (!project) return { ok: false, response: notFound('Project not found.') };
  return { ok: true, project };
}

/**
 * The admin signs in with env credentials, but messages, uploads and activity
 * need a User row as their author. This returns (creating on first use) the
 * role "admin" user for ADMIN_EMAIL. It never has a password, so it can never
 * sign in to the portal.
 */
export async function getAdminActor() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('ADMIN_EMAIL is not configured.');

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: SITE_NAME, role: 'admin', emailVerifiedAt: new Date() },
  });
  if (user.role !== 'admin') {
    throw new Error(`The ADMIN_EMAIL address is registered as a ${user.role} account.`);
  }
  return user;
}

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();
}
