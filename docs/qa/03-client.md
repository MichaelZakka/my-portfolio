# Role: Invitee → Client (portal)

[← Index](README.md) · Accounts (CA, CB, CC, INV), projects (P1–P3) and test data IDs are defined in the [README](README.md#standing-test-accounts-and-projects).

## Stage 1: Invitation

Link `/portal/invite/<token>`, valid 7 days. New person: optional name (≤ 100) + new password. Existing account with a password: its current password. Accepting signs the browser in and redirects to the project.

### Feature: Accept an invitation

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-INV-01 | Invitation email (plain invite) | Admin invites a new email, locale EN | 1. Open the email. | E-OK | English email naming the project, the expiry date (7 days out) and one absolute `https://` link. Readable in Gmail/Outlook/Apple Mail, light and dark mode. | P0 | Integration |
| C-INV-02 | Invitation email (request accepted) | Admin clicks "Accept request" with locale AR | 1. Open the email. | — | Arabic, RTL, "your request was accepted" wording, invite link. | P0 | Integration |
| C-INV-03 | Accept as a new person | INV, link valid | 1. Open the link.<br>2. Enter name + password → submit. | name S-AR, PW-10 | Redirect to `/portal/projects/<id>`, signed in. Activity "joined" visible to clients. Admin gets "client joined" email. Name saved. Email marked verified. | P0 | Happy |
| C-INV-04 | Accept without a name | New person | 1. Leave name empty, set password. | PW-10 | Accepted. UI falls back to the email as the display name. | P2 | Edge |
| C-INV-05 | Name boundaries and odd input | New person | 1. Try each name. | S-LEN(100), S-LEN(101), S-XSS1, S-EMOJI, S-PAD | 100 OK, 101 rejected, XSS stored and shown as text everywhere, emoji OK, padding trimmed. | P1 | Edge |
| C-INV-06 | Password policy at invitation | New person | 1. Try each. | PW-9, PW-10, PW-72B, PW-73B, PW-AR36, PW-AR37, PW-EMO10 | Same outcome as PR-ACC-05; errors translated in the page language. | P1 | Edge |
| C-INV-07 | Existing account gets a second project | CA invited to P2 | 1. Open the link: the page asks for the current password.<br>2. Enter it. | CA's password | Joins P2. Portal home now lists P1, P2, P3. Name not changed. | P0 | Happy |
| C-INV-08 | Existing account, wrong password | As above | 1. Enter a wrong password. | `Wrong-pass-1` | "Incorrect password." Not joined, invitation still pending. | P0 | Negative |
| C-INV-09 | Expired invitation | `expiresAt` in the past | 1. Open the link. 2. Submit via curl. | — | Page explains it expired and to ask for a new one. API 410 `invitationExpired`. | P0 | Negative |
| C-INV-10 | Revoked invitation | Admin revoked it | 1. Open the link. | — | "This invitation was withdrawn." API 410 `invitationRevoked`. | P0 | Negative |
| C-INV-11 | Already accepted | Accepted earlier | 1. Open the link again. | — | "Already accepted" with a sign-in link. API 409. | P1 | Negative |
| C-INV-12 | Old link after "Resend" | Admin resent | 1. Open the first email's link. 2. Open the new one. | — | Old → invalid. New → works; expiry restarted. | P0 | Negative |
| C-INV-13 | Older pending invitation after a new one | Admin invited the same email twice | 1. Open the first link. | — | Revoked (one live link per person + project). | P1 | Negative |
| C-INV-14 | Malformed token | — | 1. Open `/portal/invite/x`, a 43-char random token, `<script>`. | S-XSS1 | "Not valid" page, no 500, nothing reflected unescaped. | P1 | Security |
| C-INV-15 | Double-click submit | Slow 3G | 1. Double-click Accept. | — | One membership, one "joined" email. | P1 | Edge |
| C-INV-16 | Admin revokes while the invitee is on the page | Page open | 1. Admin revokes.<br>2. Invitee submits. | — | Refused (`invitationAccepted`/revoked message). No membership. | P1 | Edge |
| C-INV-17 | Accept while signed in as another client | Browser signed in as CB | 1. Open INV's link and accept as a new account. | — | Browser now signed in as INV; CB's session replaced. | P2 | Security |
| C-INV-18 | Rate limit | Single instance | 1. Submit 11 accepts (wrong passwords) in 15 min. | — | 11th → 429 translated. | P2 | Security |
| C-INV-19 | Invite page language | Cookie `ar` | 1. Open the link. | — | Arabic page; language switch available; the chosen language becomes the account's language. | P2 | UI |
| C-INV-20 | Link opened in an email app's in-app browser | Gmail iOS/Android | 1. Tap the link in the app. | — | Page works; after accepting, the user is signed in in that in-app browser (they may need to sign in again in Safari/Chrome; document). | P2 | Integration |

## Stage 2: Sign in

### Feature: `/portal/login`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-LOG-01 | Sign in with valid credentials | CA | 1. Enter email + password → Sign in. | CA | Redirect to `/portal`. `portal_session` cookie: HttpOnly, Secure (prod), SameSite=Lax, Path=/, ~7-day expiry. | P0 | Happy |
| C-LOG-02 | Email is case- and space-insensitive | CA | 1. Sign in with upper case and padding. | E-CASE / E-PAD versions of CA | Succeeds. | P1 | Edge |
| C-LOG-03 | Password is exact | CA with PW-PAD | 1. Sign in with the password trimmed. | `Abcdefgh12` | Fails (spaces are part of the password). With the spaces → succeeds. | P2 | Edge |
| C-LOG-04 | Wrong password / unknown email | — | 1. Wrong password for CA.<br>2. Unknown email. | — | Same message "Invalid email or password" for both; similar response time (no account enumeration). | P0 | Security |
| C-LOG-05 | Invitee without a password | INV | 1. Try to sign in with any password. | — | Same generic error. | P1 | Negative |
| C-LOG-06 | Admin email in the portal | E-ADMIN | 1. Sign in with the admin's email and admin password. | — | Generic error (the admin row has no portal password). | P0 | Security |
| C-LOG-07 | Empty fields / invalid email format | — | 1. Submit empty. 2. Submit E-NOTLD. | — | Client-side validation; API 400 `invalidInput` if bypassed. | P2 | Negative |
| C-LOG-08 | Rate limit per IP | Single instance | 1. 11 wrong attempts within 5 minutes. | — | 11th → 429 translated "Too many attempts". Correct password also refused until the window ends. | P0 | Security |
| C-LOG-09 | Rate limit per email across IPs | curl with different `X-Forwarded-For` values | 1. 11 attempts on CA's email in 15 min. | — | 11th → 429. (Also verify on Vercel that a spoofed `X-Forwarded-For` does not change the IP used; on other hosts it might.) | P0 | Security |
| C-LOG-10 | Return to the requested page after sign-in | Signed out | 1. Open `/portal/projects/<P1>?tab=files`.<br>2. Sign in. | — | Redirect to login with `from`; after sign-in lands on the requested page. | P1 | Happy |
| C-LOG-11 | Open-redirect protection | Signed out | 1. Open `/portal/login?from=https://evil.example`, `?from=//evil.example`, `?from=/admin`, `?from=/portal/../admin`.<br>2. Sign in. | — | Always lands on a `/portal…` page; never leaves the site or goes to `/admin`. | P0 | Security |
| C-LOG-12 | Already signed in, open the login page | Signed in | 1. Open `/portal/login`. | — | Redirect to `/portal` (or the form with a "you're signed in" note). Not a broken state. | P3 | Edge |
| C-LOG-13 | Language chosen on the login page wins | Account locale `en` | 1. Switch to Arabic on the login page.<br>2. Sign in. | — | Portal in Arabic; the account's locale is updated to `ar` (emails now Arabic). | P2 | Happy |
| C-LOG-14 | Double-click Sign in | Slow 3G | 1. Double-click. | — | Signed in once; no error. | P3 | Edge |
| C-LOG-15 | Password manager | Chrome/1Password/iCloud Keychain | 1. Save and autofill credentials. | — | Fields have the right `autocomplete` (username/current-password; new-password on invite/reset). Autofill works. | P2 | UI |
| C-LOG-16 | Portal sign-in not configured | `AUTH_SECRET` unset/short on staging | 1. Sign in. | — | 503 "not configured" message; nothing crashes; no session issued. | P2 | Negative |

## Stage 3: Forgot and reset password

Reset links last 60 minutes and work once. The forgot form always answers the same way. Only accounts that already have a password can reset.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-RST-01 | Request a reset | CA | 1. `/portal/forgot-password` → enter email → submit. | CA | Neutral confirmation. Reset email in the account's language with a link `/portal/reset-password/<token>` and the 60-minute validity. | P0 | Happy |
| C-RST-02 | Unknown, invitee and admin emails | — | 1. Request for an unknown email, INV, E-ADMIN. | — | Same confirmation, same timing; no email sent. | P0 | Security |
| C-RST-03 | Reset with a valid link | Link from C-RST-01 | 1. Open it, set a new password. | PW-10 | Signed in, redirected to `/portal`. Old password no longer works. | P0 | Happy |
| C-RST-04 | Reset signs out every other session | CA signed in on browser B | 1. Reset on browser A.<br>2. Refresh browser B. | — | Browser B is sent to sign-in on its next request. | P0 | Security |
| C-RST-05 | Link reused | Used link | 1. Open it again and submit. | — | "Invalid or expired". | P0 | Security |
| C-RST-06 | Link expired | `expiresAt` past | 1. Submit. | — | "Invalid or expired" + a way to request a new one. | P0 | Negative |
| C-RST-07 | Older link after a newer request | Two requests | 1. Use the first email's link. | — | Invalid (older unused tokens are deleted). Newest works. | P1 | Security |
| C-RST-08 | Policy on the new password | Valid link | 1. Try PW-9, PW-73B, PW-AR37. | — | Translated policy errors; link stays usable. | P1 | Negative |
| C-RST-09 | Double submit | Slow 3G | 1. Double-click Save. | — | One success; the second gets "invalid" or is ignored. Signed in. | P2 | Edge |
| C-RST-10 | Per-address cap (silent) | — | 1. Request 4 resets for CA within an hour. | — | 3 emails arrive; the 4th request shows the same confirmation but sends nothing. | P1 | Security |
| C-RST-11 | Per-IP limit | Single instance | 1. 6 forgot requests in 15 min. | — | 6th → 429 translated. | P2 | Security |
| C-RST-12 | Token leaks via Referer | Reset page | 1. Check the response headers. | — | `Referrer-Policy: no-referrer`; page loads no third-party resources. | P1 | Security |
| C-RST-13 | Email provider down | Resend failing | 1. Request a reset. | — | User sees the normal confirmation; a delivery problem is logged in admin Problems. | P2 | Integration |
| C-RST-14 | Reset link opened while signed in as someone else | Signed in as CB | 1. Open CA's reset link and set a password. | — | Browser is now CA. | P3 | Edge |

## Stage 4: Portal home

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-HOME-01 | Lists only my projects | CA | 1. Open `/portal`. | — | P1 and P3 only (never P2). Active first, "Archived" section below with P3. | P0 | Security |
| C-HOME-02 | Card details | CA | 1. Inspect the P1 card. | — | Name, status badge (translated), progress, "N awaiting approval" when a review is pending, "N unread messages" when unread. Archived card shows "Archived" and no approval badge. | P1 | Happy |
| C-HOME-03 | No projects | Client removed from every project | 1. Open `/portal`. | — | Friendly empty state, sign-out still available. | P2 | Edge |
| C-HOME-04 | Many projects | Client in 15 projects | 1. Open `/portal`. | — | Grid wraps; page loads in < 2 s on 4G. | P3 | Edge |
| C-HOME-05 | Loading state | Slow 3G | 1. Open `/portal`. | — | Skeleton (`loading.tsx`) instead of a blank page. | P3 | UI |
| C-HOME-06 | Unread badge clears after reading | Admin sent 2 messages | 1. Open P1 Messages.<br>2. Go back to `/portal`. | — | Badge gone. | P2 | Happy |

## Stage 5: Inside a project

### Feature: Access control and tabs

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-ACL-01 | Another client's project by URL | CA signed in | 1. Open `/portal/projects/<P2 id>`. | — | 403 "forbidden" page; no project data in the HTML or RSC payload. | P0 | Security |
| C-ACL-02 | Another client's project via every API | CA signed in | 1. curl (with CA's cookie) GET/POST each `/api/portal/projects/<P2>/…` route: project, activity, files, files/<id>, messages, messages/read, meetings, meetings/<id>, meetings/<id>/ics, milestones/<id>/review, updates. | — | 403 for every route; nothing created. | P0 | Security |
| C-ACL-03 | Another project's file through my project | CA, a file id from P2 | 1. GET `/api/portal/projects/<P1>/files/<P2 file id>`. | — | 404 (file must belong to the project in the URL). | P0 | Security |
| C-ACL-04 | Hidden (internal) file by id | P1 file with visibleToClient = false | 1. GET its download URL as CA. | — | 404. | P0 | Security |
| C-ACL-05 | Another project's meeting / milestone through my project | ids from P2 | 1. PATCH `/api/portal/projects/<P1>/meetings/<P2 meeting>`.<br>2. POST review on a P2 milestone via P1. | — | 404; nothing changes in P2. | P0 | Security |
| C-ACL-06 | Unknown and malformed project ids | CA | 1. Open `/portal/projects/clxxxxxxxxxxxxxxxxxxxxxxx` (valid shape, not existing) and `/portal/projects/abc`, `/portal/projects/' OR 1=1`. | S-SQL1 | 404 page, no 500, no SQL error text. | P1 | Security |
| C-ACL-07 | No session | Signed out | 1. Open a project URL. 2. curl an API. | — | Page → redirect to login with `from`. API → 401 JSON `unauthorized`. | P0 | Security |
| C-ACL-08 | Forged / expired / tampered cookie | — | 1. Edit one character of `portal_session`.<br>2. Use a cookie from before a password change. | — | Treated as signed out. | P0 | Security |
| C-ACL-09 | Admin cookie does not open the portal | Only the admin cookie | 1. Open `/portal`. | — | Redirect to portal login (domain-separated signatures). `/portal/preview/<id>` is the only portal route the admin cookie opens. | P0 | Security |
| C-ACL-10 | Client cookie does not open admin or preview | CA's cookie only | 1. Open `/admin`, `/api/admin/projects`, `/portal/preview/<P1>`. | — | Admin login redirect / 401. | P0 | Security |
| C-ACL-11 | Tab deep links | CA | 1. Open `?tab=milestones`, `?tab=meetings`, `?tab=messages`, `?tab=files`, `?tab=activity`, `?tab=settings`, `?tab=<script>`. | S-XSS1 | Valid tabs open directly. Unknown values fall back to Overview, nothing reflected. | P2 | Edge |
| C-ACL-12 | Tabs by keyboard | Keyboard only | 1. Tab to the tab list, use arrows / Tab / Enter. | — | Proper tab semantics (`role=tablist/tab/tabpanel`, `aria-selected`), visible focus, arrow keys mirrored in RTL. | P1 | Accessibility |
| C-ACL-13 | Back/forward across tabs | CA | 1. Click Milestones, Messages.<br>2. Press Back. | — | Back returns to the previous tab (or leaves the page); behavior consistent, no blank panel. | P3 | Edge |

