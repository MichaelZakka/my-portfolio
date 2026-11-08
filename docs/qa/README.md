# Manual test plan: michael-zakka-portfolio

The plan covers the public bilingual site, the project intake, proposals, the client portal, the admin dashboard, and the background jobs behind them. Limits, states and rate limits come from the code as of 2026-11-04 (commit `8c2c407`). If the code changes, re-check the numbers in the "Test data" column.

| File | What it covers |
|---|---|
| [01-visitor.md](01-visitor.md) | Guest visitor: marketing site, case studies, blog, language switch, contact form |
| [02-prospect.md](02-prospect.md) | Prospect: Work-with-me brief, proposal link (accept / ask for changes / decline) |
| [03-client.md](03-client.md) | Invitee + client: invitation, sign-in, password reset, portal project screens, account |
| [04-admin.md](04-admin.md) | Admin: sign-in, dashboard, requests, proposals, projects, clients, site health |
| [05-system.md](05-system.md) | All roles / system: email, cron, storage, monitoring, security headers, a11y, cross-browser, RTL, data integrity |
| [06-smoke-missed-questions.md](06-smoke-missed-questions.md) | Release smoke test, commonly missed scenarios, open questions, gaps found while writing this plan |

---

## 1. Platform profile

| | |
|---|---|
| **Name / purpose** | Personal portfolio of Michael Zakka (frontend developer) plus a lead-to-delivery pipeline: visitors send a project brief, the admin sends a priced proposal, the client accepts it and follows the project in a private portal. |
| **Platform type** | Responsive web app (no native apps). |
| **Tech stack** | Next.js 16.1.1 (App Router, `proxy.ts` as middleware), React 19.2, TypeScript, CSS Modules, next-intl, Prisma 6 + PostgreSQL, Resend (email), Vercel Blob (private file storage), Vercel Cron, Vercel Analytics + Speed Insights, first-party analytics table. |
| **Roles** | **Visitor** (anonymous). **Prospect** (submitted a brief; may hold a proposal link; no account). **Invitee** (has an invitation link; account row exists without a password). **Client** (portal account, member of 1+ projects). **Admin** (single account from env vars). **System** (cron, monitoring, uptime monitor). |
| **Core features** | Marketing site (EN at `/`, AR at `/ar`), case studies, blog (MDX), CV download, contact form (server action), 5-step project brief, admin dashboard (KPIs, visitors, requests pipeline, notes, status history), proposals (versioned, expiring, one-time links, e-signature), accept request / convert to project, client portal (projects, weighted progress, milestones + sign-off, tasks, meetings + .ics, messages + attachments + live polling + unread, files, activity feed, account), invitations, password reset, "view as client", site health + problem log. |
| **Integrations** | Resend (all email), Vercel Blob (files), Vercel Cron (`/api/cron/meeting-reminders`, daily 06:00 UTC), alert webhook (`ALERT_WEBHOOK_URL`), uptime monitor (`/api/health`), WhatsApp / mailto / tel links, GitHub / LinkedIn links. No payments and no OAuth. |
| **Devices / browsers** | Assumed: Chrome, Edge, Firefox, Safari (macOS + iOS), Samsung Internet, Chrome Android; 320–1920 px. Confirm (see questions). |
| **Languages** | English (LTR) and Arabic (RTL). Public site: URL prefix. Portal: `portal_locale` cookie + `User.locale` (also the email language). Proposal content has its own language. The intake survey is English-only, even on `/ar`. |
| **Currencies** | Proposals: USD, EUR, GBP, AED, SAR, QAR, KWD, SYP (whole units, 0–100,000,000). |
| **Time zones** | Admin: `PORTAL_TIME_ZONE` (falls back to UTC). Clients: browser zone saved by `TimeZoneSync`. Date-only fields are stored as UTC midnight. |

### Business rules the plan tests

