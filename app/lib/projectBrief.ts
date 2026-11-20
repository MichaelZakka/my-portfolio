import { isPortalLocale, type PortalLocale } from './portal/constants';

export type ProjectBriefPayload = {
  projectTitle: string;
  projectDescription: string;
  timeline: string;
  budget: string;
  clientName: string;
  clientEmail: string;
  company: string;
  phone: string;
  /** Language for everything sent to the client (proposal, milestones, emails); '' when unknown. */
  contactLocale: PortalLocale | '';
  projectTypes: string[];
  projectTypeOther: string;
  businessDomains: string[];
  businessDomainOther: string;
  hasBrand: string;
  brandName: string;
  tagline: string;
  personalities: string[];
  references: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mood: string;
  colorApproach: string;
  visualNotes: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  web: 'Web Project',
  landing: 'Landing Page',
  shopify: 'Shopify Store',
  mobile: 'Mobile Application',
  other: 'Other',
};

export const CONTACT_LOCALE_LABELS: Record<PortalLocale, string> = {
  en: 'English',
  ar: 'Arabic',
};

export function getContactLocaleLabel(locale: string | null | undefined): string {
  return isPortalLocale(locale) ? CONTACT_LOCALE_LABELS[locale] : 'Not specified';
}

const COLOR_APPROACH_LABELS: Record<string, string> = {
  match: 'Match my existing brand colors',
  open: 'Open to recommendations',
};

export const INBOX_EMAIL = 'michealzakka@gmail.com';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
}

export function parseProjectBrief(raw: unknown): ProjectBriefPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;

  return {
    projectTitle: asString(body.projectTitle),
    projectDescription: asString(body.projectDescription),
    timeline: asString(body.timeline),
    budget: asString(body.budget),
    clientName: asString(body.clientName),
    clientEmail: asString(body.clientEmail),
    company: asString(body.company),
    phone: asString(body.phone),
    contactLocale: isPortalLocale(body.contactLocale) ? body.contactLocale : '',
    projectTypes: asStringArray(body.projectTypes),
    projectTypeOther: asString(body.projectTypeOther),
    businessDomains: asStringArray(body.businessDomains),
    businessDomainOther: asString(body.businessDomainOther),
    hasBrand: asString(body.hasBrand),
    brandName: asString(body.brandName),
    tagline: asString(body.tagline),
    personalities: asStringArray(body.personalities),
    references: asString(body.references),
    logoUrl: asString(body.logoUrl),
    primaryColor: asString(body.primaryColor) || '#dc2626',
    secondaryColor: asString(body.secondaryColor) || '#e0e0e0',
    accentColor: asString(body.accentColor) || '#b91c1c',
    mood: asString(body.mood),
    colorApproach: asString(body.colorApproach),
    visualNotes: asString(body.visualNotes),
  };
}

export function validateProjectBrief(data: ProjectBriefPayload): string | null {
  if (!data.projectTitle) return 'Project title is required.';
  if (!data.projectDescription) return 'Project description is required.';
  if (!data.budget) return 'Budget range is required.';
  if (!data.timeline) return 'Timeline is required.';
  if (!data.clientName) return 'Name is required.';
  if (!data.clientEmail) return 'Email is required.';
  if (!EMAIL_RE.test(data.clientEmail)) return 'Enter a valid email address.';
  if (data.projectTypes.length === 0) return 'Select at least one project type.';
  if (data.projectTypes.includes('other') && !data.projectTypeOther) {
    return 'Please specify the project type.';
  }
  if (data.businessDomains.length === 0) return 'Select at least one business domain.';
  if (data.businessDomains.includes('Other') && !data.businessDomainOther) {
    return 'Please specify the domain.';
  }
  if (!data.hasBrand) return 'Tell me whether you have an existing brand.';
  if (data.hasBrand === 'Yes') {
    if (!data.brandName) return 'Brand name is required.';
    if (data.personalities.length === 0) return 'Select at least one brand personality.';
  }
  return null;
}

