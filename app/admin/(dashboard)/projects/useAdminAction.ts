'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ErrorBody = { error?: string; issues?: { path: string; message: string }[] } | null;

function describeError(body: ErrorBody, status: number): string {
  if (body?.issues?.length) {
    return body.issues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)).join(' · ');
  }
  return body?.error || `Request failed (${status}).`;
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

/**
 * Runs an admin API call, surfaces its error message, and refreshes the
 * server-rendered page on success. `pending` holds the key of the running
 * action so each button can show its own busy state.
 */
export function useAdminAction() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run<T = Record<string, unknown>>(key: string, url: string, init: RequestInit): Promise<T | null> {
    setPending(key);
    setError('');
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(describeError(body, response.status));
        return null;
      }
      router.refresh();
      return (body ?? {}) as T;
    } catch {
      setError('Network error — please try again.');
      return null;
    } finally {
      setPending(null);
    }
  }

  return { run, pending, error, setError };
}
