# Deployment and operations

**For:** developers and whoever manages the hosting accounts. How production is set up,
how a deploy works, and how to run and maintain it.

- [Production at a glance](#production-at-a-glance)
- [How a deploy works](#how-a-deploy-works)
- [Setting up from scratch](#setting-up-from-scratch)
- [Database (Supabase)](#database-supabase)
- [File storage (Vercel Blob)](#file-storage-vercel-blob)
- [Email (Resend)](#email-resend)
- [Scheduled job (meeting reminders)](#scheduled-job-meeting-reminders)
- [Monitoring](#monitoring)
- [Routine maintenance](#routine-maintenance)
- [Hosting somewhere other than Vercel](#hosting-somewhere-other-than-vercel)

## Production at a glance

| Piece | Where | Notes |
| --- | --- | --- |
| App | Vercel, functions pinned to **cdg1** (Paris) by `vercel.json` | Canonical domain `https://michael-zakka.com` (apex, no www); the `*.vercel.app` address redirects to it. |
| Database | Supabase Postgres, AWS **eu-west-3** (Paris) | Runtime traffic through the transaction pooler (6543), migrations through the session pooler (5432). |
| Files | Vercel Blob, private store | Connected to the Vercel project (`BLOB_READ_WRITE_TOKEN`). |
| Email | Resend, from a verified domain | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. |
| Scheduled job | Vercel Cron, daily 06:00 UTC | `/api/cron/meeting-reminders` with `CRON_SECRET`. |
| Analytics | First-party table + Vercel Analytics and Speed Insights | |
| Search | Google Search Console | Verified by `public/google39f1672fd8b0be24.html` (keep that file). |

Keep the functions and the database in the same region: when functions ran in `iad1`
(Washington), every query paid ~400 ms of transatlantic latency. If the Blob store was
created in another region, file transfers (rare) cross that distance instead.

## How a deploy works

1. A push to GitHub triggers a Vercel build. Vercel runs `npm run vercel-build`:
   `prisma migrate deploy && next build` (`npm install` has already run
   `prisma generate`).
2. Pending migrations are applied to the database the build's `DATABASE_URL_UNPOOLED`
   points at. If the database is unreachable or a migration fails, the build fails and
   the previous deployment keeps serving.
3. `next build` needs no secrets (the startup check is skipped during builds).
4. When a function starts, `instrumentation.ts` validates the environment; a missing
   required variable makes it exit with a message naming the variable (visible in the
   Vercel function logs).

> **Preview deployments run migrations too.** If the Preview environment uses the
> production database credentials, pushing a branch with a new migration applies it to
> production before the branch is merged. Give Preview its own database, or only push
> migrations you are ready to ship.

Vercel's production branch should be `master`, the repository's main branch (check
Vercel → Project → Settings → Git). Pushing to it deploys to production, so run
`npm run lint` and `npm run build` first.

## Setting up from scratch

1. **Supabase**: create the project in the same region you will run functions in.
   Disable the Data API (Project Settings → Data API); this app only talks to Postgres
   through Prisma. Copy the transaction-pooler and session-pooler connection strings.
2. **Vercel**: import the repository. Set the region in `vercel.json` to match the
   database. Add the environment variables from [Configuration](configuration.md) for
   **Production and Preview**: at minimum the five required ones, plus
   `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PORTAL_TIME_ZONE`,
   `CRON_SECRET`, and ideally `ALERT_WEBHOOK_URL`. Set the production branch.
3. **Blob**: Vercel → Storage → create a Blob store and connect it to the project (this
   adds `BLOB_READ_WRITE_TOKEN`).
4. **Resend**: verify the sending domain, create an API key.
5. **Domain**: add it in Vercel → Domains and make it the primary domain.
6. **Deploy.** The first build creates every table through the migrations.
7. **Check**: `/api/health` answers 200; sign in to the admin; the **Site** page shows
   green checks; send a test brief; invite yourself to a test project and upload and
   download a file; then archive that project.
8. **Uptime**: point an uptime monitor at `/api/health` every 5 minutes.

## Database (Supabase)

| Variable | Connection | Why |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler, port 6543, `?sslmode=require&pgbouncer=true&connection_limit=…` | Serverless functions open many short connections; `pgbouncer=true` turns off prepared statements, which transaction pooling can't handle. Production uses `connection_limit=5`. |
| `DATABASE_URL_UNPOOLED` | Session pooler, port 5432, `?sslmode=require` | `prisma migrate` needs a session. The "direct connection" host is IPv6-only without Supabase's IPv4 add-on, and Vercel builds use IPv4. |

Percent-encode special characters in the password.

**Row-level security.** Migration `20261109000000_enable_rls` enabled RLS (with no
policies) on every table, and every later migration enables it on the tables it adds.
That blocks Supabase's Data API roles even if the Data API is ever re-enabled, without
affecting Prisma (which connects as the table owner).

**Applying migrations by hand** (e.g. to check a migration before deploying), from
PowerShell, without writing the URLs into `.env`:

```powershell
$env:DATABASE_URL = "<pooled URL>"
$env:DATABASE_URL_UNPOOLED = "<session-pooler URL>"
npm run db:deploy
```

Close the terminal afterwards so the variables don't linger. `migrate deploy` only applies
what is missing, so it is safe to repeat.

**Backups.** Check what your Supabase plan includes, and keep your own copy of anything
important (`pg_dump` against the session pooler). Database dumps must never be committed:
`.gitignore` and the pre-commit hook refuse `*.sql` (outside migrations), `*.dump`, `*.db`
and similar.

## File storage (Vercel Blob)

- With `BLOB_READ_WRITE_TOKEN` set, uploads go to Blob (or force it with
  `STORAGE_DRIVER=vercel-blob`). The local driver is refused on Vercel: uploads answer 503
  rather than writing to a disposable disk.
- Blobs are private. Browsers never get a blob URL; downloads stream through the
  authorized routes.
- Browsers upload directly to Blob with short-lived tokens, so the per-file limit
  (`PORTAL_MAX_UPLOAD_MB`, default 25) isn't bound by Vercel's 4.5 MB request body limit.
  If the Vercel environment still sets `PORTAL_MAX_UPLOAD_MB=4` from before direct
  uploads existed, raise or remove it.
- Direct uploads that are never claimed (the tab closed between upload and save) stay in
  `projects/<id>/incoming/`; nothing cleans them up yet. They are harmless but use storage.
- After connecting a new store, upload and download one file on a preview deployment.

## Email (Resend)

- Verify the domain and set `RESEND_FROM_EMAIL` on it. Without a verified domain, Resend's
  test sender only delivers to the Resend account's own address.
- `NEXT_PUBLIC_SITE_URL` must be the canonical URL: every link in every email is built
  from it.
- Each send's outcome is stored on the related row and shown in the admin; failures are
  also reported to the problem log.
- Where notifications go: briefs → `INBOX_EMAIL` (`app/lib/projectBrief.ts`); contact
  form → `CONTACT_TO_EMAIL`; client activity → `PORTAL_NOTIFY_EMAIL`; alerts →
  `ALERT_EMAIL`. Each falls back to the inbox.

## Scheduled job (meeting reminders)

`vercel.json` schedules `GET /api/cron/meeting-reminders` daily at 06:00 UTC. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically once `CRON_SECRET` is set; without it
the route answers 503 and no reminders go out. The job reminds about confirmed meetings in
the next 36 hours (details in
[Portal internals](portal-internals.md#meetings-calendar-files-and-reminders)) and is safe
to run more often. To trigger it by hand:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://michael-zakka.com/api/cron/meeting-reminders
```

## Monitoring

- **Problem log**: `reportError()` (`app/lib/monitoring.ts`) records failures in
  `ErrorEvent`, grouped by a fingerprint of source + normalised message (digits and long
  ids stripped), and alerts by email and webhook on the first occurrence and then at most
  hourly while unresolved (max 10 alerts per hour per instance; when the database is down
  it still alerts, throttled in memory). Sources:
  - `request`: unhandled errors in pages, route handlers and the proxy
    (`instrumentation.ts` → `onRequestError`)
  - `browser`: crashes caught by the portal and admin error boundaries (`/api/errors`)
  - `storage`, `email`, `database`, `cron`, `intake`: handled failures reported where they
    happen
- Tokens in URLs are stripped before paths are stored or sent (`safePath()`).
- **Health**: `/api/health` (200 / 503) for an external uptime monitor.
- **Logs**: Vercel → Project → Logs. Every reported problem is also logged with a
  `[monitor:<source>]` prefix.
- The admin **Site** page shows configuration health and the open problems.

## Routine maintenance

| Task | How |
| --- | --- |
| Change the admin password | `npm run hash-password -- "new password"` → `ADMIN_PASSWORD_HASH` in Vercel → redeploy. |
| Rotate `AUTH_SECRET` | New random value in Vercel → redeploy. Signs out the admin and every client. |
| Rotate the database password | Reset it in Supabase, update **both** URLs in Vercel (and your `.env`), redeploy. |
| Rotate `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `ALERT_WEBHOOK_URL` | Create the new value at the provider, update Vercel, redeploy, revoke the old one. |
| Upgrade Next.js | Next 16.1.1 has published security advisories (including proxy bypasses); upgrade to 16.4.1 or later. Afterwards re-test the flows listed in [Known issues](known-issues.md#nextjs-161-traps). |
| Upgrade dependencies | `npm outdated`, upgrade, then `npm run lint`, `npm run build`, and a manual pass over the public site, admin and portal in both languages. |
| Replace the CV | Replace `public/michael-zakka-cv.pdf` (or point the CV link in Content → Profile & contact elsewhere). |
| Clean up | Resolve old problems in Site → Problems; archive finished projects. |

## Hosting somewhere other than Vercel

The app is a standard Next.js server (`npm run build && npm start`, Node 20.9+). Without
Vercel you need to: provide the environment variables; schedule the reminder job yourself
(for example an hourly crontab entry with the `curl` above); choose storage (the local
driver works on a single server with a persistent disk, or implement a `StorageDriver`
for S3-compatible storage in `app/lib/portal/storage.ts`); and make sure the proxy in
front forwards `x-forwarded-for`, which the rate limiter and the proposal signature
record use for the client IP. Vercel-specific extras (Analytics, Speed Insights, the
`x-vercel-ip-country` header) simply stop reporting.
