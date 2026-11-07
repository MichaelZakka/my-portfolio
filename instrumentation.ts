import type { Instrumentation } from 'next';

/**
 * Runs once when the server starts: exit with a clear message when a required
 * environment variable is missing or still a placeholder (app/lib/env.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateServerEnvOrExit } = await import('./app/lib/env');
    validateServerEnvOrExit();
  }
}

/**
 * Unhandled errors in pages, route handlers and the proxy go to the error
 * monitor (app/lib/monitoring.ts), which records them and alerts the admin.
 * redirect()/notFound() are control flow and never arrive here.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportError } = await import('./app/lib/monitoring');
  const err = error as { message?: string; digest?: string };
  await reportError({
    source: 'request',
    message: err?.message || 'Unhandled error while handling a request',
    error,
    path: request.path,
    context: {
      method: request.method,
      route: context.routePath,
      type: context.routeType,
      ...(err?.digest ? { digest: err.digest } : {}),
    },
  });
};
