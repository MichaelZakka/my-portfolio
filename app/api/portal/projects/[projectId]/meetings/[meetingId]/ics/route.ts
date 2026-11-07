import { authorizeClientProject } from '../../../../../../../lib/portal/access';
import { meetingIcsResponse } from '../../../../../../../lib/portal/calendar';
import { portalUrl } from '../../../../../../../lib/portal/email';
import { parseParam } from '../../../../../../../lib/portal/http';
import { idSchema } from '../../../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string; meetingId: string }> };

/** "Add to calendar": the meeting as an .ics file for project members. */
export async function GET(request: Request, { params }: RouteParams) {
  const { projectId, meetingId } = await params;
  const auth = await authorizeClientProject(request, projectId);
  if (!auth.ok) return auth.response;
  const id = parseParam(idSchema, meetingId);
  if (!id.ok) return id.response;

  return meetingIcsResponse({
    projectId: auth.project.id,
    projectName: auth.project.name,
    meetingId: id.data,
    url: portalUrl(`/portal/projects/${auth.project.id}?tab=meetings`),
  });
}