| Rule | Value |
|---|---|
| Client password | ≥ 10 characters (Unicode code points), ≤ 72 **bytes** (bcrypt). No complexity rule, not trimmed. |
| Invitation link | 7 days. Resend issues a new token (old one dies). A new invitation for the same email + project revokes older pending ones. |
| Password reset link | 60 minutes, single use. A new request deletes older unused tokens. Reset signs out all sessions. |
| Sessions | Admin and client: 7 days, signed stateless cookies. Client cookie is SameSite=Lax, admin is Strict. Password change, password reset and "sign out other devices" bump `sessionVersion`. |
| Proposal | Draft → sent → accepted / changes_requested / declined / superseded; "expired" = sent and past `validUntil`. Valid 1–90 days (default 14). Only drafts are editable. Sending needs ≥ 1 phase and total > 0. Max 12 phases, 20 items per list. Accepting creates project + one milestone per phase + client account in one transaction. Declining marks the request Lost. Changes / decline still work after expiry; accept does not. |
| Milestone sign-off | One pending round per milestone. Approve → milestone Done. Changes (comment required) → In progress. Admin can withdraw a pending round. |
| Meetings | Proposed → confirmed → cancelled. Only the other side accepts. Either side reschedules (hands the decision back) or cancels. Start must be in the future. Durations 15/30/45/60/90/120. |
| Messages | 1–5000 chars (trimmed), or attachments only. ≤ 5 attachments sharing one 4 MB request. Email to the other side once per unread batch, again after 24 h. |
| Files | Default 4 MB (`PORTAL_MAX_UPLOAD_MB`; Vercel caps bodies at 4.5 MB). Allowed: pdf png jpg/jpeg gif webp zip docx xlsx pptx txt csv; the extension must match the file's leading bytes. Names: bidi/control/path characters stripped, max 150 chars. Downloads are always attachments. |
| Progress | Weighted by milestone `estimatedDays`. In-progress milestones get their task share, capped at 90 %. 100 % only when every milestone is Done. |
| Lead statuses | new, contacted, qualified, proposal, won, lost, archived (any → any by admin). |
| Project statuses | planning, in_progress, review, on_hold, completed. Plus archived (read-only for clients). |
| Rate limits (per instance, in memory) | Contact 5/10 min/IP · brief 5/10 min/IP · admin login 10/5 min/IP · portal login 10/5 min/IP + 10/15 min/email · forgot 5/15 min/IP + 3/h/email (silent) · reset 10/15 min/IP · invite accept 10/15 min/IP · proposal answer 10/15 min/IP · password change 5/15 min/user · sign-out-others 5/15 min/user · messages 20/min/user · uploads 20/10 min/user · meetings 20/10 min/user · reviews 20/10 min/user · analytics 120/min/IP (silent) · browser errors 10/10 min/IP (silent). |
| Meeting reminders | Daily cron. Confirmed meetings starting within 36 h, confirmed at least 6 h ago, project not archived, not already reminded. Rescheduling clears the reminder stamp. |

---

## 2. Test environment and setup

1. **Staging deployment** with its own Postgres and its own **private** Vercel Blob store. Never test against production data: `prisma/prisma/dev.db` holds real lead PII.
2. **Env vars:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (`npm run hash-password`), `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (a verified domain), `NEXT_PUBLIC_SITE_URL`, `PORTAL_TIME_ZONE` (e.g. `Asia/Damascus`), `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `ALERT_WEBHOOK_URL`, optionally `ALERT_EMAIL` / `PORTAL_NOTIFY_EMAIL`, `PORTAL_MAX_UPLOAD_MB`.
3. **Rate-limit tests:** run them against one instance (local `next build && next start`). The limiter is in memory per serverless instance, so on Vercel the exact count varies.
4. **Email capture:** use a real inbox with plus-addressing (`qa+tag@yourdomain`) for rendering checks in Gmail web, Gmail Android/iOS, Outlook (web + desktop) and Apple Mail. For bulk runs, point `RESEND_BASE_URL` at a local recorder (see the local Postgres testing notes).
5. **Time travel:** to test expiry (invitation 7 d, reset 60 min, proposal `validUntil`, reminders), edit `expiresAt` / `validUntil` / `confirmedAt` / `startsAt` in Prisma Studio (`npm run db:studio`) instead of waiting.
6. **Seed:** `npm run db:seed` creates the demo client `client@example.com` with a random password the script prints (or set `SEED_CLIENT_PASSWORD`).
7. **Tools:** two browsers or one normal + one private window (two sessions), browser devtools (network throttling, offline mode, cookie editor), `curl` (for API-level negative tests), axe DevTools or Lighthouse, NVDA (Windows) + VoiceOver (macOS/iOS) + TalkBack (Android), a colour-contrast checker.

### Standing test accounts and projects

| Ref | What | Setup |
|---|---|---|
| ADM | Admin | `ADMIN_EMAIL` + password |
| CA | Client A | Member of P1 and P3 |
| CB | Client B | Member of P2 only |
| CC | Client C | Second member of P1 (two clients on one project) |
| INV | Invitee | Pending invitation to P2, no password yet |
| PR | Prospect | Brief submitted, proposal sent, no account |
| P1 | Active project | ≥ 3 milestones with `estimatedDays`, tasks (some client-visible), files (some hidden), messages > 1 page, meetings in every state |
| P2 | Active project | CB only |
| P3 | Archived project | CA is a member |

