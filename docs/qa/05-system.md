# Role: System and all roles (cross-cutting)

[← Index](README.md) · Test data IDs are defined in the [catalogue](README.md#test-data-catalogue-referenced-by-id-in-the-tables).

## Stage 1: Email delivery (Resend)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-EML-01 | Sender address is a verified domain | Production env | 1. Check `RESEND_FROM_EMAIL`. 2. Send any email to Gmail and Outlook. | — | From is your domain, not the default `onboarding@resend.dev` (which only delivers to the Resend account owner). SPF, DKIM and DMARC pass (Gmail "Show original"). | P0 | Integration |
| S-EML-02 | Every template in both languages | One trigger per email type × EN/AR | 1. Trigger: brief, contact, invite, request accepted, reset, message, status, client joined, meeting proposed/rescheduled/confirmed/cancelled/reminder, proposal, proposal response, review request, review response. | — | Correct language (admin mails English), correct names, no raw keys (`portalEmail.…`), absolute links to the production host, footer present. | P0 | Integration |
| S-EML-03 | Rendering matrix | All templates | 1. Open in Gmail web, Gmail iOS/Android, Outlook desktop (Windows), Outlook web, Apple Mail macOS/iOS, in light and dark mode. | — | Readable; buttons clickable; RTL correct in Arabic; no clipped content ("[Message clipped]" in Gmail means > 102 KB). | P1 | UI |
| S-EML-04 | Plain-text part | Any email | 1. View the text version. | — | Present and readable (links included). | P3 | Integration |
| S-EML-05 | Hostile content in emails | Names/messages with S-XSS1, S-XSS2, S-CRLF | 1. Trigger messages, meetings, proposal notes with them. | — | Escaped everywhere; subject single-line; no extra recipients. | P0 | Security |
| S-EML-06 | Reply-To | Client sends a message / proposes a meeting | 1. Reply to the admin notification. | — | Reply goes to the client (meeting emails set Reply-To). Record for message emails. | P2 | Integration |
| S-EML-07 | Provider outage | Invalid API key | 1. Trigger each email type. | — | The user action still succeeds; `emailSent=false` + error stored on the row (lead, invitation, message, proposal, review, activity meta); problem logged; admin UIs show "email not sent" with the link to share manually where one exists. | P0 | Integration |
| S-EML-08 | Bounce / invalid recipient | Invite `bounce@simulator.amazonses.com` or Resend's test bounce address | 1. Invite. | — | Delivery failure recorded (if Resend reports it synchronously) or at least the invite is shown as sent; note there is no bounce webhook. | P3 | Integration |
| S-EML-09 | Emails to a removed member | CA removed from P1 | 1. Admin changes P1's status, sends a message, proposes a meeting. | — | CA receives nothing about P1. | P0 | Security |
| S-EML-10 | Links never contain secrets except where intended | All emails | 1. Inspect every link. | — | Only invite, reset and proposal links carry tokens; no session tokens or ids beyond project ids. | P1 | Security |

## Stage 2: Scheduled jobs (Vercel Cron)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-CRON-01 | Reminder for a qualifying meeting | Confirmed 7 h ago, starts in 24 h, project active | 1. `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/meeting-reminders`. | — | JSON `{due:1, reminded:1}`; client members and admin each get one reminder in their zone/language; `reminderSentAt` set. | P0 | Integration |
| S-CRON-02 | Running twice does not double-send | After S-CRON-01 | 1. Run again. 2. Run two calls in parallel on a new meeting. | — | `reminded: 0` on the repeat; parallel calls send once. | P0 | Edge |
| S-CRON-03 | Window boundaries | Meetings starting in 35 h 59 m, 36 h 01 m, in the past | 1. Run. | — | Only the first is reminded. | P1 | Edge |
| S-CRON-04 | Recently confirmed meetings are skipped | Confirmed 2 h ago, starts in 10 h | 1. Run. | — | Not reminded (the confirmation is fresh). ⚠ If it starts in < 6 h of being confirmed, it never gets a reminder; confirm intended. | P2 | Edge |
| S-CRON-05 | Proposed, cancelled, archived | One of each | 1. Run. | — | None reminded. | P1 | Negative |
| S-CRON-06 | Rescheduled after a reminder | Reminded, then rescheduled and re-confirmed | 1. Run when the new time qualifies. | — | Reminded again for the new time. | P2 | Edge |
| S-CRON-07 | Auth | — | 1. No header. 2. Wrong secret. 3. `CRON_SECRET` unset. | — | 401, 401, 503. No emails. | P0 | Security |
| S-CRON-08 | Vercel actually calls it | Production | 1. Check Vercel → Cron Jobs logs after 06:00 UTC. | — | Daily 200 responses. A failure creates a Problem. | P1 | Integration |
| S-CRON-09 | Reminder time for far-away clients | Client in Pacific/Auckland, admin in Damascus | 1. Meeting at 09:00 Auckland. | — | Reminder arrives the previous day (06:00 UTC run) in their local time; content shows Auckland time. | P3 | Edge |

## Stage 3: File storage (Vercel Blob)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-STO-01 | Uploads go to the private Blob store | Production-like env | 1. Upload a file. 2. Check the Blob dashboard. | — | Object under `projects/<id>/<uuid>`, access private; `storageDriver = vercel-blob`. This driver was never tested against a real store — run this first. | P0 | Integration |
| S-STO-02 | Blob URLs are never exposed | — | 1. Inspect page HTML, API JSON and download responses. | — | No `blob.vercel-storage.com` URLs; downloads stream through `/api/.../files/<id>`. | P0 | Security |
| S-STO-03 | Local driver refused on Vercel | `STORAGE_DRIVER=local` on a Vercel preview | 1. Upload. | — | 503 "File storage is not configured."; problem logged. | P2 | Negative |
| S-STO-04 | Orphans after failures | Kill the DB mid-upload (staging) | 1. Upload. | — | Bytes removed again when the DB write fails (no orphan object). | P2 | Edge |
| S-STO-05 | Files from an older driver still download | Rows with `storageDriver=local` after switching to Blob | 1. Download them. | — | Work where the local files exist; otherwise 410 "no longer available" + problem. | P3 | Edge |

## Stage 4: Monitoring and health

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-MON-01 | Health endpoint up | — | 1. GET `/api/health`. | — | 200 `{status:"ok", checks:{database:"ok"}}`, `Cache-Control: no-store`, no config details. | P1 | Happy |
| S-MON-02 | Health endpoint with the DB down | Wrong `DATABASE_URL` on staging | 1. GET. | — | 503 `down`; problem logged (when the problem table itself is reachable). | P1 | Negative |
| S-MON-03 | Alerts on first occurrence, then hourly | `ALERT_WEBHOOK_URL` to a request bin, alert email set | 1. Trigger the same failure 5 times in 10 minutes. 2. Again after 61 minutes. | — | One email + one webhook call at first, none for the repeats, one more after the hour. Count = 6. | P1 | Integration |
| S-MON-04 | Server crash reported | Force a 500 in a route (staging) | 1. Hit it. | — | `instrumentation.ts` reports it with path; user sees an error page, not a stack trace. | P1 | Integration |
| S-MON-05 | Browser error reporting | Throw in a portal component (staging) | 1. Load. | — | Portal error page; `/api/errors` POST (204); problem with source `browser`, user agent, path. | P2 | Integration |
| S-MON-06 | Browser error endpoint abuse | curl | 1. POST 11 errors in 10 min. 2. POST from another Origin. 3. 501-char message. | — | 11th silently 204 without storing; cross-origin 403; long message 400. | P2 | Security |
| S-MON-07 | Uptime monitor configured | — | 1. Check UptimeRobot/Better Stack. | — | Monitors `/api/health` and alerts someone. | P2 | Integration |

## Stage 5: Security (manual checks across the app)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-SEC-01 | HTTPS everywhere | Production | 1. Open `http://` URLs. 2. Check HSTS. | — | Redirect to HTTPS; `Strict-Transport-Security` present (Vercel default). | P0 | Security |
| S-SEC-02 | Cookies | Signed in to both admin and portal | 1. Inspect cookies. | — | Both session cookies HttpOnly + Secure; admin SameSite=Strict, portal SameSite=Lax. `portal_locale` holds no secret. | P0 | Security |
| S-SEC-03 | Portal headers | Any `/portal` page and `/api/portal` response | 1. Inspect headers. | — | `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`. No `X-Powered-By`. | P0 | Security |
| S-SEC-04 | Admin and public headers | `/admin`, `/` | 1. Inspect headers. | — | Record: no CSP, no `X-Frame-Options` on admin, no `Permissions-Policy`. ⚠ Recommend adding at least frame protection to `/admin`. | P1 | Security |
| S-SEC-05 | Stored XSS sweep | Seed every free-text field (brief, contact, names, messages, notes, proposal content, meeting fields, milestone/task titles, review notes, file names) with S-XSS1/S-XSS2/S-XSS3 | 1. Visit every screen and email where each value appears (admin, portal, preview, proposal page, emails, `.ics`). | — | Text only, everywhere. | P0 | Security |
| S-SEC-06 | `.ics` injection | Meeting title/location with newline + `ATTENDEE:` lines (via curl) | 1. Download the `.ics`. | `X\r\nATTENDEE:mailto:evil@example.com` | Values escaped/folded; no extra attendees or events. | P2 | Security |
| S-SEC-07 | IDOR sweep with ids from another project | CA's cookie; ids of P2's milestone, task, file, meeting, member, invitation | 1. Try every client route with mixed ids. | — | 403/404 everywhere; nothing changes. (Admin routes: ids from P2 under P1's URL also 404.) | P0 | Security |
| S-SEC-08 | Mass assignment | curl | 1. PATCH project with `{ "id": "x", "requestId": "y", "createdAt": "2000-01-01" }`. 2. PATCH account with `{ "name":"x", "role":"admin", "email":"a@b.c" }`. | — | Extra fields ignored (zod objects strip unknown keys); role and email unchanged. | P0 | Security |
| S-SEC-09 | Cross-origin mutations | Signed in; a page on another origin | 1. POST to `/api/portal/projects/<P1>/messages` with `credentials: 'include'` from another origin. | — | 403 "Invalid request origin" (Origin header checked). Note: requests with **no** Origin header are allowed by design; SameSite is the main defence. | P0 | Security |
| S-SEC-10 | Rate limiting bypass via headers | Non-Vercel host | 1. Repeat the login brute force with a different `X-Forwarded-For` each time. | — | On Vercel the header is set by the platform (no bypass). On other hosts the per-IP limit can be bypassed; the per-email limit still stops it. Record. | P1 | Security |
| S-SEC-11 | Error responses leak nothing | — | 1. Send malformed JSON / wrong types to every API. | — | 400 with `code` + short message; no stack traces, SQL or file paths. | P1 | Security |
| S-SEC-12 | Secrets in the client bundle | Production build | 1. Search the JS bundles and `__NEXT_DATA__`/RSC payloads for `AUTH_SECRET`, `RESEND`, `BLOB`, `DATABASE_URL`, `CRON_SECRET`. | — | None present (only `NEXT_PUBLIC_*`). | P0 | Security |
| S-SEC-13 | Source maps / debug pages | Production | 1. Open `/_next/static/...js.map`, `/api/admin/errors` without auth. | — | No public source maps (or accepted); admin API 401. | P2 | Security |
| S-SEC-14 | Dependency advisories | — | 1. `npm audit --omit=dev`. | — | No high/critical issues. Note Next 16.1.1 has known advisories fixed in 16.4.1+; re-run the A-PRJ-05 refresh check after upgrading. | P1 | Security |
| S-SEC-15 | Lead PII in the repository | — | 1. Check that `prisma/prisma/dev.db` is not deployed or public. | — | Not served by the site; consider removing it from git history. | P1 | Security |
| S-SEC-16 | Password storage | DB access | 1. Inspect `User.passwordHash`, invitation/reset/proposal tokens. | — | bcrypt `$2b$12$…` hashes; only SHA-256 token hashes stored; no plain tokens anywhere in the DB or logs. | P0 | Security |
| S-SEC-17 | Timing on login and forgot password | — | 1. Time 20 requests for known vs unknown emails. | — | No consistent difference (dummy bcrypt; forgot email sent after responding). | P2 | Security |

## Stage 6: Performance and resilience

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-PERF-01 | Core Web Vitals | Production | 1. Lighthouse mobile for `/`, `/ar`, a case study, `/work-with-me`. | — | LCP < 2.5 s, CLS < 0.1, INP < 200 ms; Speed Insights field data agrees. | P1 | UI |
| S-PERF-02 | Arabic font loading | `/ar`, Slow 4G | 1. Load. | — | No invisible text for long (font-display swap); no big layout shift when IBM Plex Sans Arabic loads. | P2 | UI |
| S-PERF-03 | Portal project page with heavy data | P1 with 500 messages, 200 files, 1000 activity entries | 1. Open each tab. | — | First page of messages only; usable in < 3 s; scrolling smooth. | P2 | Edge |
| S-PERF-04 | Polling cost | Client tab open 1 h | 1. Watch the network tab. | — | One small `/updates` request per 15 s while visible; section re-reads only when a stamp changes. | P3 | Edge |
| S-PERF-05 | Cold start | After 30 min idle | 1. Open the portal and an API. | — | Responds in < 5 s; no timeouts on bcrypt-heavy routes (login, invite, reset). | P2 | Edge |
| S-PERF-06 | Database connection limits | 20 parallel portal users (k6/Artillery) | 1. Run a short load test. | — | No "too many connections" errors (pooled URL in use). | P2 | Integration |

## Stage 7: Accessibility (every page)

Run on: home EN + AR, case study, blog post, work-with-me, contact form, 404, portal login, invite, reset, portal home, each project tab, account, proposal page, admin login, admin dashboard, request detail, proposal editor, admin project tabs.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-A11Y-01 | Automated scan | axe DevTools | 1. Scan each page in the list. | — | No critical or serious violations. | P1 | Accessibility |
| S-A11Y-02 | Keyboard-only | No mouse | 1. Complete: contact form, survey, invite accept, send a message with an attachment, approve a milestone, propose a meeting, change password. | — | Everything reachable and operable; no keyboard traps; logical focus order (mirrored in RTL). | P0 | Accessibility |
| S-A11Y-03 | Visible focus | Keyboard | 1. Tab through each page. | — | Focus ring visible on every control, against the navy background (≥ 3:1). | P1 | Accessibility |
| S-A11Y-04 | Screen readers | NVDA + Firefox/Chrome, VoiceOver + Safari (macOS, iOS), TalkBack + Chrome | 1. Do the PR-SRV-01, C-INV-03, C-MSG-01 journeys. | — | Landmarks, headings in order, buttons/links named, form errors announced, status messages (toasts, success panels) announced via live regions. Arabic content read with an Arabic voice (`lang=ar`). | P1 | Accessibility |
| S-A11Y-05 | Colour contrast | Contrast checker | 1. Check text tokens (`--text`, `--text-muted`, `--text-dim`, `--accent-text`) on `--bg`, `--bg-elevated`, `--bg-elevated-2`; status badges; disabled text. | — | Body text ≥ 4.5:1, large text and UI parts ≥ 3:1. `--text-dim` is the likely failure; check it. | P1 | Accessibility |
| S-A11Y-06 | Zoom 200 % and 400 % | Desktop | 1. Zoom each page to 200 %, then 400 % (≈ 320 px reflow). | — | No loss of content or function; no horizontal scroll at 400 % (except data tables). | P1 | Accessibility |
| S-A11Y-07 | Text spacing | Bookmarklet setting line height 1.5, letter spacing 0.12em | 1. Apply on key pages. | — | No clipped or overlapping text. | P3 | Accessibility |
| S-A11Y-08 | Form labels and errors | — | 1. Inspect every form. | — | Visible labels, required marked in text, errors linked via `aria-describedby`, `aria-invalid` set. | P1 | Accessibility |
| S-A11Y-09 | Page language changes | `/ar` page containing English names; English survey inside `/ar` | 1. Inspect `lang` attributes. | — | Page `lang=ar`, English parts `lang=en` (the survey section does this). | P2 | Accessibility |
| S-A11Y-10 | Touch targets | Mobile | 1. Measure tap targets (chips, tab buttons, icon buttons). | — | ≥ 24×24 px (aim for 44×44). | P2 | Accessibility |

## Stage 8: Cross-browser and cross-device

Run the [smoke test](06-smoke-missed-questions.md#smoke-test-before-every-release) on each row of this matrix; run everything else on Chrome desktop + iPhone Safari.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-XB-01 | Chrome (latest) Windows + macOS | — | 1. Smoke test. | — | Passes. | P0 | UI |
| S-XB-02 | Safari (latest) macOS | — | 1. Smoke test. 2. File download names (F-AR). 3. Date/time pickers. | — | Passes; Arabic download names intact. | P0 | UI |
| S-XB-03 | iOS Safari (current and previous major) | iPhone SE (320 pt wide) and iPhone 15 | 1. Smoke test. 2. Rotate. 3. Upload from Photos/Files. | — | Passes; no zoom on input focus; sticky header OK with the address bar collapsing. | P0 | UI |
| S-XB-04 | Firefox (latest) | — | 1. Smoke test. | — | Passes. | P1 | UI |
| S-XB-05 | Edge (latest) | — | 1. Smoke test. | — | Passes. | P1 | UI |
| S-XB-06 | Chrome Android + Samsung Internet | Mid-range Android | 1. Smoke test. | — | Passes; colour pickers and file chooser work. | P1 | UI |
| S-XB-07 | Tablet | iPad portrait/landscape | 1. Home, portal project, admin project. | — | Layout uses the space; no awkward breakpoints at 768/1024. | P2 | UI |
| S-XB-08 | Large screens | 1920 and 2560 px | 1. Home, portal, admin. | — | Content width capped; no stretched images. | P3 | UI |
| S-XB-09 | Third-party cookies blocked / strict tracking protection | Safari ITP, Firefox strict, Brave | 1. Sign in to the portal and admin. | — | Works (first-party cookies only). | P1 | Integration |
| S-XB-10 | Private / incognito windows | — | 1. Survey, portal sign-in, analytics. | — | Work; sessionStorage failures are handled silently. | P2 | Edge |

## Stage 9: Localization and RTL

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-L10N-01 | No missing translations | — | 1. Compare key sets of `messages/en.json` and `messages/ar.json` (script). 2. Click through every screen in Arabic. | — | Same keys in both; no English left in Arabic screens except the intake survey (known) and proper nouns. | P1 | UI |
| S-L10N-02 | Mirrored layout | Arabic | 1. Check every screen. | — | Logical properties used (padding/margins/borders swap), directional icons flipped, numbers and emails stay LTR, progress bars fill from the right. | P1 | UI |
| S-L10N-03 | Long translations | Arabic + a pseudo-locale with +40 % length | 1. Check buttons, tabs, badges, nav. | — | No truncation hiding meaning; wraps gracefully. | P2 | UI |
| S-L10N-04 | Date, time and number formats | EN and AR, several zones | 1. Compare dates on messages, meetings, files, proposals, emails. | — | Locale-appropriate format; consistent digit style across portal and emails; date-only fields never shift a day. | P1 | UI |
| S-L10N-05 | Plural rules in Arabic | Counts 0, 1, 2, 3, 11, 100 for unread / awaiting approval / days | 1. Set those counts. | — | Correct Arabic plural forms (zero, one, two, few, many, other). | P2 | UI |
| S-L10N-06 | Mixed-direction user content | S-MIX in every free-text field | 1. View it on each screen and email. | S-MIX | Readable order; punctuation at the correct end. | P2 | UI |
| S-L10N-07 | Language state is independent per area | Public site Arabic, portal English | 1. Switch the public site to Arabic. 2. Open the portal. | — | Portal keeps its own language (cookie + account), and vice versa. Consistent and explainable. | P3 | Edge |

## Stage 10: Data integrity (end to end)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| S-DATA-01 | Brief → admin page → email → proposal draft | Brief with every field (S-AR, S-EMOJI, special characters) | 1. Compare each field across the admin request page, the admin email, and the proposal draft defaults. | — | Identical values everywhere (trimmed); arrays in the same order. | P0 | Integration |
| S-DATA-02 | Proposal → project | Accepted proposal | 1. Compare snapshot vs project: name, summary, phases → milestones (order, title, description, estimatedDays, due dates), ETA, client account email/name/locale. | — | All match. The snapshot hash matches the stored snapshot (recompute SHA-256). | P0 | Integration |
| S-DATA-03 | Progress is the same everywhere | P1 | 1. Compare portal home, portal overview, admin list, admin project, preview. | — | Same percentage. | P1 | Integration |
| S-DATA-04 | Unread counts are consistent | Messages between CA, CC, admin | 1. Compare client home badge, project tab, admin sidebar, admin list. | — | Consistent and cleared at the same moments. | P2 | Integration |
| S-DATA-05 | Visibility is consistent | Internal task, hidden file, withdrawn review | 1. Check client UI, preview, client APIs, emails, activity feed. | — | Hidden everywhere on the client side; visible to the admin. | P0 | Security |
| S-DATA-06 | Lead status history | Lead taken through proposal sent → declined → v2 sent → accepted | 1. Read the status history. | — | New → Proposal ("Proposal v1 sent") → Lost ("Proposal v1 declined") → Proposal ("Proposal v2 sent") → Won, each with its automatic note. | P2 | Integration |
| S-DATA-07 | Names propagate | Client renames themselves | 1. Check new messages, admin members, emails. | — | New name used going forward. | P3 | Integration |
| S-DATA-08 | Migrations on deploy | Fresh preview deployment | 1. Watch the Vercel build (`prisma migrate deploy && next build`). | — | Migrations apply cleanly; the site works on the empty DB; no seed data in production. | P0 | Integration |
| S-DATA-09 | Backups and restore | Production DB provider | 1. Confirm automatic backups. 2. Restore one to staging. | — | Restore works and the app runs on it. | P1 | Integration |
