'use client';

import { useContext, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectViewContext } from './projectViewContext';

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
 * Runs an admin API call, surfaces its error message, and on success re-reads
 * the project screen's data (or refreshes the route outside that screen).
 * `pending` holds the key of the running action so each button can show its
 * own busy state.
 */
export function useAdminAction() {
  const router = useRouter();
  const projectView = useContext(ProjectViewContext);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  // One request at a time. Busy controls use aria-disabled (not disabled) so
  // keyboard focus stays put, which means clicks can still arrive: ignore them.
  const running = useRef(false);

  async function run<T = Record<string, unknown>>(key: string, url: string, init: RequestInit): Promise<T | null> {
    if (running.current) return null;
    running.current = true;
    setPending(key);
    setError('');
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(describeError(body, response.status));
        return null;
      }
      if (projectView) await projectView.reload();
      else router.refresh();
      return (body ?? {}) as T;
    } catch {
      setError('Network error — please try again.');
      return null;
    } finally {
      running.current = false;
      setPending(null);
    }
  }

  return { run, pending, error, setError };
}