### Feature: Overview and progress

Example data for P1: A 10 days (done), B 5 days (in progress, 2 of 4 tasks done), C 5 days (to do).

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-OVR-01 | Weighted progress | P1 as above | 1. Open Overview. | — | 63 % (10 + 5×0.5 = 12.5 of 20). Same number on the portal home card and the admin project list. | P1 | Happy |
| C-OVR-02 | In-progress cap | B has 4 of 4 tasks done but is still In progress | 1. Open Overview. | — | 73 % (10 + 5×0.9 = 14.5 of 20), not 75 %. | P2 | Edge |
| C-OVR-03 | 100 % only when every milestone is done | All Done | 1. Open Overview. | — | 100 %. With any milestone not Done, max 99 %. | P1 | Edge |
| C-OVR-04 | Milestones without estimates | A (no estimate, done), B 10 d, C 20 d | 1. Open Overview. | — | A weighs the average (15): 15 of 45 = 33 %. | P2 | Edge |
| C-OVR-05 | No milestones | New empty project | 1. Open Overview. | — | 0 %, friendly empty state, no division error. | P2 | Edge |
| C-OVR-06 | Internal tasks count, but stay hidden | B has internal tasks | 1. Compare progress with visible tasks. | — | Progress uses all tasks; the client sees only client-visible ones (and no internal titles in HTML/RSC). | P0 | Security |
| C-OVR-07 | Status, phase, ETA | P1 | 1. Check the figures. | — | Status translated, current phase, ETA date in the client's locale and time zone (date-only, no shift). | P1 | Happy |
| C-OVR-08 | Summary cards link to tabs | P1 | 1. Click each card's link. | — | Opens the right tab. | P3 | Happy |
| C-OVR-09 | Progress bar accessibility | Screen reader | 1. Focus/read the bar. | — | `role=progressbar` with `aria-valuenow` and a label; percentage also in text. | P2 | Accessibility |