### Test data catalogue (referenced by ID in the tables)

**Strings**

| ID | Value |
|---|---|
| S-XSS1 | `<script>alert('xss')</script>` |
| S-XSS2 | `"><img src=x onerror=alert(document.domain)>` |
| S-XSS3 | `<a href="javascript:alert(1)">click</a>` |
| S-JSURL | `javascript:alert(document.domain)` |
| S-DATAURL | `data:text/html,<script>alert(1)</script>` |
| S-SQL1 | `' OR '1'='1' --` |
| S-SQL2 | `Robert'); DROP TABLE "Lead";--` |
| S-TPL | `{{7*7}} ${7*7} <%= 7*7 %>` |
| S-CRLF | `Test\r\nBcc: victim@example.com` |
| S-EMOJI | `🚀 Launch 👩🏽‍💻 ✅` (includes a ZWJ sequence) |
| S-AR | `متجر إلكتروني للأزياء مع الدفع عند الاستلام` |
| S-MIX | `تطبيق Next.js v16 مع ٣ لغات و 2 API` |
| S-BIDI | `invoice` + U+202E + `fdp.exe` |
| S-ZW | text containing U+200B zero-width space |
| S-PAD | `   padded value   ` (leading/trailing spaces) |
| S-WS | 5 spaces only |
| S-NL | 3 paragraphs separated by blank lines, with a tab |
| S-LEN(n) | a string of exactly n characters (generate with `'a'.repeat(n)` in devtools) |
| S-HUGE | ~1 MB string |

**Emails**

| ID | Value | Notes |
|---|---|---|
| E-OK | `qa+ok@yourdomain.com` | |
| E-CASE | `QA+Case@YourDomain.COM` | must match the lower-cased account |
| E-PAD | `  qa+pad@yourdomain.com  ` | |
| E-NOTLD | `qa@example` | invalid everywhere |
| E-1TLD | `qa@example.c` | **passes the brief's regex, fails the portal's** |
| E-IDN | `مستخدم@مثال.com` | |
| E-PLUS | `qa+tag+more@yourdomain.com` | |
| E-254 / E-255 | 254 / 255-character address | |
| E-ADMIN | the `ADMIN_EMAIL` value | |

**Passwords**

| ID | Value | Expected by policy |
|---|---|---|
| PW-9 | `Abcdefgh1` | too short |
| PW-10 | `Abcdefgh12` | OK (boundary) |
| PW-72B | 72 ASCII characters | OK (boundary) |
| PW-73B | 73 ASCII characters | too long |
| PW-AR36 | 36 Arabic letters (72 bytes) | OK |
| PW-AR37 | 37 Arabic letters (74 bytes) | too long, although only 37 characters |
| PW-EMO10 | 10 emoji (40 bytes, 10 code points) | OK |
| PW-SP10 | 10 spaces | currently accepted (no complexity rule) |
| PW-PAD | ` Abcdefgh12 ` | accepted as typed; spaces are part of the password |

**Files**

| ID | File |
|---|---|
| F-PDF, F-PNG, F-JPG, F-JPEG, F-GIF, F-WEBP, F-ZIP, F-DOCX, F-XLSX, F-PPTX, F-TXT, F-CSV | one valid small file of each allowed type |
| F-UPPER | `REPORT.PDF` (valid PDF, upper-case extension) |
| F-EMPTY | 0-byte `empty.pdf` |
| F-4MB | exactly 4,194,304 bytes, valid PDF |
| F-4MB+1 | 4,194,305 bytes, valid PDF |
| F-10MB | 10 MB valid PDF |
| F-EXE | `setup.exe` |
| F-FAKEPDF | an `.exe` renamed to `invoice.pdf` |
| F-FAKETXT | binary with NUL bytes renamed `notes.txt` |
| F-SVG | `logo.svg` containing `<script>` |
| F-HTML | `page.html` |
| F-NOEXT | `README` (no extension) |
| F-DOUBLE | `photo.exe.png` (a real PNG) |
| F-AR | `عرض السعر النهائي.pdf` |
| F-LONG | 200-character file name ending `.pdf` |
| F-BIDI | name `report` + U+202E + `gnp.pdf` |
| F-DOT | `.hidden.txt` |
| F-PATH | file name `../../etc/passwd.txt` (set via curl `-F "file=@a.txt;filename=../../etc/passwd.txt"`) |
| F-6 | six small valid files |
| F-5x1MB | five 1 MB files (5 MB together) |

---

## 3. User journeys

