# Role: Admin

[← Index](README.md) · Test data IDs are defined in the [catalogue](README.md#test-data-catalogue-referenced-by-id-in-the-tables).

## Stage 1: Sign in and session

### Feature: `/admin/login`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-LOG-01 | Sign in | Env configured | 1. Enter `ADMIN_EMAIL` + password → Sign in. | ADM | Redirect to `/admin`. `admin_session` cookie: HttpOnly, Secure (prod), SameSite=Strict, ~7 days. | P0 | Happy |
| A-LOG-02 | Email case / spaces | — | 1. Sign in with the email upper-cased and padded. | — | Succeeds. | P2 | Edge |
| A-LOG-03 | Wrong password / wrong email | — | 1. Each. | — | Same "Invalid email or password." | P0 | Security |
| A-LOG-04 | Rate limit | Single instance | 1. 11 attempts in 5 min. | — | 11th → 429 "Too many login attempts". | P0 | Security |
| A-LOG-05 | Not configured | Unset `ADMIN_PASSWORD_HASH` on staging | 1. Open `/admin`. 2. Try to sign in. | — | `/admin` redirects to login (fails closed); sign-in → 503 "not configured". `/api/admin/*` → 401. | P0 | Security |
| A-LOG-06 | Return to the requested page | Signed out | 1. Open `/admin/requests`.<br>2. Sign in. | — | Lands on `/admin/requests`. | P2 | Happy |
| A-LOG-07 | **Open redirect via `from`** | Signed out | 1. Open `/admin/login?from=https://evil.example` → sign in.<br>2. Repeat with `//evil.example` and `javascript:alert(1)`. | S-JSURL | Must stay on the site (`/admin`). ⚠ Likely fails today: the admin login form pushes `from` to the router without checking it (the portal login does check). Release blocker. | P0 | Security |
| A-LOG-08 | Admin pages re-check the session | Signed in, `/admin` open | 1. Delete the cookie in devtools.<br>2. Click a sidebar link (client-side navigation). | — | Redirect to login; no data rendered. | P0 | Security |
| A-LOG-09 | Every admin API rejects missing / bad cookies | curl | 1. Call each `/api/admin/*` route without a cookie, then with a tampered one, then with a client's `portal_session` value placed in `admin_session`. | — | 401 for all. | P0 | Security |
| A-LOG-10 | Sign out | Signed in | 1. Sign out.<br>2. Press Back. | — | Login page; Back does not show cached data. | P1 | Happy |
| A-LOG-11 | Signed-out admin cookie replay | Copy the cookie, sign out, set it again | 1. Open `/admin`. | — | ⚠ Gap: still valid until it expires (no server-side revocation; only rotating `AUTH_SECRET` kills it). | P1 | Security |
| A-LOG-12 | Admin pages can be framed? | Any admin page | 1. Check response headers.<br>2. Embed `/admin` in an `<iframe>` on another origin. | — | Expected: `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`. ⚠ Gap: the header config only covers `/portal`; admin pages may be frameable (clickjacking). | P1 | Security |
| A-LOG-13 | CSRF on admin mutations | Signed in; a test page on another origin | 1. From the other origin, `fetch` POST/PATCH an admin API with credentials. | — | Blocked (SameSite=Strict cookie not sent, and the Origin check returns 403). | P0 | Security |

## Stage 2: Overview and analytics

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-DASH-01 | KPI cards | Known data: 3 leads today, 10 total, 2 won | 1. Open `/admin`. | — | Visitors today / 7 d / 30 d, total requests (10, "3 today"), new requests, conversion rate (definition documented: won ÷ total?). Numbers match the DB. | P1 | Happy |
| A-DASH-02 | Status breakdown and recent leads | — | 1. Check the lists. | — | Counts per status add up to the total; recent leads link to their pages. | P2 | Happy |
| A-DASH-03 | Empty database | Fresh DB | 1. Open `/admin`. | — | Zeros and empty states; no NaN %, no crash. | P2 | Edge |
| A-DASH-04 | "Today" uses the admin's time zone | Lead created 23:30 Damascus time | 1. Check "today" counts before and after midnight Damascus. | — | Counts follow the intended zone (record whether UTC or `PORTAL_TIME_ZONE`). | P2 | Edge |
| A-VIS-01 | Visitors page | Some traffic | 1. Open `/admin/visitors`. | — | Views today/7 d/30 d, unique 30 d, chart, top pages, referrers, campaigns, devices, countries. | P2 | Happy |
| A-VIS-02 | Visitors empty states | No events | 1. Open. | — | "No traffic data yet", "No referrer data yet", "No campaign traffic yet" with the UTM hint. | P3 | Edge |
| A-VIS-03 | Funnel events | Survey started / steps / submitted / abandoned recorded | 1. Check the funnel (dashboard or visitors). | — | Matches the actions taken in PR-SRV/PR-SUB rows. | P2 | Integration |
| A-VIS-04 | Hostile analytics values are escaped | Send an event with `path`/`label`/`referrer` = S-XSS2 via curl | 1. Open Visitors. | S-XSS2 | Shown as text; chart labels intact. | P1 | Security |
| A-VIS-05 | Chart accessibility | Screen reader | 1. Read the line chart. | — | Has a text alternative or data table; not colour-only. | P3 | Accessibility |

## Stage 3: Requests (leads)

### Feature: Requests list `/admin/requests`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-REQ-01 | List shows every lead newest first | 10 leads | 1. Open the list. | — | All leads, newest first, with name, email, title, type, status badge, date. | P1 | Happy |
| A-REQ-02 | Search `q` | — | 1. Search by name, email, title, company. | `Lina`, `qa+`, S-AR | Matching leads only; case-insensitive; Arabic search works. | P1 | Happy |
| A-REQ-03 | Filter by status / type / date range | — | 1. Each filter alone. 2. Combined. | from 2026-11-01 to 2026-11-03 | Correct subset; the date range includes both end days in the admin's zone. URL keeps the filters (shareable, survives refresh). | P1 | Happy |
| A-REQ-04 | No results | — | 1. Search `zzzz`. | — | "No requests match these filters" with the hint. | P3 | Edge |
| A-REQ-05 | Invalid filter values | — | 1. Open `?status=hack&from=notadate&to=2026-13-45`. | — | Ignored or a validation message; no 500. | P2 | Negative |
| A-REQ-06 | Search with special characters | — | 1. Search each. | S-SQL1, `%`, `_`, S-XSS1 | No SQL errors; `%`/`_` treated literally (or documented); nothing reflected unescaped. | P1 | Security |
| A-REQ-07 | Many leads | 500 seeded leads | 1. Open the list. | — | Loads in < 2 s, or paginates. | P3 | Edge |

### Feature: Request detail `/admin/requests/[id]`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-REQ-08 | Every brief field shows | Lead from PR-SRV-02 | 1. Open it. | — | All fields, labels, colour swatches, multi-select values, metadata (user agent, referrer, landing path), email status (sent / error text). | P0 | Happy |
| A-REQ-09 | Change status | Lead New | 1. Change to Contacted, then Qualified. | — | Saved; status history shows New → Contacted → Qualified with times. Dashboard counts update. | P1 | Happy |
| A-REQ-10 | Any-to-any status jumps | — | 1. Won → New, Lost → Proposal, Archived → Won. | — | Allowed (no state machine); each logged in history. Record whether that is intended, especially "Won" without a project. | P2 | Edge |
| A-REQ-11 | Notes | — | 1. Write notes → save → reload. | S-NL, S-XSS1, S-LEN(5001) | Kept with line breaks; shown as text; cut at 5000; control characters stripped. | P1 | Happy |
| A-REQ-12 | Logo URL link safety | Lead with logoUrl S-JSURL, S-DATAURL, `https://ok.example/logo.png` | 1. Click each link on the request page. | S-JSURL, S-DATAURL | Only http(s) opens. `javascript:` must not run (React 19 blocks it, but verify); `data:` must not open a page. Expected fix: render non-http(s) as plain text like the email does. | P0 | Security |
| A-REQ-13 | Colour value injection | Lead with primaryColor `red;background:url(https://evil.example/x)` via curl | 1. Open the lead. | — | Swatch may render odd, but no request to `evil.example` (check the network tab); text shown escaped. | P2 | Security |
| A-REQ-14 | Last-contacted date | — | 1. Set a date, clear it. 2. curl PATCH `lastContactedAt: "garbage"`. | — | UI: saved/cleared. curl: 400 expected. ⚠ Likely 500 today (invalid date passed to the DB). | P2 | Negative |
| A-REQ-15 | Unknown request id | — | 1. Open `/admin/requests/nope`. 2. PATCH via curl. | — | 404 page / JSON. | P2 | Negative |
| A-REQ-16 | Two admin tabs editing notes | Two tabs | 1. Save notes in tab A, then different notes in tab B. | — | Last write wins silently (record; no conflict warning). | P3 | Edge |
| A-REQ-17 | Request whose email is invalid for the portal | Lead with E-1TLD (PR-SRV-05) | 1. Click "Accept request". 2. Send a proposal. | — | Both refused with "This request has no valid client email" before anything is created. "Customize" allows inviting a different email. | P1 | Negative |
| A-REQ-18 | Lead deletion / PII removal | — | 1. Look for delete. | — | ⚠ Gap: no delete. Only "archived" status. Needed for privacy requests. | P2 | Negative |
| A-REQ-19 | Export | — | 1. Look for CSV export. | — | Not available (question). | P3 | Negative |

### Feature: Accept request / Convert to project

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-ACC-01 | Accept request (one click) | Lead with valid email, no project | 1. Choose email language → Accept request. | locale AR | Project created from the brief (name = title or "Project for <name>", summary = description, Planning). Lead → Won with a history entry. Invitation emailed (kind requestAccepted, Arabic). Result panel shows the invite link to copy. | P0 | Happy |
| A-ACC-02 | Accept when the invite email fails | Resend failing | 1. Accept. | — | Project still created; panel shows the email problem and the link to share manually; problem logged. | P1 | Integration |
| A-ACC-03 | Accept twice / double-click | — | 1. Double-click Accept. 2. Accept again later. | — | One project; second call → 409 "already converted" with a link to it. | P0 | Edge |
| A-ACC-04 | Accept a lead with a sent proposal | Proposal v1 sent | 1. Accept request. | — | Project created; the proposal link now shows "replaced". | P1 | Edge |
| A-ACC-05 | Convert with customised fields | Lead | 1. "Customize" → `/admin/projects/new?requestId=…`.<br>2. Change name, status, phase, ETA, invite email/name/locale, untick "mark won" → create. | — | Project with these values; lead status unchanged when "mark won" unticked; invitation kind = requestAccepted only if the email equals the lead's. | P1 | Happy |
| A-ACC-06 | Create a project without a lead | — | 1. `/admin/projects/new` without requestId → create, no invite. | — | Project created with no members. | P1 | Happy |
| A-ACC-07 | New-project validation | — | 1. Empty name, 201-char name, 5001-char summary, invalid date. | — | Errors per field; nothing created. | P2 | Negative |
| A-ACC-08 | Invite the admin's own email | — | 1. Create with invite E-ADMIN. | E-ADMIN | Project created; invite refused "That is the admin address". | P1 | Security |

## Stage 4: Proposals

Draft limits: title 1–200 · summary ≤ 5000 · ≤ 12 phases (title 1–200, description ≤ 2000, 1–365 days) · included / excluded / client provides ≤ 20 items of 1–300 chars · currency one of 8 · total 0–100,000,000 whole units · payment terms ≤ 1000 · revision rounds 0–10 · start date or empty · valid 1–90 days.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-PROP-01 | Create the first draft | Lead without proposals | 1. Proposal panel → create. | — | v1 draft pre-filled: title from the brief, summary from the description, starting phases for the project type in the lead's language (Arabic if landed on `/ar` or wrote in Arabic), USD, total 0, 2 revisions, 14 days. | P0 | Happy |
| A-PROP-02 | Reopen the existing draft | Draft exists | 1. Click create again. | — | Opens the same draft (no duplicate). | P1 | Edge |
| A-PROP-03 | Edit and save every field | Draft | 1. Change every field, add/remove/reorder phases and list items → save → reload. | S-AR, S-EMOJI | Everything persists. | P0 | Happy |
| A-PROP-04 | Field boundaries | Draft | 1. Try each limit ±1 (13 phases, 21 items, 366 days, 0 days, total -1 / 100,000,001 / 12.5, valid 0 / 91, revisions 11). | — | Each out-of-range value rejected with a field error; in-range saved. | P1 | Edge |
| A-PROP-05 | Preview | Draft | 1. Open preview. | — | Same rendering as the client page, "expires if sent now" date shown. | P1 | Happy |
| A-PROP-06 | Send needs ≥ 1 phase and total > 0 | Draft with 0 phases, then total 0 | 1. Send. | — | "Add at least one phase" / "Set the total price" errors; nothing sent. | P0 | Negative |
| A-PROP-07 | Send | Complete draft | 1. Send. | — | Status Sent; recipient = lead email/name; valid-until = now + valid days; lead → Proposal (history "Proposal v1 sent"); email to the prospect; result panel shows the link to copy. | P0 | Happy |
| A-PROP-08 | Sent proposals are locked | Sent | 1. Try to edit (UI + curl PATCH). | — | 409 "Only drafts can be edited. Revise it as a new version." | P0 | Negative |
| A-PROP-09 | Resend the link | Sent or expired | 1. Resend. | — | New link (old one dies), validity restarts, email again; `sentAt` unchanged. | P1 | Happy |
| A-PROP-10 | Revise as a new version | v1 changes requested | 1. Create v2 → edit → send. | — | v2 copies v1 content; sending v2 marks v1 superseded; lead stays Proposal. | P0 | Happy |
| A-PROP-11 | Delete a draft | Draft v2 | 1. Delete. 2. curl DELETE a sent proposal. | — | Draft removed; sent one → refused (only drafts). | P1 | Negative |
| A-PROP-12 | Create a version after acceptance | v1 accepted | 1. Try to create a new version. | — | 409 "already has an accepted proposal". | P1 | Negative |
| A-PROP-13 | Edit in two tabs, then send | Draft open in tabs A and B | 1. Save in B.<br>2. Send from A without reloading. | — | 409 "The proposal changed while sending. Reload…" — the stale version is never sent. | P0 | Edge |
| A-PROP-14 | Two "new version" clicks race | — | 1. Click create in two tabs at once. | — | One draft; the other → "Another version was just created. Reload the page." | P2 | Edge |
| A-PROP-15 | Recipient is the admin / a non-client account | Lead email = E-ADMIN | 1. Send. | — | 409 adminEmail / notClient. | P1 | Security |
| A-PROP-16 | Proposal answer emails | Prospect accepts / asks for changes / declines | 1. Check the admin inbox for each. | — | One email per answer, with version, title, total, client name/email, note, and a link (project for accepted, proposal page otherwise). | P0 | Integration |
| A-PROP-17 | Proposal status shown as "Expired" | Sent, past validUntil | 1. Open the request page. | — | Badge "Expired" (stored status stays sent); resend available. | P2 | UI |
| A-PROP-18 | Amount formatting at extremes | total 100,000,000 KWD; 0 SYP | 1. Preview in EN and AR. | — | Correct grouping, no overflow on mobile. | P3 | UI |

## Stage 5: Projects

### Feature: Projects list

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-PRJ-01 | Views: active / archived / all | P1, P2 active; P3 archived | 1. Switch each view. 2. Open `?view=hack`. | — | Correct subsets; invalid view falls back to active. Current view has `aria-current`. | P1 | Happy |
| A-PRJ-02 | Row details | — | 1. Inspect rows. | — | Status badge, progress (same as client), clients, unread client messages count, updated time. | P1 | Happy |
| A-PRJ-03 | Sidebar unread badge | Client sent 2 messages | 1. Check the sidebar. 2. Read them. | — | Badge shows 2, clears after reading (polls `/api/admin/unread`). | P2 | Happy |

### Feature: Project screen tabs (overview, milestones, meetings, messages, files, clients, activity, settings)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-PRJ-04 | Tab deep links and invalid tab | — | 1. Open each `?tab=`, then `?tab=nope`. | — | Each opens; invalid → overview. | P2 | Edge |
| A-PRJ-05 | Changes appear without refresh (Next 16 refresh race) | Production build (`next start`) | 1. Save any change in each tab. | — | The screen updates right after saving (re-read via the view API), not only after a manual reload. | P1 | Edge |
| A-PRJ-06 | Client actions appear live | Client sends a message / uploads / answers a meeting | 1. Keep the admin tab open ≤ 15 s. | — | Updates appear without reload. | P1 | Happy |
| A-MS-01 | Create a milestone | — | 1. Add: title, description, status, due date, estimated days. | — | Listed at the end; client sees it; activity "milestone created" visible to clients; progress recalculates. | P0 | Happy |
| A-MS-02 | Milestone limits | — | 1. Title 0/201, description 2001, days 0/366, invalid date. | — | Field errors. | P2 | Negative |
| A-MS-03 | Status to Done | In progress | 1. Set Done. 2. Set back to To do. | — | Done → completedAt set, "milestone completed" activity visible. Back → completedAt cleared. Progress follows. | P1 | Happy |
| A-MS-04 | Reorder | 3 milestones | 1. Move the last one up twice. 2. Move the first one up. | — | Order 0..n-1 kept; moving the first up is a no-op (no error). Client sees the new order. | P2 | Edge |
| A-MS-05 | Delete a milestone with tasks, meetings and reviews | — | 1. Delete (confirm dialog). | — | Milestone gone; its tasks become "other tasks"; meetings keep but lose the link; reviews deleted; internal audit entry; progress recalculates. | P1 | Edge |
| A-MS-06 | Request client sign-off | Milestone To do | 1. Request review with a note and link. | link `https://preview.example` | Round pending; milestone moves to In progress; clients emailed; client-visible activity; badge on client home. | P0 | Happy |
| A-MS-07 | Review link validation | — | 1. Use each link. | S-JSURL, `ftp://x`, `preview.example`, S-LEN(501) | Only absolute http(s) ≤ 500 accepted: "Use a full http(s) link." | P0 | Security |
| A-MS-08 | Second request while one is pending | Pending round | 1. Request again. | — | 409 "already awaiting the client's approval". | P1 | Negative |
| A-MS-09 | Withdraw a pending round | Pending | 1. Withdraw. 2. Withdraw again. | — | Round withdrawn; client form and feed entry disappear; audit entry. Second time → nothing pending (no error crash). | P1 | Happy |
| A-MS-10 | Review history and email status | Several rounds | 1. Open the milestone. | — | Each round with who/when/answer/comment; email sent or the error. | P2 | Happy |
| A-MS-11 | Request review with no clients on the project | Project without members | 1. Request. | — | Round created; email status "No client has access to this project yet."; problem logged. | P3 | Edge |
| A-TSK-01 | Create a task (internal by default) | — | 1. Add a task without ticking "visible to client". | — | Created hidden; "task created" activity hidden from clients; progress counts it if under an in-progress milestone. | P0 | Security |
| A-TSK-02 | Toggle task visibility | Internal task | 1. Make visible. 2. Hide again. | — | Client sees / stops seeing the task and its activity entries; audit entry each time. | P0 | Security |
| A-TSK-03 | Complete a task | — | 1. Set Done. | — | completedAt set; "task completed" activity with the task's visibility; progress updates. | P1 | Happy |
| A-TSK-04 | Move a task to another milestone / none | — | 1. Change its milestone. 2. curl with a milestone id from P2. | — | Moves; foreign milestone → 400/404. | P1 | Security |
| A-TSK-05 | Reorder and delete tasks | — | 1. Move up/down. 2. Delete. | — | Order kept dense; delete logs an internal audit entry. | P2 | Happy |
| A-MTG-01 | Admin proposes a meeting | — | 1. Propose. | — | All client members emailed in their language and zone; "Awaiting reply". Admin cannot accept it (409). | P0 | Happy |
| A-MTG-02 | Admin answers a client proposal | Client-proposed | 1. Accept. 2. Reschedule another. 3. Cancel another. | — | Same rules as C-MTG; each emails all clients; `.ics` on confirm/cancel; admin `.ics` download works. | P0 | Happy |
| A-MTG-03 | Admin sees the client's local time | Client zone America/New_York | 1. Open the meeting. | — | Shows admin time (`PORTAL_TIME_ZONE`) and the client's local time. | P1 | Edge |
| A-MSG-01 | Admin sends a message with attachments | — | 1. Send text + 2 files. | — | Clients see it live, with "Michael Zakka" (site name) as sender; one email per client batch. | P0 | Happy |
| A-MSG-02 | Admin read marker | Client sent 3 | 1. Open Messages. | — | Admin unread clears (sidebar + list); client's unread unaffected. | P2 | Happy |
| A-FILE-01 | Upload visible vs internal | — | 1. Upload one visible, one internal. | F-PDF | Client sees only the visible one; activity for the internal one is hidden. | P0 | Security |
| A-FILE-02 | Toggle visibility / delete | — | 1. Hide a visible file. 2. Delete a file. | — | Hidden: client loses list entry, download and feed entry. Delete: bytes removed from storage, row gone, internal audit entry. | P0 | Security |
| A-FILE-03 | Delete a file attached to a message | — | 1. Delete it. | — | Message stays, attachment gone for both sides. | P2 | Edge |
| A-FILE-04 | Same upload rules as clients | — | 1. Repeat C-FILE-04 … C-FILE-09 as admin. | — | Same results. | P1 | Security |
| A-CLI-01 | Invite a client | — | 1. Clients tab → invite email, name, language. | E-OK | Pending invitation listed with expiry; email sent (or problem shown with the link to copy). Internal activity "client invited". | P0 | Happy |
| A-CLI-02 | Invite validation | — | 1. Invite E-NOTLD, E-ADMIN, an existing member, a 101-char name. | — | Invalid email error; "That is the admin address"; "already has access"; name error. | P1 | Negative |
| A-CLI-03 | Invite the same email twice | Pending | 1. Invite again. | — | New invitation; the older one shows Revoked. | P1 | Edge |
| A-CLI-04 | Resend / revoke | Pending | 1. Resend. 2. Revoke. 3. Resend the revoked one. | — | Resend: new link, new expiry. Revoke: state Revoked, link dead. Resend revoked → 409 "already revoked". | P0 | Happy |
| A-CLI-05 | Expired invitation shown as expired | expiresAt past | 1. View. 2. Resend. | — | "Expired"; resend revives it with a new 7-day link. | P2 | Edge |
| A-CLI-06 | Remove a member | CA on P1 | 1. Remove (confirm). | — | CA loses P1 immediately (C-LIFE-03); their pending invites to P1 revoked; account and other projects untouched; internal audit entry. | P0 | Security |
| A-CLI-07 | Member list details | — | 1. View members. | — | Name, email, last login, whether they set a password, local time zone. | P3 | Happy |
| A-ACT-01 | Admin activity shows internal entries | — | 1. Open Activity. | — | Client-visible and internal (audit) entries, marked differently; category legend. | P2 | Happy |
| A-SET-01 | Edit project fields | — | 1. Change name, summary, phase, ETA → save. | S-AR | Saved; internal "project updated" audit lists changed fields; no client email. | P1 | Happy |
| A-SET-02 | Change status | Planning | 1. → In progress → Review → On hold → Completed → Planning. | — | Each change: client-visible activity + one email per client. startedAt set on first non-planning status; completedAt set on Completed and cleared when leaving it. | P0 | Happy |
| A-SET-03 | Save without changes | — | 1. Save unchanged. 2. curl PATCH `{}`. | — | No email, no audit entry; `{}` → 400 "Nothing to update". | P2 | Edge |
| A-SET-04 | Archive and restore | Active | 1. Archive. 2. Restore. | — | Archive: clients read-only, listed under Archived; reminders stop. Restore: back to normal. Audit entries both ways. | P1 | Happy |
| A-SET-05 | Project deletion | — | 1. Look for delete. | — | ⚠ Gap: none (archive only). | P3 | Negative |
| A-PRV-01 | View as client | Admin signed in | 1. Click "view as client" → `/portal/preview/<P1>`. | — | Shows exactly what clients see (no internal tasks/files/activity); read-only (no composer, no forms); does not mark anything read; no polling. | P1 | Happy |
| A-PRV-02 | Preview without an admin session | Signed out | 1. Open `/portal/preview/<P1>`. | — | Redirect to admin login. | P0 | Security |

## Stage 6: Site health and problems

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-SITE-01 | Health checks | Fully configured staging | 1. Open `/admin/site`. | — | Database, Resend, admin auth, site URL, visitor analytics, problem alerts, uptime check all green with details. | P1 | Happy |
| A-SITE-02 | Each misconfiguration shows | Remove one env var at a time | 1. Reload the Site page each time. | — | The matching check turns red/amber with a fix hint; others unaffected. | P2 | Negative |
| A-SITE-03 | Problems list | Cause a failed email and a browser error | 1. Open Problems. | — | One row per fingerprint with count, first/last seen, source, path, detail. | P1 | Integration |
| A-SITE-04 | Resolve one / resolve all | Open problems | 1. Resolve one. 2. Resolve all. | — | Rows marked resolved; open count goes to 0. | P2 | Happy |
| A-SITE-05 | Resolved problem happens again | — | 1. Trigger the same failure. | — | Row reopens, count increments, alert sent again. | P2 | Integration |
| A-SITE-06 | Problem text is escaped | Browser error with message S-XSS2 via `/api/errors` | 1. Open Problems. | S-XSS2 | Shown as text. | P1 | Security |

## Stage 7: Admin UI quality

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| A-UI-01 | Admin on a phone | 375 px | 1. Walk every admin page. | — | Sidebar collapses; tables scroll inside their container; forms usable. | P2 | UI |
| A-UI-02 | Confirm dialogs | Delete / remove / revoke / archive | 1. Trigger each; cancel; confirm. | — | Cancel does nothing; Esc closes; focus trapped in the dialog and returned afterwards. | P1 | Accessibility |
| A-UI-03 | Disabled and busy buttons | Slow 3G | 1. Click each save/send button. | — | Visibly busy and not clickable twice (`.btn` has no disabled style globally, so check each). | P2 | UI |
| A-UI-04 | Error boundary | Force a render error (e.g. corrupt JSON in a proposal row) | 1. Open the page. | — | Admin error page with a retry; error reported to Problems. | P2 | Negative |
| A-UI-05 | Keyboard-only admin | Keyboard | 1. Do a full proposal send and a milestone review using only the keyboard. | — | Possible end to end with visible focus. | P2 | Accessibility |
