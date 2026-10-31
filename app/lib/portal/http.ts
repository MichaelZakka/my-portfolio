import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { assertSameOrigin } from '../session';

/**
 * Error body shared by all portal APIs: `error` is English for logs and the
 * admin UI, `code` is stable so the client portal can show a localized message
 * (messages portal.errors.<code>).
 */
export function apiError(
  status: number,
  code: string,
  error: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

export const unauthorized = () => apiError(401, 'unauthorized', 'Unauthorized');
export const forbidden = (error = 'Forbidden') => apiError(403, 'forbidden', error);
export const notFound = (error = 'Not found.') => apiError(404, 'notFound', error);
export const rateLimited = () =>
  apiError(429, 'rateLimited', 'Too many attempts. Try again in a few minutes.');

export type Result<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<Result<z.output<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError(400, 'invalidInput', 'Invalid request body.') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(400, 'invalidInput', 'Invalid input.', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Route params that fail validation can never match a row, so they are a 404. */
export function parseParam<S extends z.ZodType>(schema: S, value: unknown): Result<z.output<S>> {
  const parsed = schema.safeParse(value);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, response: notFound() };
}

/** CSRF defence in depth for every mutation (SameSite cookies are the first line). */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  return assertSameOrigin(request) ? null : forbidden('Invalid request origin.');
}
