import { NextResponse, after } from 'next/server';
import { rateLimit } from '../../../../../lib/rateLimit';
import { authorizeClientProject } from '../../../../../lib/portal/access';
import { answerCompletion } from '../../../../../lib/portal/completion';
import { apiError, parseJsonBody, rateLimited } from '../../../../../lib/portal/http';
import { getPortalLocale } from '../../../../../lib/portal/locale';
import { notifyAboutCompletionNotYet } from '../../../../../lib/portal/notify';
import { displayName } from '../../../../../lib/portal/queries';
import { completionAnswerSchema } from '../../../../../lib/portal/validation';

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * The client answers "is the project complete?" in the open sign-off round:
 * yes (then the review survey opens), or not yet with what is missing (the
 * admin is emailed). Archived projects still accept it: sign-off comes last.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { projectId } = await params;
  const auth = await authorizeClientProject(request, projectId, { mutation: true });
  if (!auth.ok) return auth.response;
  const { user, project } = auth;

  if (!rateLimit(`portal-completion:${user.id}`, { limit: 20, windowMs: 10 * 60 * 1000 }).success) {
    return rateLimited();
  }
  const body = await parseJsonBody(request, completionAnswerSchema);
  if (!body.ok) return body.response;
  const note = body.data.action === 'not_yet' ? body.data.note : '';

  const result = await answerCompletion({
    projectId: project.id,
    user,
    locale: await getPortalLocale(user.locale),
    action: body.data.action,
    note,
  });
  if (!result.ok) return apiError(result.status, result.code, result.error);

  const { activityId } = result;
  if (body.data.action === 'not_yet' && activityId) {
    after(() =>
      notifyAboutCompletionNotYet({
        activityId,
        projectId: project.id,
        projectName: project.name,
        clientName: displayName(user),
        clientEmail: user.email,
        note,
      })
    );
  }
  return NextResponse.json({ success: true });
}