### Feature: Milestones and tasks (view) and sign-off

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-MS-01 | Milestone list | P1 | 1. Open Milestones. | — | Ordered as the admin set; status, due date, description, client-visible tasks under each, "other tasks" group for tasks without a milestone. | P1 | Happy |
| C-MS-02 | Hidden tasks stay hidden | P1 has internal tasks | 1. View page source / RSC payload. | — | No internal task titles or descriptions. | P0 | Security |
| C-MS-03 | Long titles / Arabic / emoji | Admin-created content | 1. View on 320 px. | S-LEN(200), S-MIX, S-EMOJI | Wraps, no overflow, correct bidi order. | P2 | UI |
| C-REV-01 | Approval request email | Admin requests review with note + link | 1. Open the email. | — | Every client member gets it in their language; link opens the Milestones tab scrolled to that milestone (`#milestone-<id>`). | P1 | Integration |
| C-REV-02 | Approve a milestone | Pending round | 1. Click Approve, optional comment → confirm. | `Looks great` | Milestone Done, completedAt set, activity "approved by <name>" visible, admin emailed, progress updates, home badge clears. | P0 | Happy |
| C-REV-03 | Ask for changes | Pending round | 1. Choose changes, comment → send. | S-NL | Milestone back to In progress, activity visible, admin emailed with the comment. | P0 | Happy |
| C-REV-04 | Changes without a comment | Pending | 1. Submit empty / spaces. | S-WS | Blocked; API 400. | P1 | Negative |
| C-REV-05 | Comment boundaries | Pending | 1. 2000 and 2001 chars. | S-LEN(2000), S-LEN(2001) | 2000 OK; 2001 rejected. | P2 | Edge |
| C-REV-06 | Preview link from the admin | Round has link | 1. Click the link. | — | Opens in a new tab, `noopener`. Only `http(s)` links appear (admin cannot save others). | P1 | Security |
| C-REV-07 | Two clients answer at once | CA and CC on P1 | 1. Both open the round.<br>2. CA approves, CC asks for changes within a second. | — | One wins; the other sees "not awaiting approval" and the page refreshes to the result. | P0 | Edge |
| C-REV-08 | Admin withdraws while I'm answering | Form open | 1. Admin withdraws.<br>2. Client submits. | — | 409 `reviewNotPending`, translated; form disappears after refresh; the "ready for approval" entry is gone from the client feed. | P1 | Edge |
| C-REV-09 | Double-click Approve | Slow 3G | 1. Double-click. | — | One approval, one email. | P1 | Edge |
| C-REV-10 | Archived project | P3 with a pending round | 1. Try to answer (UI and curl). | — | No form; API 403 `projectArchived`. | P1 | Negative |
| C-REV-11 | Review history | Milestone with 3 rounds | 1. View it. | — | Client sees the current state; history shows who approved / asked for changes and when (as designed). | P3 | Happy |
| C-REV-12 | Rate limit | Single instance | 1. 21 review answers in 10 min (via curl on new rounds). | — | 21st → 429. | P3 | Security |

