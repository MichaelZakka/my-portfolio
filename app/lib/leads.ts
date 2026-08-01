import type { Lead, LeadStatusEvent } from '@prisma/client';
import type { ProjectBriefPayload } from './projectBrief';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
  'archived',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
  archived: 'Archived',
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/** Array-like brief fields are stored as JSON text so the schema stays portable across SQLite/Postgres. */
export function toJsonArray(value: string[]): string {
  return JSON.stringify(value ?? []);
}

export function fromJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export type LeadWithParsedFields = Omit<
  Lead,
  'projectTypes' | 'businessDomains' | 'personalities'
> & {
  projectTypes: string[];
  businessDomains: string[];
  personalities: string[];
};

export function parseLead(lead: Lead): LeadWithParsedFields {
  return {
    ...lead,
    projectTypes: fromJsonArray(lead.projectTypes),
    businessDomains: fromJsonArray(lead.businessDomains),
    personalities: fromJsonArray(lead.personalities),
  };
}

/** Maps a validated ProjectBriefPayload + request metadata to Prisma create input. */
export function briefToLeadCreateInput(
  data: ProjectBriefPayload,
  meta: { userAgent?: string | null; referrer?: string | null; landingPath?: string | null }
) {
  return {
    projectTitle: data.projectTitle,
    projectDescription: data.projectDescription,
    timeline: data.timeline,
    budget: data.budget,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    company: data.company,
    phone: data.phone,
    projectTypes: toJsonArray(data.projectTypes),
    projectTypeOther: data.projectTypeOther,
    businessDomains: toJsonArray(data.businessDomains),
    businessDomainOther: data.businessDomainOther,
    hasBrand: data.hasBrand,
    brandName: data.brandName,
    tagline: data.tagline,
    personalities: toJsonArray(data.personalities),
    references: data.references,
    logoUrl: data.logoUrl,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    accentColor: data.accentColor,
    mood: data.mood,
    colorApproach: data.colorApproach,
    visualNotes: data.visualNotes,
    userAgent: meta.userAgent ?? null,
    referrer: meta.referrer ?? null,
    landingPath: meta.landingPath ?? null,
  };
}

export function leadToBriefPayload(lead: Lead | LeadWithParsedFields): ProjectBriefPayload {
  const projectTypes = Array.isArray(lead.projectTypes)
    ? lead.projectTypes
    : fromJsonArray(lead.projectTypes);
  const businessDomains = Array.isArray(lead.businessDomains)
    ? lead.businessDomains
    : fromJsonArray(lead.businessDomains);
  const personalities = Array.isArray(lead.personalities)
    ? lead.personalities
    : fromJsonArray(lead.personalities);

  return {
    projectTitle: lead.projectTitle,
    projectDescription: lead.projectDescription,
    timeline: lead.timeline,
    budget: lead.budget,
    clientName: lead.clientName,
    clientEmail: lead.clientEmail,
    company: lead.company,
    phone: lead.phone,
    projectTypes,
    projectTypeOther: lead.projectTypeOther,
    businessDomains,
    businessDomainOther: lead.businessDomainOther,
    hasBrand: lead.hasBrand,
    brandName: lead.brandName,
    tagline: lead.tagline,
    personalities,
    references: lead.references,
    logoUrl: lead.logoUrl,
    primaryColor: lead.primaryColor,
    secondaryColor: lead.secondaryColor,
    accentColor: lead.accentColor,
    mood: lead.mood,
    colorApproach: lead.colorApproach,
    visualNotes: lead.visualNotes,
  };
}

export type { LeadStatusEvent };
