'use client';

/**
 * First-party analytics client. Collects only: current path, referrer, UTM
 * params, a random per-tab-session id (sessionStorage, cleared when the
 * browser tab closes), and event labels/metadata you pass explicitly.
 * No cookies, no cross-site tracking, no device fingerprinting.
 */

const SESSION_KEY = 'mz_session_id';
const LANDING_PATH_KEY = 'mz_landing_path';
const ENDPOINT = '/api/analytics';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** First path visited in this browser session — used as `landingPath` metadata on leads. */
export function getLandingPath(): string {
  if (typeof window === 'undefined') return '';
  try {
    let path = window.sessionStorage.getItem(LANDING_PATH_KEY);
    if (!path) {
      path = window.location.pathname;
      window.sessionStorage.setItem(LANDING_PATH_KEY, path);
    }
    return path;
  } catch {
    return '';
  }
}

function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmTerm: params.get('utm_term') || undefined,
    utmContent: params.get('utm_content') || undefined,
  };
}

function send(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify(payload);

  try {
    if ('sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort — never block or throw on analytics failures.
  });
}

export function trackPageView(path?: string) {
  getLandingPath();
  send({
    type: 'page_view',
    path: path ?? window.location.pathname,
    referrer: document.referrer || undefined,
    sessionId: getSessionId(),
    ...getUtmParams(),
  });
}

export function trackEvent(
  type: 'cta_click' | 'survey_started' | 'survey_step_completed' | 'survey_submitted' | 'survey_abandoned',
  options?: { label?: string; meta?: Record<string, unknown> }
) {
  send({
    type,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    label: options?.label,
    meta: options?.meta,
    sessionId: getSessionId(),
  });
}
