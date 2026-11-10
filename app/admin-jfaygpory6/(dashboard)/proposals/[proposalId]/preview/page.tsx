import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { dirFor } from '../../../../../../i18n/routing';
import { prisma } from '../../../../../lib/db';
import { requireAdminSession } from '../../../../../lib/session';
import { expiryIfSentNow, proposalContent } from '../../../../../lib/portal/proposals';
import { idSchema } from '../../../../../lib/portal/validation';
import ProposalDocument from '../../../../../portal/_components/ProposalDocument';
import styles from '../../../../admin.module.css';
import projectStyles from '../../../projects/projects.module.css';
import proposalStyles from '../../../../../portal/_components/proposal.module.css';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ proposalId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  await requireAdminSession();
  const { proposalId } = await params;
  if (!idSchema.safeParse(proposalId).success) return { title: 'Proposal preview' };
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { title: true } });
  return { title: proposal ? `Preview: ${proposal.title}` : 'Proposal preview' };
}

/** The proposal exactly as the client will read it, in its own language (the answer form is left out). */
export default async function AdminProposalPreviewPage({ params }: Params) {
  await requireAdminSession();
  const { proposalId } = await params;
  if (!idSchema.safeParse(proposalId).success) notFound();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { lead: { select: { clientName: true, clientEmail: true } } },
  });
  if (!proposal) notFound();

  const content = proposalContent(proposal);
  // A draft has no expiry yet: show the one sending it now would give.
  const validUntil = proposal.validUntil ?? expiryIfSentNow(content.validDays);

  return (
    <div>
      <Link href={`/admin-jfaygpory6/proposals/${proposal.id}`} className={projectStyles.backLink}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        Back to the proposal
      </Link>
      <div className={`${styles.banner} ${styles.bannerSuccess} ${proposalStyles.previewBanner}`} role="status">
        Preview of version {proposal.version} as {proposal.recipientEmail ?? proposal.lead.clientEmail} will see it
        {proposal.status === 'draft' ? ' (last saved draft)' : ''}. On the real page the client can accept, ask for
        changes or decline below it.
      </div>
      <div lang={content.locale} dir={dirFor(content.locale)}>
        <ProposalDocument
          content={content}
          uiLocale={content.locale}
          recipientName={proposal.recipientName ?? proposal.lead.clientName}
          sentAt={proposal.sentAt}
          validUntil={validUntil}
        />
      </div>
    </div>
  );
}
