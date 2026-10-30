import { NextResponse } from 'next/server';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { presentActivity } from '../../../../../lib/portal/present';
import { getProjectActivity } from '../../../../../lib/portal/queries';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;

  const activity = await getProjectActivity(auth.project.id, { clientView: true });
  return NextResponse.json({ activity: presentActivity(activity) });
}
