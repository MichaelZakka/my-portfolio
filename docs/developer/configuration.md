# Configuration

**For:** developers and whoever manages the Vercel project. Every environment variable,
script-relevant setting and configuration file.

Locally, variables live in `.env` (git-ignored; copy `.env.example`). The Prisma CLI reads
only `.env`, so don't rely on `.env.local` for the database. In production they live in
Vercel → Project → Settings → Environment Variables, set for **Production and Preview**.
Never commit real values: the repository is public, and the pre-commit hook and
`.gitleaks.toml` look for this project's secrets specifically.

## The startup check

`instrumentation.ts` calls `validateServerEnvOrExit()` (`app/lib/env.ts`) when the Node
server starts. If a **required** variable is missing, malformed or still the
`.env.example` placeholder, the server prints one error naming every problem (never the
values) and exits with code 1, instead of serving 500s. It is skipped during
`next build`, so builds need no secrets. In production it also warns about unset
recommended variables. `SKIP_ENV_VALIDATION=1` disables it (emergencies only).

## Environment variables

### Required

| Variable | Used for | Format and notes |
| --- | --- | --- |
| `DATABASE_URL` | Every database query at runtime | Supabase **transaction pooler** (port 6543) with `?sslmode=require&pgbouncer=true&connection_limit=1` (production currently runs with `connection_limit=5`). Percent-encode special characters in the password. Must start with `postgres://`, `postgresql://` or `prisma+postgres://`. |
| `DATABASE_URL_UNPOOLED` | `prisma migrate` (Prisma's `directUrl`) | Supabase **session pooler** (port 5432) with `?sslmode=require`. Transaction poolers break migrations. Use the session pooler rather than the "direct connection" host, which is IPv6-only unless the IPv4 add-on is enabled (Vercel builds use IPv4). |
| `AUTH_SECRET` | Signing admin and portal session cookies | At least 16 characters (32+ random recommended). Changing it signs everyone out. |
| `ADMIN_EMAIL` | The only admin login; also the admin's author account in the portal | An email address. It can never be invited as a client. |
| `ADMIN_PASSWORD_HASH` | Verifying the admin password | `salt:hash` from `npm run hash-password -- "password"` (scrypt). Never the password itself. |

### Site and email

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://michael-zakka.com` | Canonical origin for metadata, sitemap, robots, JSON-LD, and every link in emails (never taken from the request's Host header). Set `http://localhost:3000` locally to get working portal links. Recommended in production. |
| `RESEND_API_KEY` | empty: no email is sent | Without it, briefs and messages are still saved; in development invitation and reset links are printed to the console. Recommended in production. |
| `RESEND_FROM_EMAIL` | `Michael Zakka <hello@michael-zakka.com>` | Must be on a domain verified in Resend. |
| `CONTACT_TO_EMAIL` | `INBOX_EMAIL` in `app/lib/projectBrief.ts` | Where home page contact-form messages go. Project briefs always go to `INBOX_EMAIL`. |
| `PORTAL_NOTIFY_EMAIL` | `INBOX_EMAIL` | Where client activity is emailed to the admin (messages, approvals, meetings, comments, completion, reviews, proposal answers). |

### Monitoring and jobs

| Variable | Default | Notes |
| --- | --- | --- |
| `ALERT_EMAIL` | `PORTAL_NOTIFY_EMAIL`, then `INBOX_EMAIL` | Recipient of problem alerts. |
| `ALERT_WEBHOOK_URL` | empty | Slack or Discord incoming webhook for problem alerts (the body carries both `text` and `content`). Treat it as a secret. Recommended, so you hear about email outages. |
| `CRON_SECRET` | empty: reminders disabled | Bearer token for `/api/cron/meeting-reminders`. Vercel Cron sends it automatically once set. Recommended in production. |

### Client portal and storage

| Variable | Default | Notes |
| --- | --- | --- |
| `PORTAL_TIME_ZONE` | `UTC` | IANA zone (e.g. `Asia/Damascus`) for the admin's screens and emails, and the fallback for clients whose browser zone isn't known yet. Invalid values fall back to UTC. |
| `PORTAL_MAX_UPLOAD_MB` | `25` (capped at 100) | Per-file upload limit. With Vercel Blob, browsers upload directly to the store, so it can exceed Vercel's 4.5 MB body limit. |
| `STORAGE_DRIVER` | `vercel-blob` when `BLOB_READ_WRITE_TOKEN` is set, else `local` | `local` or `vercel-blob`. `local` is refused on Vercel (uploads answer 503). |
| `STORAGE_LOCAL_DIR` | `.uploads` | Folder for the local driver (git-ignored). |
| `BLOB_READ_WRITE_TOKEN` | empty | Added by Vercel when a Blob store is connected. Required for uploads on Vercel. Recommended in production. |

### Development and emergencies

| Variable | Notes |
| --- | --- |
| `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` | Demo client for `npm run db:seed` (default `client@example.com`; empty password = random, printed). |
| `SKIP_ENV_VALIDATION` | `1` or `true` skips the startup check. |
| `RESEND_BASE_URL` | Read by the Resend SDK itself; point it at a local recorder to capture emails in tests (see [Testing](testing.md)). |

`NODE_ENV`, `NEXT_RUNTIME`, `NEXT_PHASE` and `VERCEL` are set by the platform and read by
the code (drafts and TODO placeholders, the startup check, the storage guard).

## Hard-coded settings worth knowing

| Setting | Where | Value |
| --- | --- | --- |
| Production site URL | `app/lib/site.ts` → `SITE_URL` | `https://michael-zakka.com` |
| Inbox for briefs (and default for other notifications) | `app/lib/projectBrief.ts` → `INBOX_EMAIL` | the owner's address |
| Public profile defaults (email, LinkedIn, CV path, GitHub and source-repo links) | `app/lib/site.ts` | `GITHUB_URL` and `SOURCE_REPO_URL` are `null` (hidden) until set; all editable in the Content editor |
| Person data for JSON-LD | `app/lib/seo.ts` → `PERSON` | The phone number there is private: used only as the Content editor's default, never rendered unless switched on |
| Admin path | folder name `app/admin-jfaygpory6`, plus string literals in `proxy.ts`, `session.ts`, `notices.ts`, `notify.ts`, `proposals.ts`, the sidebar | Renaming it means updating every literal (`grep -r admin-jfaygpory6`) |
| Session lifetime | `app/lib/auth.ts` | 7 days (admin and portal) |
| Portal rules (statuses, limits, TTLs, upload types) | `app/lib/portal/constants.ts` | See [Portal internals](portal-internals.md) |
| Proposal starting content | `app/lib/portal/proposalDefaults.ts` | Phases per project type, payment terms, in both languages |

## Configuration files

| File | What it configures |
| --- | --- |
| `next.config.ts` | next-intl plugin (`./i18n/request.ts`); `poweredByHeader: false`; image formats (AVIF, WebP), sizes and a 30-day cache TTL; `optimizePackageImports` for lucide-react; `experimental.authInterrupts` (for `forbidden()`); security headers on `/portal` and `/api/portal` (no framing, noindex, no referrer). |
| `vercel.json` | Functions region `cdg1` (Paris, next to the database); the daily cron `0 6 * * *` → `/api/cron/meeting-reminders`. |
| `proxy.ts` | Middleware: auth gates and locale routing (see [Architecture](architecture.md#request-flow-and-proxyts)). |
| `instrumentation.ts` | Startup env check; `onRequestError` → `reportError()`. |
| `prisma/schema.prisma` | PostgreSQL datasource with `url` and `directUrl`; the data model. |
| `tsconfig.json` | Strict TypeScript, bundler resolution, `@/*` alias (unused). |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals and TypeScript rules. |
| `postcss.config.mjs` | Empty plugin list (no Tailwind). |
| `.env.example` | The template for `.env`, with every variable and a comment. |
| `.gitignore`, `.gitattributes` | Secrets, data dumps, uploads ignored (anchored to the root because App Router folders are URL segments); migrations re-included; hooks forced to LF. |
| `.githooks/pre-commit`, `.gitleaks.toml` | Secret guard (see [Security](security.md#keeping-secrets-out-of-the-repository)). |
| `package.json` | Scripts (see the [developer guide](README.md#scripts)); `postinstall: prisma generate`; AGPL-3.0-only licence; a zod override so every package uses the same zod. |
