import { authorizeAdminProject } from '../../../../../../../lib/portal/access';
import { meetingIcsResponse } from '../../../../../../../lib/portal/calendar';
import { portalUrl } from '../../../../../../../lib/portal/email';
import { parseParam } from '../../../../../../../lib/portal/http';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/** "Add to calendar" on the admin screen (and in the client preview). */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeAdminProject(request, projectId);
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, meetingId);
  if (!id.ok) return id.response;

  return meetingIcsResponse({
    projectId: auth.project.id,
    projectName: auth.project.name,
    meetingId: id.data,
    url: portalUrl(`/admin-jfaygpory6/projects/${auth.project.id}?tab=meetings`),
  });
}
