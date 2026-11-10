import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { requireAdminSession } from '../../../../lib/session';
import { proposalState } from '../../../../lib/portal/constants';
import { formatDateTime, toDateInputValue } from '../../../../lib/portal/format';
import { proposalContent, proposalTotal } from '../../../../lib/portal/proposals';
import { idSchema } from '../../../../lib/portal/validation';
import { ProposalBadge } from '../../../_components/ProjectBadges';
import ProposalWorkspace from './ProposalWorkspace';
import styles from '../../../admin.module.css';
import projectStyles from '../../projects/projects.module.css';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ proposalId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireAdminSession();
  const { proposalId } = await params;
  if (!idSchema.safeParse(proposalId).success) return { title: 'Proposal' };
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { title: true } });
  return { title: proposal ? `Proposal: ${proposal.title}` : 'Proposal' };
}

export default async function AdminProposalPage({ params }: Params) {
  await requireAdminSession();
  const { proposalId } = await params;
  if (!idSchema.safeParse(proposalId).success) notFound();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      lead: {
        select: {
          id: true,
          projectTitle: true,
          clientName: true,
          clientEmail: true,
          budget: true,
          timeline: true,
          project: { select: { id: true } },
        },
      },
    },
  });
  if (!proposal) notFound();

  const latest = await prisma.proposal.findFirst({
    where: { leadId: proposal.leadId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true },
  });

  const { lead } = proposal;
  const content = proposalContent(proposal);
  const state = proposalState(proposal);
  const when = (date: Date | null) => (date ? formatDateTime(date, 'en') : null);

  return (
    <div>
      <Link href={`/admin-jfaygpory6/requests/${lead.id}`} className={projectStyles.backLink}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        Back to the request
      </Link>
      <div className={projectStyles.headerRow}>
        <div>
          <div className={projectStyles.titleRow}>
            <h1 className={styles.pageTitle}>Proposal, version {proposal.version}</h1>
            <ProposalBadge state={state} />
          </div>
          <p className={styles.pageSubtitle}>
            {lead.projectTitle || '(untitled request)'} · for {lead.clientName || lead.clientEmail}
          </p>
        </div>
      </div>

      <ProposalWorkspace
        proposalId={proposal.id}
        leadId={lead.id}
        version={proposal.version}
        state={state}
        draft={{
          locale: content.locale,
          title: content.title,
          summary: content.summary,
          phases: content.phases,
          included: content.included,
          excluded: content.excluded,
          clientProvides: content.clientProvides,
          currency: content.currency,
          totalAmount: content.totalAmount,
          paymentTerms: content.paymentTerms,
          revisionRounds: content.revisionRounds,
          startDate: toDateInputValue(content.startDate),
          validDays: content.validDays,
        }}
        facts={{
          recipient: proposal.recipientEmail ?? lead.clientEmail,
          total: proposalTotal(content, 'en'),
          sent: when(proposal.sentAt),
          validUntil: when(proposal.validUntil),
          email: proposal.sentAt ? { sent: proposal.emailSent, error: proposal.emailError } : null,
          responded: when(proposal.respondedAt),
          responseNote: proposal.responseNote,
          signer:
            proposal.status === 'accepted'
              ? {
                  name: proposal.signerName ?? '',
                  ip: proposal.signerIp ?? '',
                  userAgent: proposal.signerUserAgent ?? '',
                  hash: proposal.snapshotHash ?? '',
                }
              : null,
        }}
        hints={{ budget: lead.budget, timeline: lead.timeline }}
        projectId={lead.project?.id ?? null}
        newerVersion={latest && latest.id !== proposal.id ? latest : null}
      />
    </div>
  );
}
