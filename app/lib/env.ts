/**
 * Startup check for server environment variables, run once when the server
 * starts (instrumentation.ts → register()). `next build` does not run it, so
 * builds need no secrets.
 *
 * A missing, malformed or still-placeholder REQUIRED variable stops the server
 * with one error naming every problem, instead of a 500 on the first database
 * query or a silently disabled /admin and /portal. Values are never printed.
 * Optional variables only produce a warning in production.
 *
 * Emergency escape hatch: SKIP_ENV_VALIDATION=1.
 */

type Rule = {
  name: string;
  hint: string;
  /** Returns a problem description, or null when the value is acceptable. */
  check?: (value: string) => string | null;
};

/** The placeholder shapes used in .env.example, so a copied template fails loudly. */
const PLACEHOLDER = /^replace-with-|<[^>]+>|USER:PASSWORD@HOST/i;

const postgresUrl = (value: string) =>
  /^(postgres(ql)?|prisma(\+postgres)?):\/\//.test(value)
    ? null
    : 'must be a postgres:// or postgresql:// connection string';

const REQUIRED: Rule[] = [
  { name: 'DATABASE_URL', hint: 'pooled Postgres connection string', check: postgresUrl },
  {
    name: 'DATABASE_URL_UNPOOLED',
    hint: 'direct Postgres connection string, used by prisma migrate',
    check: postgresUrl,
  },
  {
    name: 'AUTH_SECRET',
    hint: 'signs session cookies; generate with node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    // Same minimum as app/lib/auth.ts, which refuses shorter secrets.
    check: (value) => (value.length >= 16 ? null : 'must be at least 16 characters (32+ recommended)'),
  },
  {
    name: 'ADMIN_EMAIL',
    hint: 'the only account that can sign in to /admin',
    check: (value) => (/^[^@\s]+@[^@\s]+$/.test(value) ? null : 'must be an email address'),
  },
  {
    name: 'ADMIN_PASSWORD_HASH',
    hint: 'generate with npm run hash-password -- "your-password"',
    // The salt:hash format app/lib/password.ts verifies against.
    check: (value) =>
      /^[^:\s]+:[0-9a-f]+$/i.test(value) ? null : 'must be the salt:hash value printed by npm run hash-password',
  },
];

/** Not needed to start, but a production site without them is missing a feature. */
const RECOMMENDED_IN_PRODUCTION: Rule[] = [
  { name: 'NEXT_PUBLIC_SITE_URL', hint: 'portal invite and reset links fall back to the Vercel URL' },
  { name: 'RESEND_API_KEY', hint: 'no emails are sent (leads are still saved)' },
  { name: 'CRON_SECRET', hint: 'meeting reminders are disabled' },
  { name: 'BLOB_READ_WRITE_TOKEN', hint: 'portal file uploads are refused on Vercel' },
];

/** Problems with the required variables; an empty list means the environment is usable. */
export function findEnvProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  for (const rule of REQUIRED) {
    const value = env[rule.name]?.trim();
    if (!value) {
      problems.push(`${rule.name} is not set (${rule.hint})`);
    } else if (PLACEHOLDER.test(value)) {
      problems.push(`${rule.name} still has the .env.example placeholder (${rule.hint})`);
    } else {
      const problem = rule.check?.(value);
      if (problem) problems.push(`${rule.name} ${problem}`);
    }
  }
  return problems;
}

export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.SKIP_ENV_VALIDATION === '1' || env.SKIP_ENV_VALIDATION === 'true') return;
  if (env.NEXT_PHASE === 'phase-production-build') return;

  const problems = findEnvProblems(env);
  if (problems.length > 0) {
    throw new Error(
      [
        'Missing or invalid environment variables:',
        ...problems.map((problem) => `  - ${problem}`),
        'Locally: copy .env.example to .env and fill these in.',
        'On Vercel: Project → Settings → Environment Variables (Production and Preview), then redeploy.',
      ].join('\n')
    );
  }

  if (env.NODE_ENV === 'production') {
    const missing = RECOMMENDED_IN_PRODUCTION.filter((rule) => !env[rule.name]?.trim());
    for (const rule of missing) {
      console.warn(`[env] ${rule.name} is not set: ${rule.hint}.`);
    }
  }
}

/**
 * For instrumentation.ts. Next.js logs an error thrown from register() but keeps
 * the server up (after printing "Ready") and answers every request with a 500,
 * so exit instead: a misconfigured server should never look healthy.
 */
export function validateServerEnvOrExit(): void {
  try {
    validateServerEnv();
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