function formatProjectTypes(data: ProjectBriefPayload): string {
  const labels = data.projectTypes.map((id) => {
    if (id === 'other' && data.projectTypeOther) {
      return `Other (${data.projectTypeOther})`;
    }
    return PROJECT_TYPE_LABELS[id] ?? id;
  });
  return labels.length ? labels.join(', ') : 'Not specified';
}

function formatDomains(data: ProjectBriefPayload): string {
  const domains = data.businessDomains.map((domain) =>
    domain === 'Other' && data.businessDomainOther
      ? `Other (${data.businessDomainOther})`
      : domain
  );
  return domains.length ? domains.join(', ') : 'Not specified';
}

export function getBriefProjectTypesLabel(data: ProjectBriefPayload): string {
  return formatProjectTypes(data);
}

export function getBriefDomainsLabel(data: ProjectBriefPayload): string {
  return formatDomains(data);
}

export function getBriefColorApproachLabel(data: ProjectBriefPayload): string {
  return COLOR_APPROACH_LABELS[data.colorApproach] || 'N/A';
}

export function buildBriefSubject(data: ProjectBriefPayload): string {
  return `Project brief: ${data.projectTitle || data.clientName}`;
}

export function buildBriefEmailBody(data: ProjectBriefPayload): string {
  return [
    'New project brief from portfolio survey',
    '',
    '— Project overview —',
    `Title: ${data.projectTitle || 'N/A'}`,
    `Description: ${data.projectDescription}`,
    `Timeline: ${data.timeline || 'N/A'}`,
    `Budget: ${data.budget || 'N/A'}`,
    '',
    '— Client —',
    `Name: ${data.clientName}`,
    `Email: ${data.clientEmail}`,
    `Company: ${data.company || 'N/A'}`,
    `Phone: ${data.phone || 'N/A'}`,
    `Language: ${getContactLocaleLabel(data.contactLocale)}`,
    '',
    '— Project type —',
    formatProjectTypes(data),
    '',
    '— Business domain —',
    formatDomains(data),
    '',
    '— Brand identity —',
    `Existing brand: ${data.hasBrand || 'N/A'}`,
    `Brand name: ${data.brandName || 'N/A'}`,
    `Tagline: ${data.tagline || 'N/A'}`,
    `Personality: ${data.personalities.length ? data.personalities.join(', ') : 'N/A'}`,
    `References: ${data.references || 'N/A'}`,
    `Logo / assets URL: ${data.logoUrl || 'N/A'}`,
    '',
    '— Colors & visual direction —',
    `Primary: ${data.primaryColor}`,
    `Secondary: ${data.secondaryColor}`,
    `Accent: ${data.accentColor}`,
    `Mood: ${data.mood || 'N/A'}`,
    `Color approach: ${COLOR_APPROACH_LABELS[data.colorApproach] || 'N/A'}`,
    `Visual notes: ${data.visualNotes || 'N/A'}`,
  ].join('\n');
}

export function buildWhatsAppMessage(data: ProjectBriefPayload): string {
  const lines = [
    `Hi Michael! I'd like to start a project.`,
    '',
    `Name: ${data.clientName}`,
    `Email: ${data.clientEmail}`,
    data.company ? `Company: ${data.company}` : null,
    data.contactLocale ? `Language: ${getContactLocaleLabel(data.contactLocale)}` : null,
    `Project: ${data.projectTitle || 'Untitled'}`,
    `Type: ${formatProjectTypes(data)}`,
    `Domain: ${formatDomains(data)}`,
    `Budget: ${data.budget || 'N/A'}`,
    `Timeline: ${data.timeline || 'N/A'}`,
    '',
    `Brief: ${data.projectDescription.slice(0, 280)}${data.projectDescription.length > 280 ? '…' : ''}`,
  ];
  return lines.filter(Boolean).join('\n');
}
