# Testing

**For:** developers. How changes are checked, how to run the whole system against a
throwaway database, and how to use the manual test plan.

There is **no automated test suite**. A change is checked by:

1. `npm run lint` and `npm run build` (type checking happens in the build).
2. Running it locally, ideally as a production build against a throwaway database (below).
3. Exercising the affected screens in **both languages**, at **phone and desktop widths**,
   as each affected role (visitor, client, admin).
4. For larger changes, the relevant cases in the [manual test plan](../qa/README.md).

## A throwaway local database

Use a disposable Postgres so tests never touch real data. Prisma's local server is the
quickest. On Windows run it from **PowerShell**; in Git Bash `npx prisma dev` fails with
an "install npm" error.

```powershell
npx prisma dev -n portfolio -d          # prints a postgres://…@localhost:<port>/template1?sslmode=disable URL
```

`prisma dev` serves a single Postgres session, so append these parameters to the URL, or
you'll see "prepared statement s0 already exists" and later "Can't reach database server":

```text
&pgbouncer=true&connection_limit=1&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0
```

Then, in the same terminal, override **both** URLs (variables set in the shell win over
`.env`; if `.env` points anywhere real, forgetting one of them sends migrations there):

```powershell
$env:DATABASE_URL = "<local URL with the parameters>"
$env:DATABASE_URL_UNPOOLED = "<the same URL>"
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
$env:RESEND_API_KEY = ""                # no real email; links are printed in development
$env:STORAGE_LOCAL_DIR = "<a scratch folder>"   # keeps test uploads out of the repo
npm run db:deploy
npm run db:seed                         # prints the demo client's password
npm run build
npm start
```

Clean up with `npx prisma dev stop portfolio` and `npx prisma dev rm portfolio`.

### Traps

- `prisma dev` can die when a second Prisma client connects while `next start` holds the
  session (for example a cleanup script), and under `next build`'s parallel workers. It
  then leaves a stale lock ("Lock file is already being held"): run
  `npx prisma dev rm <name> --force`, start a new instance and `migrate deploy` again.
  Reset data through the app's APIs rather than a second client.
- Killing `next dev` can leave a half-written `.next/dev/types/routes.d.ts`, which breaks
  `next build` type checking and makes `next dev` answer 404 for every admin and portal
  page. Delete `.next/dev`.
- On Windows, stopping a background `next dev` / `next start` can leave the Node child
  process holding port 3000. Find it with `Get-NetTCPConnection -LocalPort 3000` and stop
  that process.
- A local database is too fast to show loading states or timing bugs (see the
  `router.refresh()` issue in [Known issues](known-issues.md#nextjs-161-traps)). A small TCP
  proxy that adds ~12 ms each way in front of the database port approximates production.
  Browser network throttling does not simulate a slow server.

## Useful recipes

**Admin session for API tests.** Generate a throwaway hash with
`node scripts/hash-password.mjs <password>`, export it as `ADMIN_PASSWORD_HASH` (keep
`ADMIN_EMAIL`), then log in with an `Origin` header and keep the cookie:

```bash
curl -c admin.txt -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<password>"}' http://localhost:3000/api/admin/login
curl -b admin.txt http://localhost:3000/api/admin/projects/<id>/view
```

**Client session.** The same with `POST /api/portal/auth/login` and the seeded client; add
a `portal_locale=ar` cookie to see the Arabic portal.

**Arabic request bodies from Git Bash.** Arguments are passed in the ANSI code page and
arrive garbled. Write the JSON to a UTF-8 file and send it with `--data-binary @file.json`.

**Emails end to end.** The Resend SDK honours `RESEND_BASE_URL`. Run a tiny local HTTP
server that records `POST /emails`, set `RESEND_BASE_URL` to it and a fake
`RESEND_API_KEY`, and use `@test.local` addresses. The same server can act as
`ALERT_WEBHOOK_URL`.

**The reminder job.** Set `CRON_SECRET` and call it:
`curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/meeting-reminders`.
Meetings only accept future start times, so create one a little ahead, confirm it, then
adjust `confirmedAt` / `startsAt` in Prisma Studio (`npm run db:studio`) to fall inside the
reminder window.

**Expiry.** Edit `expiresAt` (invitations, resets) or `validUntil` (proposals) in Prisma
Studio instead of waiting.

**Rate limits.** Test them against a single local `next start`: the limiter is per
instance, so counts on Vercel vary.

**Problem log.** `POST /api/errors` is rate-limited (10 per 10 minutes per IP, then
silently 204) and problems are grouped by a fingerprint that ignores digits ("problem 1"
and "problem 2" are one row). To test the Site page, insert `ErrorEvent` rows directly.

**Screenshots at phone width** without Playwright: headless Chrome over the DevTools
protocol, with the session cookie from `curl -c`. For one element, use
`captureScreenshot` with `captureBeyondViewport` and a clip from
`getBoundingClientRect()` (resizing the viewport resets scroll). `innerText` returns
CSS-uppercased text for some admin labels, so compare case-insensitively.

**Checking rendered text.** Portal pages ship every `portal.*` string to the browser, so
finding a message in the HTML proves nothing; inspect the rendered markup (React inserts
`<!-- -->` between adjacent text nodes).

**Schema and migrations match.** After writing a migration, run
`prisma migrate diff --from-url <migrated throwaway db> --to-schema-datamodel prisma/schema.prisma --script`;
an empty diff proves they agree.

## The manual test plan

[`docs/qa/`](../qa/README.md) holds a manual test plan by role (visitor, prospect, client,
admin, system) with test data, business rules, journeys, a release smoke test and known
gaps. It was written against commit `8c2c407` (4 November 2026). Since then, at least
these changed, so adjust the affected cases:

- The admin moved from `/admin` to `/admin-jfaygpory6` (10 November); `/admin` now 404s.
- Typed or bookmarked visits to inner public pages redirect to the home page
  (10 November).
- New: the Content editor (10 November), admin notifications (11 November), stored
  contact-form messages and the Messages screen (18 November), the contact-language choice
  in the brief (18 November), meeting creator ownership, meeting notes, task comments and
  change-request threads (18 November), and completion sign-off with private client
  reviews (19 November).
- Uploads: the default limit is now 25 MB per file, with browsers uploading straight to
  Vercel Blob; images show as a gallery.
- The local SQLite database mentioned in the plan (`prisma/prisma/dev.db`) is no longer
  used or tracked; test against a throwaway Postgres as above.

Run the release smoke test in [`06-smoke-missed-questions.md`](../qa/06-smoke-missed-questions.md)
after every production deploy that touches the portal or admin.
