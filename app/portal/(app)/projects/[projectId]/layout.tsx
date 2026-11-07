import { forbidden, notFound, redirect } from 'next/navigation';
import { getClientProjectAccess } from '../../../../lib/portal/access';
import { getPortalUser } from '../../../../lib/portal/session';

/**
 * Membership gate for a project. It sits above this segment's loading.tsx
 * (Suspense) boundary, so a non-member gets a real HTTP 403 before anything
 * streams. The page checks again, since layouts and pages render in parallel.
 */
export default async function ProjectAccessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getPortalUser();
  if (!user) redirect('/portal/login?expired=1');

  const access = await getClientProjectAccess(user.id, projectId);
  if (access.status === 'not_found') notFound();
  if (access.status === 'forbidden') forbidden();

  return children;
}
