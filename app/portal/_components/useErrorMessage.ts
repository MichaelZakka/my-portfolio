'use client';

import { useTranslations } from 'next-intl';

export type ApiErrorBody = { code?: string; error?: string } | null | undefined;

/** Maps a portal API error `code` to its localized message (portal.errors.*). */
export function useErrorMessage() {
  const t = useTranslations('portal.errors');
  return (body: ApiErrorBody, values: Record<string, string | number> = {}) => {
    const code = body?.code;
    return code && t.has(code) ? t(code, values) : t('generic');
  };
}

/** Parses a JSON response body without throwing on empty or non-JSON replies. */
export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
