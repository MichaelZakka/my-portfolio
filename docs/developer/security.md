# Security

**For:** developers. What the site protects, how, and where the limits are. To report a
vulnerability, see [SECURITY.md](../../SECURITY.md).

## What needs protecting

- **Client data**: names, emails, project details, messages, files, meeting notes and
  private reviews in the portal; project briefs and contact messages from visitors.
- **The admin dashboard**, which can read and change all of it.
- **One-time links** (invitations, password resets, proposals), which grant access by
  themselves.
- **Secrets**: database credentials, `AUTH_SECRET`, API keys. The repository is public, so
  anything committed is published.

## Controls

| Area | How it is handled | Code |
| --- | --- | --- |
| Admin sign-in | One account from env vars; scrypt hash compared in constant time; 10 attempts per 5 minutes per IP. | `app/api/admin/login/route.ts`, `app/lib/password.ts` |
| Client sign-in | bcrypt (cost 12); unknown emails pay the same cost (`DUMMY_HASH`); per-IP and per-email rate limits; forgot-password never reveals whether an account exists. | `app/lib/portal/credentials.ts`, `app/api/portal/auth/*` |
| Accounts | Invite-only by design: accounts are only created from an admin-issued invitation or proposal token. There is no sign-up route, and adding one would be a product change, not a fix. | `invitations.ts`, `proposals.ts` |
| Sessions | HMAC-SHA256 signed, stateless, 7-day cookies; httpOnly, `Secure` in production; admin `SameSite=Strict`, portal `Lax`. Portal and admin tokens are signed over different prefixes, so one can't be replayed as the other. Portal sessions carry `sessionVersion`, checked against the database on every request. | `app/lib/auth.ts`, `app/lib/portal/session.ts` |
| Authorization | `proxy.ts` gates `/admin-jfaygpory6`, `/api/admin`, `/portal` and `/api/portal` (failing closed without auth configuration), and **every** page and route re-checks on the server. Project access requires a `ProjectMember` row; another client's project answers 403. Client queries apply visibility filters in one place. | `proxy.ts`, `app/lib/session.ts`, `app/lib/portal/access.ts`, `queries.ts` |
| CSRF | SameSite cookies, plus a same-origin check (`Origin` host must match) on every mutation. | `rejectCrossOrigin()` |
| One-time tokens | 256-bit random, base64url; only SHA-256 hashes stored; expiry (invitations 7 days, resets 60 minutes and single use, proposals `validDays`); re-issuing kills the old link. Portal responses send `Referrer-Policy: no-referrer` so tokens don't leak through the Referer header; monitoring strips tokens from stored paths. | `credentials.ts`, `next.config.ts`, `monitoring.ts` |
| Input validation | zod schemas on every API input; ids must look like cuids; text is length-capped; content-editor text overrides can't inject ICU syntax or tags. | `validation.ts`, `app/lib/content/*` |
| Output | React escaping everywhere. The only raw HTML is two inline scripts: the intro's static boot script and JSON-LD built from site content (admin-edited; not yet escaped for `</script>`, see [Known issues](known-issues.md#open-bugs)). Email HTML escapes every user-supplied value. | `JsonLd.tsx`, `emailTheme.ts` |
| File uploads | Extension allow-list; MIME type derived from the extension and checked against the file's leading bytes; names stripped of path, control and bidi characters; size limit; direct-upload references must be in the project's own incoming folder and unclaimed. | `app/lib/portal/files.ts` |
| File downloads | Only through authorized routes; private Blob store; `Content-Disposition: attachment`, `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `no-store`. | `fileDownloadResponse()` |
| Headers | Portal: `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`. Admin and portal pages are `noindex`. `X-Powered-By` is off. | `next.config.ts` |
| Database | Prisma (parameterised queries); row-level security on every table with no policies, and the Supabase Data API disabled. | `prisma/migrations/20261109000000_enable_rls` |
| Configuration | The server refuses to start with missing or placeholder secrets. | `app/lib/env.ts` |
| Privacy | The portal and admin record no analytics; public analytics use no cookies and only a per-tab random id; client reviews are never published. | `HtmlDocument.tsx`, `analyticsClient.ts` |
| Abuse | In-memory rate limits on every public and portal mutation; honeypot field on the contact form. | `app/lib/rateLimit.ts` |

## Known limitations

- **Rate limits are per server instance**, in memory. On Vercel each warm instance counts
  separately, so they stop bursts from one client, not a distributed attack. A shared store
  (for example Upstash Redis) would make them strict.
- **Admin sessions can't be revoked one by one**: they are stateless. Signing out clears
  the cookie in that browser only. Rotating `AUTH_SECRET` ends every session (admin and
  clients).
- **No second factor** for the admin or clients.
- **No Content-Security-Policy on pages** (only on file downloads), and no explicit HSTS
  configuration in the app.
- **The admin path is obscured, not secret**: it is in the public repository. The login,
  rate limit and server-side checks are what protect it.
- **Next.js 16.1.1 has published security advisories**, including proxy-bypass issues.
  The admin and portal re-check sessions on the server and don't rely on the proxy alone,
  but upgrading (16.4.1 or later) is recommended. See
  [Deployment](deployment.md#routine-maintenance).
- **No self-service data deletion**: accounts, requests and projects can't be deleted from
  the UI, and clients can't change their email. Privacy requests have to be handled
  directly in the database.
- **Unclaimed direct uploads** are not cleaned up from Blob storage.

## Keeping secrets out of the repository

- Secrets live only in `.env` (git-ignored) and in Vercel's environment settings.
  `.env.example` holds names and placeholders only.
- `.gitignore` ignores env files, keys and certificates, databases, dumps, backups,
  uploads and logs. SQL is ignored except Prisma migrations. Upload and log folders are
  anchored to the repository root, because in the App Router folder names are URL
  segments and an unanchored rule could hide real routes.
- **Pre-commit hook** (`.githooks/pre-commit`, enable once per clone with
  `npm run hooks:install`):
  1. refuses env files, keys, databases, dumps, backups and upload/log folders, even when
     force-added, and any `.sql` outside `prisma/migrations*/`;
  2. scans the staged changes with gitleaks, values redacted, using `.gitleaks.toml`.
  It fails if gitleaks isn't installed (on Windows it also looks in winget's install
  folder).
- **`.gitleaks.toml`** extends the default rules with this project's secrets: Postgres URLs
  with passwords (allowing localhost and placeholders), Neon passwords, Resend keys, Blob
  tokens, Discord webhooks, the scrypt `ADMIN_PASSWORD_HASH` format, bcrypt hashes (except
  the `DUMMY_HASH` constant), and literal values assigned to any of the project's secret
  variable names.
- `npm run secrets:scan` scans the whole history.
- A false positive can be allowed with a `gitleaks:allow` comment on that line. Never
  bypass the hook with `--no-verify` to commit a real secret.
- If a secret is ever committed or pushed: **rotate it first** (see
  [Deployment](deployment.md#routine-maintenance)); deleting it from the code doesn't
  remove it from history or from forks and caches.

## Checklist for changes

- New page under the admin: call `requireAdminSession()` at the top; layouts alone aren't
  enough (they render in parallel and are skipped on client navigation).
- New admin API route: `authorizeAdmin(request, { mutation: true })` (or
  `authorizeAdminProject`) for anything that changes data.
- New portal API route: `authorizeClientProject(request, id, { mutation })`; read through
  `queries.ts` so visibility rules apply; never return internal fields (see `present.ts`).
- New public POST endpoint: zod validation and a rate limit.
- New table: enable row-level security in its migration.
- New secret: add it to `.env.example` as a placeholder, to `app/lib/env.ts` if it is
  required, and to `.gitleaks.toml`'s `project-secret-assignment` rule.
- Never put real tokens, URLs with credentials or personal data in code, docs, tests or
  commit messages.
