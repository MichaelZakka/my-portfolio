import { prisma } from './db';

export const ANALYTICS_EVENT_TYPES = [
  'page_view',
  'cta_click',
  'survey_started',
  'survey_step_completed',
  'survey_submitted',
  'survey_abandoned',
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value);
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** Coarse device classification from the User-Agent header — no fingerprinting. */
export function deviceFromUserAgent(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua) && !/mobile/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}

export type RecordEventInput = {
  type: string;
  path?: string | null;
  label?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  sessionId?: string | null;
  meta?: Record<string, unknown> | null;
  userAgent?: string | null;
  country?: string | null;
};

export async function recordAnalyticsEvent(input: RecordEventInput) {
  if (!isAnalyticsEventType(input.type)) return null;

  return prisma.analyticsEvent.create({
    data: {
      type: input.type,
      path: input.path?.slice(0, 512) ?? null,
      label: input.label?.slice(0, 128) ?? null,
      referrer: input.referrer?.slice(0, 512) ?? null,
      utmSource: input.utmSource?.slice(0, 128) ?? null,
      utmMedium: input.utmMedium?.slice(0, 128) ?? null,
      utmCampaign: input.utmCampaign?.slice(0, 128) ?? null,
      utmTerm: input.utmTerm?.slice(0, 128) ?? null,
      utmContent: input.utmContent?.slice(0, 128) ?? null,
      device: deviceFromUserAgent(input.userAgent),
      country: input.country?.slice(0, 8) ?? null,
      sessionId: input.sessionId?.slice(0, 64) ?? null,
      meta: input.meta ? JSON.stringify(input.meta).slice(0, 2000) : null,
    },
  });
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export async function getDailySeries(days: number) {
  const since = startOfDaysAgo(days);
  const events = await prisma.analyticsEvent.findMany({
    where: { type: 'page_view', createdAt: { gte: since } },
    select: { createdAt: true, sessionId: true },
  });

  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(dayKey(d), { views: 0, visitors: new Set() });
  }

  for (const event of events) {
    const key = dayKey(event.createdAt);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.views += 1;
    if (event.sessionId) bucket.visitors.add(event.sessionId);
  }

  return Array.from(byDay.entries()).map(([date, bucket]) => ({
    date,
    views: bucket.views,
    visitors: bucket.visitors.size,
  }));
}

export async function getVisitorCounts() {
  const [today, last7, last30] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: startOfDaysAgo(1) } },
      select: { sessionId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: startOfDaysAgo(7) } },
      select: { sessionId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { type: 'page_view', createdAt: { gte: startOfDaysAgo(30) } },
      select: { sessionId: true },
    }),
  ]);

  const uniq = (rows: { sessionId: string | null }[]) =>
    new Set(rows.filter((r) => r.sessionId).map((r) => r.sessionId)).size;

  return {
    viewsToday: today.length,
    viewsLast7: last7.length,
    viewsLast30: last30.length,
    uniqueToday: uniq(today),
    uniqueLast7: uniq(last7),
    uniqueLast30: uniq(last30),
  };
}

export async function getTopPaths(days: number, limit = 8) {
  const since = startOfDaysAgo(days);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['path'],
    where: { type: 'page_view', createdAt: { gte: since }, path: { not: null } },
    _count: { path: true },
    orderBy: { _count: { path: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ path: r.path ?? '(unknown)', views: r._count.path }));
}

export async function getTopReferrers(days: number, limit = 8) {
  const since = startOfDaysAgo(days);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['referrer'],
    where: {
      type: 'page_view',
      createdAt: { gte: since },
      referrer: { not: null },
    },
    _count: { referrer: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: limit,
  });
  return rows
    .filter((r) => r.referrer)
    .map((r) => ({ referrer: r.referrer as string, views: r._count.referrer }));
}

export async function getDeviceBreakdown(days: number) {
  const since = startOfDaysAgo(days);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['device'],
    where: { type: 'page_view', createdAt: { gte: since } },
    _count: { device: true },
  });
  const result: Record<DeviceType, number> = { desktop: 0, mobile: 0, tablet: 0 };
  for (const row of rows) {
    const device = (row.device ?? 'desktop') as DeviceType;
    result[device] = (result[device] ?? 0) + row._count.device;
  }
  return result;
}

export async function getCtaBreakdown(days: number) {
  const since = startOfDaysAgo(days);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['label'],
    where: { type: 'cta_click', createdAt: { gte: since }, label: { not: null } },
    _count: { label: true },
    orderBy: { _count: { label: 'desc' } },
  });
  return rows
    .filter((r) => r.label)
    .map((r) => ({ label: r.label as string, clicks: r._count.label }));
}

export async function getFunnel(days: number) {
  const since = startOfDaysAgo(days);
  const [homeViews, workWithMeViews, surveyStarted, surveySubmitted] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: 'page_view', path: '/', createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: 'page_view', path: '/work-with-me', createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: 'survey_started', createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: 'survey_submitted', createdAt: { gte: since } },
    }),
  ]);

  return [
    { stage: 'Home visits', count: homeViews },
    { stage: 'Work-with-me visits', count: workWithMeViews },
    { stage: 'Survey started', count: surveyStarted },
    { stage: 'Survey submitted', count: surveySubmitted },
  ];
}

export async function getConversionRate(days: number): Promise<number> {
  const since = startOfDaysAgo(days);
  const [workWithMeViews, surveySubmitted] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { type: 'page_view', path: '/work-with-me', createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: 'survey_submitted', createdAt: { gte: since } },
    }),
  ]);
  if (workWithMeViews === 0) return 0;
  return (surveySubmitted / workWithMeViews) * 100;
}