### 3.1 Visitor (guest)

1. Discovers the site: search result, LinkedIn/GitHub link, shared link (Open Graph preview), typed URL.
2. Lands on `/` (English) or `/ar` (Arabic). No automatic language detection.
3. Reads the home sections: hero, about, strengths, projects grid, experience, skills, education, volunteering, call-to-action band, contact.
4. Opens a case study (`/projects/[slug]`), moves to the previous/next project, returns to the list.
5. Reads the blog (`/blog`, `/blog/[slug]`).
6. Switches language on any page.
7. Downloads the CV, follows GitHub / LinkedIn / email / phone / live-project links.
8. Sends the contact form, **or** opens Work with me (becomes a prospect).
9. Leaves. No account, so nothing to delete; analytics keep a per-tab session id only.

### 3.2 Prospect (brief sender, no account)

1. Opens `/work-with-me` (or `/ar/work-with-me`, English form).
2. Fills the 5 steps: overview → project type → business domain → brand identity → colours & visual direction.
3. Submits. The lead is saved and the admin is emailed. The prospect gets no confirmation email.
4. Waits while the admin triages the request (statuses new → contacted → qualified …).
5. **Path A, proposal:** receives the proposal email → opens `/portal/proposal/[token]` → reads it → accepts (signs, sets a password, becomes a client and lands in the new project), asks for changes (later gets v2), or declines. The link can expire, be replaced by a newer version, or be reissued.
6. **Path B, quick accept:** the admin clicks "Accept request" → the prospect receives a "request accepted" email with an invitation link → continues as an invitee.
7. **Path C, lost / archived:** nothing is sent. The lead stays in the admin pipeline indefinitely (there is no delete).

### 3.3 Invitee → client

1. Receives an invitation email (plain invite, or "request accepted").
2. Opens `/portal/invite/[token]` within 7 days.
3. New person: optional name + new password. Existing account: current password.
4. Lands on `/portal/projects/[id]`, signed in. The admin is emailed "client joined".
5. Signs in later at `/portal/login`, or resets the password at `/portal/forgot-password`.
6. Uses the portal home (active + archived projects, "awaiting approval" badges).
7. Inside a project: Overview → Milestones (approve / ask for changes) → Meetings (propose, accept, reschedule, cancel, add to calendar) → Messages (text + attachments, live) → Files (upload, download) → Activity.
8. Account page: display name, password, sign out other devices. Language switch; time zone synced automatically.
9. Gets emails: messages, status changes, meetings + reminders, approval requests.
10. Project archived → read-only. Removed from a project → loses access immediately.
11. Signs out. **Account deletion and email change are not available** (see gaps).

### 3.4 Admin

1. Signs in at `/admin/login` (env credentials).
2. Overview KPIs → Visitors analytics.
3. Requests: filter / search → open a request → update status, notes, last contacted.
4. Proposal: create draft → edit → preview → send → resend link, or revise as a new version → watch for the answer email.
5. Or "Accept request" (one click) / "Convert to project" (customised).
6. Projects list (active / archived / all) → project screen tabs: overview, milestones (+ tasks, sign-off), meetings, messages, files, clients (invite, resend, revoke, remove), activity (incl. internal audit), settings (edit, status, archive / restore).
7. "View as client" preview.
8. Site page: health checks, problem log (resolve one / all).
9. Signs out.

### 3.5 System

1. Vercel Cron calls the meeting-reminder job daily.
2. Server errors (`instrumentation.ts`), browser errors (`/api/errors`), failed emails and failed storage writes are grouped into the problem log, with alerts by email + webhook (first time, then at most hourly).
3. Uptime monitor polls `/api/health`.
4. Analytics beacons record page views and funnel events.
5. Vercel builds run `prisma migrate deploy` before `next build`.

---

## 4. Conventions

- **ID** = `ROLE-AREA-NN`. Roles: V visitor, PR prospect, C client/invitee, A admin, S system / cross-cutting.
- **Priority:** P0 = security, data loss, lost leads, contract/acceptance integrity, or a blocker on a core journey. P1 = core feature broken. P2 = edge cases, secondary flows, clear UX problems. P3 = cosmetic.
- **Type:** Happy / Negative / Edge / Security / UI / Accessibility / Integration. Concurrency, interrupted-flow and state-transition cases are tagged Edge or Negative, and their titles say which.
- **⚠ Gap** in an expected result means the code does not do what most products would. The row records current behavior so the test is repeatable; [06-smoke-missed-questions.md](06-smoke-missed-questions.md) lists every gap.
- "Two sessions" = two browsers, or one normal and one private window.