### Feature: Meetings

Rules: only the side that did not propose can accept; either side can reschedule (the decision passes back) or cancel; cancelled is final; start time must be in the future.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-MTG-01 | Propose a meeting | P1 | 1. Meetings → propose: title, agenda, location, date/time, duration, optional milestone → send. | location `https://meet.google.com/abc-defg-hij`, 45 min | Listed as "Awaiting reply" (translated). Activity entry. Admin emailed with Reply-To = client. Time shown in the client's zone. | P0 | Happy |
| C-MTG-02 | Admin accepts my proposal | After C-MTG-01 | 1. Admin accepts.<br>2. Client checks the list and email. | — | Status Confirmed; client email with `.ics` attachment; "Add to calendar" download works. | P0 | Happy |
| C-MTG-03 | I cannot accept my own proposal | Client-proposed meeting | 1. Look for Accept.<br>2. curl `{"action":"accept"}`. | — | No Accept button; API 409 `meetingAwaitingOther`. | P0 | Negative |
| C-MTG-04 | Accept an admin proposal | Admin-proposed | 1. Click Accept. | — | Confirmed; admin emailed with `.ics`. Any client member (CA or CC) can accept. | P0 | Happy |
| C-MTG-05 | Reschedule | Confirmed meeting | 1. Propose a new time. | tomorrow 10:00 | Back to "Awaiting reply" with the new time; now the admin must answer; reminder stamp cleared; admin emailed "rescheduled". | P1 | Happy |
| C-MTG-06 | Cancel a confirmed meeting | Confirmed | 1. Cancel → confirm dialog. | — | Cancelled; admin email with a cancelling `.ics` (removes the calendar entry in Google/Outlook/Apple). | P1 | Happy |
| C-MTG-07 | Act on a cancelled meeting | Cancelled | 1. curl accept / reschedule / cancel. | — | 409 `meetingCancelled`; no buttons in the UI. | P1 | Negative |
| C-MTG-08 | Time in the past or now | — | 1. Pick yesterday, then 1 minute ago (devtools). | — | "Pick a time in the future." | P1 | Negative |
| C-MTG-09 | Field limits | — | 1. Title 0/200/201, agenda 2001, location 501, duration 20. | S-LEN(n) | Title required ≤ 200; agenda ≤ 2000; location ≤ 500; only 15/30/45/60/90/120 accepted. | P2 | Edge |
| C-MTG-10 | Milestone from another project | curl | 1. POST with a P2 milestone id on P1. | — | 400 "milestone not part of this project". | P1 | Security |
| C-MTG-11 | Location shown as a link only when safe | — | 1. Create with each location. | `https://zoom.us/j/1`, `Office, Damascus`, S-JSURL, S-DATAURL, `http://x` | Only http(s) becomes a link (new tab); others are plain text. | P0 | Security |
| C-MTG-12 | Both sides act at once | Admin and client on the same pending meeting | 1. Client reschedules while admin accepts. | — | One wins; the other gets "This meeting was just changed. Reload and try again." | P1 | Edge |
| C-MTG-13 | Time zone display | Client browser in America/New_York, admin `Asia/Damascus` | 1. Client proposes 09:00 local.<br>2. Admin views it. | — | Client sees 09:00 EST/EDT; admin sees the Damascus equivalent and the client's local time; emails use each recipient's zone. | P0 | Edge |
| C-MTG-14 | DST boundary | Meeting across a DST change (e.g. Europe 2027-03-28) | 1. Propose before the change for a date after it. | — | Correct local time after the change; `.ics` uses UTC or TZID correctly. | P2 | Edge |
| C-MTG-15 | `.ics` imports correctly | Confirmed meeting | 1. Download "Add to calendar".<br>2. Import into Google Calendar, Outlook, Apple Calendar. | — | Title, time, duration, location/link, description with the portal link. Arabic title readable. | P1 | Integration |
| C-MTG-16 | Upcoming vs past ordering | Meetings in each state | 1. View the list. | — | Upcoming (soonest first), then past and cancelled (newest first). A meeting stays "upcoming" until 1 h after its start. | P3 | UI |
| C-MTG-17 | Day-before reminder | Confirmed ≥ 6 h ago, starts in < 36 h | 1. Trigger the cron (S-CRON-01). | — | Client and admin reminder emails, once. | P1 | Integration |
| C-MTG-18 | Archived project | P3 | 1. Try to propose or act (UI + curl). | — | Read-only; API 403 `projectArchived`. | P1 | Negative |
| C-MTG-19 | Rate limit | Single instance | 1. 21 meeting actions in 10 min. | — | 21st → 429. | P3 | Security |
| C-MTG-20 | Date/time picker usability | iOS Safari, Android Chrome, desktop Firefox | 1. Pick a date/time. | — | Native pickers work; 12/24 h follows the locale; Arabic labels. | P2 | UI |

