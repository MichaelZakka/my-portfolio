import { NextResponse } from 'next/server';
import { unauthorized } from '../../../lib/portal/http';
import { listClientProjects } from '../../../lib/portal/queries';
import { getPortalUser } from '../../../lib/portal/session';

/** The signed-in client's projects — membership is the filter. */
export async function GET() {
  const user = await getPortalUser();
  if (!user) return unauthorized();

  const projects = await listClientProjects(user.id);
  return NextResponse.json({
    projects: projects.map(({ archivedAt, ...project }) => ({ ...project, archived: Boolean(archivedAt) })),
  });
}
