import type { Metadata } from 'next';
import { forbidden, notFound, redirect } from 'next/navigation';
import { getClientProjectAccess } from '../../../../lib/portal/access';
import { getPortalUser } from '../../../../lib/portal/session';
import ProjectView from './ProjectView';

type Props = { params: Promise<{ projectId: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const user = await getPortalUser();
  // Never put another client's project name in the <title>.
  const access = user ? await getClientProjectAccess(user.id, projectId) : null;
  return access?.status === 'ok' ? { title: access.project.name } : {};
}

export default async function PortalProjectPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { tab } = await searchParams;
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const access = await getClientProjectAccess(user.id, projectId);
  if (access.status === 'not_found') notFound();
  if (access.status === 'forbidden') forbidden();

  return <ProjectView projectId={projectId} tab={tab} viewer={{ id: user.id, timeZone: user.timeZone }} />;
}
