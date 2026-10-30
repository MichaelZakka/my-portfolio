import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { idSchema } from '../../../../lib/portal/validation';
import NewProjectForm from './NewProjectForm';
import styles from '../../../admin.module.css';
import projectStyles from '../projects.module.css';

export const dynamic = 'force-dynamic';

/** Blank project, or "Convert to project" from a request (?requestId=…), prefilled from the lead. */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const { requestId } = await searchParams;
  const lead =
    requestId && idSchema.safeParse(requestId).success
      ? await prisma.lead.findUnique({
          where: { id: requestId },
          select: {
            id: true,
            projectTitle: true,
            projectDescription: true,
            clientName: true,
            clientEmail: true,
            status: true,
            project: { select: { id: true, name: true } },
          },
        })
      : null;

  return (
    <div>
      <Link
        href={lead ? `/admin/requests/${lead.id}` : '/admin/projects'}
        className={projectStyles.backLink}
      >
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {lead ? 'Back to request' : 'Back to projects'}
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{lead ? 'Convert request to project' : 'New project'}</h1>
        <p className={styles.pageSubtitle}>
          {lead
            ? `From “${lead.projectTitle || 'untitled request'}” by ${lead.clientName || lead.clientEmail}.`
            : 'Create a client project, then invite the client to follow it in the portal.'}
        </p>
      </div>

      {lead?.project ? (
        <div className={styles.card}>
          <p style={{ marginBottom: '1rem' }}>This request was already converted.</p>
          <Link href={`/admin/projects/${lead.project.id}`} className={`${styles.button} ${styles.buttonPrimary}`}>
            Open “{lead.project.name}”
          </Link>
        </div>
      ) : (
        <NewProjectForm
          lead={
            lead
              ? {
                  id: lead.id,
                  title: lead.projectTitle,
                  description: lead.projectDescription,
                  clientName: lead.clientName,
                  clientEmail: lead.clientEmail,
                  status: lead.status,
                }
              : null
          }
        />
      )}
    </div>
  );
}
