import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '../../../../lib/db';
import { fromJsonArray } from '../../../../lib/leads';
import { PROJECT_TYPE_LABELS, buildWhatsAppMessage } from '../../../../lib/projectBrief';
import { leadToBriefPayload } from '../../../../lib/leads';
import StatusBadge from '../../../_components/StatusBadge';
import RequestActionsPanel from './RequestActionsPanel';
import styles from '../../../admin.module.css';
import detailStyles from './page.module.css';

export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = '963992833739';

type Params = { params: Promise<{ id: string }> };

export default async function AdminRequestDetailPage({ params }: Params) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { statusEvents: { orderBy: { createdAt: 'desc' } } },
  });

  if (!lead) notFound();

  const briefPayload = leadToBriefPayload(lead);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildWhatsAppMessage(briefPayload)
  )}`;

  const projectTypes = fromJsonArray(lead.projectTypes);
  const businessDomains = fromJsonArray(lead.businessDomains);
  const personalities = fromJsonArray(lead.personalities);

  return (
    <div>
      <Link href="/admin/requests" className={detailStyles.backLink}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        Back to requests
      </Link>

      <div className={detailStyles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>{lead.projectTitle || '(untitled project)'}</h1>
          <p className={styles.pageSubtitle}>
            Submitted {new Date(lead.createdAt).toLocaleString()} via {lead.source}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className={styles.grid2} style={{ marginTop: '1.5rem' }}>
        <div>
          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Project overview</div>
            <div className={styles.detailGrid} style={{ marginBottom: '1rem' }}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Timeline</span>
                <span className={styles.detailValue}>{lead.timeline || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Budget</span>
                <span className={styles.detailValue}>{lead.budget || '—'}</span>
              </div>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Description</span>
              <p className={detailStyles.description}>{lead.projectDescription}</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Client</div>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Name</span>
                <span className={styles.detailValue}>{lead.clientName}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{lead.clientEmail}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Company</span>
                <span className={styles.detailValue}>{lead.company || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Phone</span>
                <span className={styles.detailValue}>{lead.phone || '—'}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Project type &amp; domain</div>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Project type</span>
                <div className={styles.chipList}>
                  {projectTypes.length === 0 && <span className={styles.detailValue}>—</span>}
                  {projectTypes.map((type) => (
                    <span key={type} className={styles.chip}>
                      {type === 'other' && lead.projectTypeOther
                        ? `Other (${lead.projectTypeOther})`
                        : PROJECT_TYPE_LABELS[type] ?? type}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Business domain</span>
                <div className={styles.chipList}>
                  {businessDomains.length === 0 && <span className={styles.detailValue}>—</span>}
                  {businessDomains.map((domain) => (
                    <span key={domain} className={styles.chip}>
                      {domain === 'Other' && lead.businessDomainOther
                        ? `Other (${lead.businessDomainOther})`
                        : domain}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Brand identity</div>
            <div className={styles.detailGrid} style={{ marginBottom: '1rem' }}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Existing brand</span>
                <span className={styles.detailValue}>{lead.hasBrand || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Brand name</span>
                <span className={styles.detailValue}>{lead.brandName || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Tagline</span>
                <span className={styles.detailValue}>{lead.tagline || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Logo / assets URL</span>
                {lead.logoUrl ? (
                  <a
                    href={lead.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {lead.logoUrl}
                  </a>
                ) : (
                  <span className={styles.detailValue}>—</span>
                )}
              </div>
            </div>
            <div className={styles.detailField} style={{ marginBottom: '1rem' }}>
              <span className={styles.detailLabel}>Personality</span>
              <div className={styles.chipList}>
                {personalities.length === 0 && <span className={styles.detailValue}>—</span>}
                {personalities.map((trait) => (
                  <span key={trait} className={styles.chip}>
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>References</span>
              <p className={detailStyles.description}>{lead.references || '—'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Colors &amp; visual direction</div>
            <div className={styles.swatchRow} style={{ marginBottom: '1rem' }}>
              <span className={styles.swatch}>
                <span className={styles.swatchDot} style={{ background: lead.primaryColor }} />
                Primary — {lead.primaryColor}
              </span>
              <span className={styles.swatch}>
                <span className={styles.swatchDot} style={{ background: lead.secondaryColor }} />
                Secondary — {lead.secondaryColor}
              </span>
              <span className={styles.swatch}>
                <span className={styles.swatchDot} style={{ background: lead.accentColor }} />
                Accent — {lead.accentColor}
              </span>
            </div>
            <div className={styles.detailGrid} style={{ marginBottom: '1rem' }}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Mood</span>
                <span className={styles.detailValue}>{lead.mood || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Color approach</span>
                <span className={styles.detailValue}>{lead.colorApproach || '—'}</span>
              </div>
            </div>
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Visual notes</span>
              <p className={detailStyles.description}>{lead.visualNotes || '—'}</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={detailStyles.sectionTitle}>Request metadata</div>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Source</span>
                <span className={styles.detailValue}>{lead.source}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Landing path</span>
                <span className={styles.detailValue}>{lead.landingPath || '—'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Referrer</span>
                <span className={styles.detailValue}>{lead.referrer || 'Direct'}</span>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>Email notification</span>
                <span className={styles.detailValue}>
                  {lead.emailSent ? 'Sent ✓' : 'Failed'}
                </span>
              </div>
              {!lead.emailSent && lead.emailError && (
                <div className={styles.detailField} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.detailLabel}>Email error</span>
                  <code
                    className={styles.detailValue}
                    style={{
                      display: 'block',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '0.8rem',
                      color: '#f5a3a3',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {lead.emailError}
                  </code>
                </div>
              )}
              <div className={styles.detailField}>
                <span className={styles.detailLabel}>User agent</span>
                <span className={styles.detailValue} style={{ fontSize: '0.78rem' }}>
                  {lead.userAgent || '—'}
                </span>
              </div>
            </div>
          </div>

          {lead.statusEvents.length > 0 && (
            <div className={styles.card}>
              <div className={detailStyles.sectionTitle}>Status timeline</div>
              <div className={styles.timeline}>
                {lead.statusEvents.map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <span>
                      {event.fromStatus ? `${event.fromStatus} → ${event.toStatus}` : event.toStatus}{' '}
                      <span style={{ color: '#6b6b6b' }}>
                        · {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <RequestActionsPanel
            leadId={lead.id}
            currentStatus={lead.status}
            currentNotes={lead.notes}
            clientEmail={lead.clientEmail}
            whatsappUrl={whatsappUrl}
          />
        </div>
      </div>
    </div>
  );
}