### Feature: Messages

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-MSG-01 | Send a text message | P1 | 1. Type → Send. | S-NL | Appears at the bottom with my name and time; line breaks kept; composer cleared. Admin emailed (first unread). | P0 | Happy |
| C-MSG-02 | Ctrl/Cmd + Enter sends; Enter adds a line | P1 | 1. Press Enter, then Ctrl+Enter (Cmd+Enter on Mac). | — | Enter = new line; Ctrl/Cmd+Enter sends. | P2 | UI |
| C-MSG-03 | Empty / whitespace message | — | 1. Send empty or S-WS. | S-WS | Blocked; API 400 "Write a message or attach a file." | P1 | Negative |
| C-MSG-04 | Length boundaries | — | 1. 5000 and 5001 chars (after trim). | S-LEN(5000), S-LEN(5001) | 5000 sent; 5001 rejected with a translated message. | P2 | Edge |
| C-MSG-05 | XSS / markup in messages | — | 1. Send S-XSS1, S-XSS2, S-XSS3, `**bold**`, a URL. | — | Shown as text on both sides and in the email. URLs are either plain text or safe links (record which). | P0 | Security |
| C-MSG-06 | Arabic, mixed direction and emoji | — | 1. Send S-AR, S-MIX, S-EMOJI. | — | Each bubble's direction follows its text (`dir="auto"`). Order of mixed words correct. | P1 | UI |
| C-MSG-07 | Attach files with a message | — | 1. Attach 2 files, type text → Send. | F-PDF, F-PNG | One message with 2 attachments; also listed under Files; downloads work; activity "file uploaded" ×2 + "message". | P0 | Happy |
| C-MSG-08 | Attachments only | — | 1. Attach F-PDF, no text → Send. | F-PDF | Sent. | P1 | Happy |
| C-MSG-09 | More than 5 attachments | — | 1. Attach 6. | F-6 | Blocked in the UI; API 400 `tooManyFiles`. | P1 | Negative |
| C-MSG-10 | Attachments over the shared limit | — | 1. Attach five 1 MB files (5 MB). | F-5x1MB | 413 `fileTooLarge` "at most 4 MB together"; nothing stored (no orphan files under Files). | P1 | Edge |
| C-MSG-11 | Disallowed attachment type | — | 1. Attach F-EXE / F-FAKEPDF with text. | — | 415 `fileTypeNotAllowed`, translated; message not sent; text kept in the composer. | P1 | Security |
| C-MSG-12 | Admin reply appears live | Two sessions: client on Messages, admin | 1. Admin sends.<br>2. Wait ≤ 15 s without refreshing. | — | Message appears; unread state handled; no duplicate bubbles. | P0 | Happy |
| C-MSG-13 | Polling pauses in a background tab | Client tab hidden | 1. Switch to another tab for 2 min (devtools Network).<br>2. Return. | — | No `/updates` calls while hidden; an immediate refresh on return. | P2 | Edge |
| C-MSG-14 | Load older messages | > 1 page of messages | 1. Click "Load older". | — | Older page prepended without jumping the scroll; repeat until the first message; button disappears. A live refresh does not drop the older pages. | P1 | Happy |
| C-MSG-15 | Unread marker | Admin sent 3 while away | 1. Open Messages. | — | Unread messages are marked; after viewing, the home badge clears and the admin's unread count is unaffected. | P2 | Happy |
| C-MSG-16 | Email batching | Admin sends 3 messages in a row; client hasn't read | 1. Check the client inbox. | — | One email (for the first unread batch), not three. After the client reads, the next admin message emails again. After 24 h unread, one reminder email. | P1 | Integration |
| C-MSG-17 | Two clients on one project | CA and CC on P1 | 1. CA sends.<br>2. CC views. | — | CC sees CA's message (both are clients); CC's unread count includes it; admin notified once. | P1 | Happy |
| C-MSG-18 | Double-click Send | Slow 3G | 1. Double-click. | — | One message. | P1 | Edge |
| C-MSG-19 | Send offline | Offline | 1. Send. | — | Error toast/message; text and attachments kept for retry. | P1 | Edge |
| C-MSG-20 | Session expired while typing | Delete the cookie, then send | 1. Send. | — | Clear "signed out" handling (redirect to login or an error with a sign-in link); typed text not silently lost (record). | P2 | Edge |
| C-MSG-21 | Rate limit | Single instance | 1. Send 21 messages in 1 minute. | — | 21st → 429 translated. | P2 | Security |
| C-MSG-22 | Archived project | P3 | 1. Open Messages. 2. curl POST. | — | Read-only notice, no composer; API 403 `projectArchived`. | P1 | Negative |
| C-MSG-23 | Hidden attachment | Admin hid a file that was sent as an attachment | 1. View the message. | — | The attachment is no longer listed/downloadable for clients. | P1 | Security |
| C-MSG-24 | Screen reader announces new messages | NVDA/VoiceOver | 1. Receive a live message. | — | New messages announced politely (live region) or at least discoverable; composer labelled. | P2 | Accessibility |

### Feature: Files

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-FILE-01 | Upload each allowed type | P1 | 1. Upload each file. | F-PDF … F-CSV, F-UPPER | Each listed with name, size, uploader, date; visible to clients; admin sees it; activity entry. | P0 | Happy |
| C-FILE-02 | Download | Uploaded file | 1. Click download. | — | Downloads (never renders inline): `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. Bytes identical (compare checksum). | P0 | Security |
| C-FILE-03 | Arabic file name round-trip | — | 1. Upload and download F-AR. | F-AR | Name shown and saved as `عرض السعر النهائي.pdf` in Chrome, Safari, Firefox, Edge. | P1 | Edge |
| C-FILE-04 | Empty file | — | 1. Upload F-EMPTY. | — | 400 "The file is empty." | P2 | Negative |
| C-FILE-05 | Size boundaries | Default 4 MB | 1. Upload F-4MB, F-4MB+1, F-10MB. | — | 4 MB exactly: accepted on a non-Vercel host; on Vercel the multipart overhead may exceed 4.5 MB → record. 4 MB + 1 byte → 413 with the limit. 10 MB → 413 quickly (rejected from Content-Length before upload completes, or by the platform). | P1 | Edge |
| C-FILE-06 | Disallowed types | — | 1. Upload F-EXE, F-SVG, F-HTML, F-NOEXT. | — | 415 "not allowed" (translated) listing allowed types. | P0 | Security |
| C-FILE-07 | Extension / content mismatch | — | 1. Upload F-FAKEPDF, F-FAKETXT. | — | 415 (magic bytes don't match). | P0 | Security |
| C-FILE-08 | Double extension | — | 1. Upload F-DOUBLE (real PNG named `photo.exe.png`). | — | Accepted as PNG (last extension rules); downloads with that name; cannot execute from the browser. | P2 | Security |
| C-FILE-09 | Dangerous names are cleaned | — | 1. Upload F-BIDI, F-DOT, F-PATH, F-LONG. | — | Bidi/control chars removed (`reportgnp.pdf`), leading dots removed, only the base name kept (`passwd.txt`), long names cut to 150 chars keeping `.pdf`. | P1 | Security |
| C-FILE-10 | Hidden files never appear | Admin uploaded an internal file | 1. View Files and page source. | — | Not listed, not in RSC payload; direct id → 404 (C-ACL-04). | P0 | Security |
| C-FILE-11 | File becomes hidden after I saw it | Client has the Files tab open | 1. Admin hides the file.<br>2. Within 15 s, click download. | — | List refreshes and removes it; the download returns 404. | P1 | Edge |
| C-FILE-12 | Admin deletes a file I'm about to download | — | 1. Admin deletes.<br>2. Client clicks the stale link. | — | 404 or 410 "no longer available", translated; no 500. | P2 | Edge |
| C-FILE-13 | Storage backend failure | Invalid `BLOB_READ_WRITE_TOKEN` on staging | 1. Upload. 2. Download an existing file. | — | Upload: 502/503 translated "could not store"; no DB row. Download: 410 "no longer available". Problems logged. | P1 | Integration |
| C-FILE-14 | Upload progress and cancel | Slow 3G, 3 MB file | 1. Upload, then navigate away mid-upload. | — | A busy state is shown; leaving cancels without creating a partial row. | P2 | Edge |
| C-FILE-15 | Double-click Upload | — | 1. Double-click. | — | One file. | P2 | Edge |
| C-FILE-16 | Rate limit | Single instance | 1. 21 uploads in 10 min. | — | 21st → 429. | P3 | Security |
| C-FILE-17 | Archived project | P3 | 1. Upload via UI/curl. 2. Download an existing file. | — | Upload 403 `projectArchived`; download still works. | P1 | Negative |
| C-FILE-18 | Client cannot delete or hide files | Own upload | 1. Look for delete/hide.<br>2. curl DELETE `/api/portal/projects/<P1>/files/<id>`. | — | No controls; 405 for DELETE. (⚠ Question: should clients be able to remove a file uploaded by mistake?) | P2 | Negative |
| C-FILE-19 | Downloaded file with macros / zip contents | F-DOCX with macros renamed `.docx`, F-ZIP | 1. Upload and download. | — | Accepted (allow-list is by type only; no virus scan). ⚠ Record as a known limitation. | P2 | Security |
| C-FILE-20 | iOS "Choose file" sources | iPhone | 1. Upload from Photos (HEIC) and from Files. | HEIC photo | HEIC rejected with the allowed-types message unless iOS converts it to JPEG; JPEG accepted. | P2 | Integration |

### Feature: Activity feed

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-ACT-01 | Feed shows client-visible events | P1 with mixed activity | 1. Open Activity. | — | Project created / status changed / invited-joined / milestones / reviews / meetings / messages / file uploads (visible files only), newest first, with category colours and legend. | P1 | Happy |
| C-ACT-02 | Internal audit entries are hidden | Admin edited fields, deleted a task, hid a file, removed a member, revoked/resent an invite | 1. Open Activity and page source. | — | None of PROJECT_UPDATED, TASK_DELETED, FILE_VISIBILITY_CHANGED, MEMBER_REMOVED, INVITE_REVOKED, INVITE_RESENT, MILESTONE_DELETED, MILESTONE_REVIEW_WITHDRAWN appear. | P0 | Security |
| C-ACT-03 | Hidden file upload disappears from the feed | File hidden after upload | 1. Check the feed. | — | Its "file uploaded" entry is gone for clients. | P1 | Security |
| C-ACT-04 | Translated summaries | Arabic UI | 1. Switch to Arabic. | — | Every entry type has an Arabic sentence (no raw type names or English leftovers). | P1 | UI |
| C-ACT-05 | Legend not colour-only | — | 1. Check categories. | — | Category also conveyed by text/icon, not colour alone. | P2 | Accessibility |

## Stage 6: Account

### Feature: `/portal/account`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-ACC-01 | Change display name | CA | 1. Edit name → Save. | `Lina H.` | Saved confirmation shown; new name on new messages, approvals and the admin's client list. Past activity entries keep the old name (record). | P1 | Happy |
| C-ACC-02 | Name validation | — | 1. Empty, S-WS, S-LEN(101), S-XSS1. | — | Empty/space rejected; 101 rejected; XSS stored as text. | P2 | Negative |
| C-ACC-03 | Change password | Signed in on browsers A and B | 1. On A: current + new → Save.<br>2. Refresh B. | PW-10 | A stays signed in; B signed out; old password stops working. | P0 | Security |
| C-ACC-04 | Wrong current password | — | 1. Enter a wrong current password. | — | "The current password is not correct." | P1 | Negative |
| C-ACC-05 | New password policy | — | 1. PW-9, PW-73B, PW-AR37. | — | Translated policy errors. | P1 | Negative |
| C-ACC-06 | New password equals the old one | — | 1. Reuse the current password. | — | Currently accepted (no history rule); record. | P3 | Edge |
| C-ACC-07 | Password change rate limit | — | 1. 6 attempts in 15 min. | — | 6th → 429. | P2 | Security |
| C-ACC-08 | Sign out other devices | A and B signed in | 1. On A, "Sign out on all other devices".<br>2. Refresh B. | — | A stays in; B signed out. | P0 | Security |
| C-ACC-09 | Email cannot be changed | — | 1. Look for an email field. | — | Email shown read-only. ⚠ Gap: no self-service email change. | P2 | Negative |
| C-ACC-10 | Delete account | — | 1. Look for a delete/close account option. | — | ⚠ Gap: none. Only the admin can remove project access, and the user row stays. | P1 | Negative |
| C-ACC-11 | Language switch in the portal | Any portal page | 1. Switch EN ↔ AR. | — | UI and direction switch instantly; `portal_locale` cookie set; account language updated so the next email uses it. | P1 | Happy |
| C-ACC-12 | Time zone saved automatically | Browser zone Europe/Berlin | 1. Sign in.<br>2. Check meeting times and the next email. | — | Zone saved silently; times shown in Berlin time. Change the OS zone → next visit updates. | P1 | Integration |
| C-ACC-13 | Bad time zone via API | curl | 1. POST `/api/portal/timezone` `{"timeZone":"Mars/Base"}`. | — | 400; zone unchanged. | P3 | Negative |

## Stage 7: Session end and account lifecycle

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-OUT-01 | Sign out | Signed in | 1. Click Sign out.<br>2. Press Back. | — | Cookie cleared, redirected to login. Back shows login or a re-validated page, never cached project data. | P0 | Security |
| C-OUT-02 | Signed-out cookie replay | Copy the `portal_session` value before signing out | 1. Sign out.<br>2. Set the copied cookie again and open `/portal`. | — | ⚠ Gap: still signed in until its 7-day expiry (stateless token; sign-out only clears the browser). Expected for a hardened app: rejected. "Sign out other devices" or a password change does revoke it. | P1 | Security |
| C-OUT-03 | Session expiry after 7 days | Set the cookie's `exp` past (or wait) | 1. Open `/portal`. | — | Redirect to login with `from`. | P2 | Edge |
| C-OUT-04 | Logout endpoint CSRF | Another origin | 1. From a page on another origin, POST to `/api/portal/auth/logout`. | — | 403 "Invalid request origin" (Origin header mismatch). | P3 | Security |
| C-LIFE-01 | Project archived while I'm in it | CA on P1 | 1. Admin archives P1.<br>2. CA tries to send a message. | — | 403 `projectArchived` translated; after refresh the project is read-only and under "Archived" on home. | P1 | Edge |
| C-LIFE-02 | Project restored | P3 restored | 1. Open P3. | — | Composer, uploads, meetings, approvals available again. | P2 | Happy |
| C-LIFE-03 | Removed from a project while on it | CA on P1 | 1. Admin removes CA.<br>2. CA clicks any action / waits for polling. | — | Next request → 403; page shows forbidden; P1 gone from home. Other projects unaffected. | P0 | Security |
| C-LIFE-04 | Removed, then re-invited | After C-LIFE-03 | 1. Admin re-invites CA.<br>2. CA accepts with the current password. | — | Access restored; history (messages etc.) visible again. | P2 | Happy |
| C-LIFE-05 | Re-register with the same email | Account exists | 1. Admin invites the same email to a new project. | — | Must use the existing password (no duplicate account). Forgot-password path works if they don't remember it. | P1 | Edge |
| C-LIFE-06 | Invitee never accepts | INV pending > 7 days | 1. Check portal login, forgot-password. | — | Cannot sign in or reset (no password). Admin can resend. | P2 | Edge |

## Stage 8: Notifications received by the client

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| C-NTF-01 | Status change email | Admin changes P1 status | 1. Check every member's inbox. | — | One email per client member, in their language, with old → new status, current phase, and a link to the project. No email when only other fields change. | P1 | Integration |
| C-NTF-02 | Status change with no members | Project without clients | 1. Change status. | — | No email; activity meta records "No client has access to this project yet."; delivery problem logged. | P3 | Edge |
| C-NTF-03 | Meeting emails | Admin proposes / reschedules / confirms / cancels | 1. Check emails. | — | One email per event to every client member; confirmed and cancelled include `.ics`; times in each client's zone. | P1 | Integration |
| C-NTF-04 | Message email content | Admin sends a long message with 2 attachments | 1. Check the email. | — | Quotes the newest message (escaped, truncated sensibly), mentions attachments, link to Messages. No email to the sender. | P1 | Integration |
| C-NTF-05 | Links in every email land signed in | Signed in on that browser | 1. Click each email's link. | — | Lands on the right tab without signing in again (SameSite=Lax). | P1 | Integration |
| C-NTF-06 | Links in every email when signed out | Signed out | 1. Click each email's link. | — | Login, then the intended page (`from` kept). | P1 | Integration |
| C-NTF-07 | Email in Arabic renders RTL in clients | Client locale `ar` | 1. Open each email type in Gmail web/app, Outlook desktop/web, Apple Mail. | — | `dir="rtl"`, right-aligned, Arabic font fallback readable, buttons not mirrored incorrectly. | P1 | UI |
| C-NTF-08 | Unsubscribe / email preferences | — | 1. Look for opt-out. | — | ⚠ Gap: no preferences or unsubscribe link. Confirm acceptable for transactional mail. | P3 | Integration |
