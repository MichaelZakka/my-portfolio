# Portal internals

**For:** developers. How the client portal and the admin's project tools work under the
hood: sessions, access control, and the rules each feature enforces. For the user-facing
view, see the [client guide](../client-guide.md) and
[Running a project](../operator/running-projects.md).

- [Where the code lives](#where-the-code-lives)
- [Sessions and access control](#sessions-and-access-control)
- [Credentials and one-time links](#credentials-and-one-time-links)
- [Proposals](#proposals)
- [Projects and progress](#projects-and-progress)
- [Milestone sign-off and change requests](#milestone-sign-off-and-change-requests)
- [Tasks and task comments](#tasks-and-task-comments)
- [Meetings, calendar files and reminders](#meetings-calendar-files-and-reminders)
- [Meeting notes](#meeting-notes)
- [Messages](#messages)
- [Files and uploads](#files-and-uploads)
- [Notifications and email](#notifications-and-email)
- [Activity and audit trail](#activity-and-audit-trail)
- [Completion and client reviews](#completion-and-client-reviews)
- [Language and time zones](#language-and-time-zones)
- [Live updates](#live-updates)

## Where the code lives

| Module (`app/lib/portal/`) | Responsibility |
| --- | --- |
| `access.ts` | `authorizeClientProject()`, `authorizeAdmin()`, `authorizeAdminProject()`, `getAdminActor()`. |
| `session.ts` | `getPortalUser()` (per-request cached), session cookie helpers. |
| `credentials.ts` | bcrypt hashing, password policy, token generation and hashing. |
| `validation.ts` | zod schemas for every portal and admin-project input. |
| `http.ts` | `apiError()` and friends, JSON body parsing, `rejectCrossOrigin()`. |
| `constants.ts` | Statuses, limits, TTLs, upload types, `progressPercent()`, `currentPhaseOf()` (client-safe). |
| `queries.ts` | Read models with the client-visibility filters applied in one place. |
| `present.ts` | Client-facing JSON shapes, formatted on the server. |
| `adminView.ts` | `buildAdminProjectView()`: the admin project screen's data. |
| `projects.ts` | `createProject()`, shared by New project, Accept request and accepted proposals. |
| `proposals.ts`, `proposalDefaults.ts` | Proposal lifecycle; bilingual starting content per project type. |
| `invitations.ts` | Create, resend, revoke, look up invitations. |
| `work.ts` | Milestone and task mutations, ordering, visibility sync. |
| `reviews.ts` | Milestone sign-off rounds and change-request replies. |
| `taskComments.ts` | Task comment threads. |
| `meetings.ts`, `meetingNotes.ts`, `calendar.ts` | Meeting rules, notes, `.ics` files. |
| `messages.ts`, `chat.ts` | Messages, read markers, unread counts, live stamps; thread layout. |
| `files.ts`, `storage.ts`, `uploadTokens.ts`, `uploadClient.ts` | Upload validation, storage drivers, direct Blob uploads (server and browser side). |
| `email.ts`, `notify.ts` | Every portal email; who gets notified about what. |
| `activity.ts` | `logActivity()`, `logAudit()`, visibility sync, client sentences. |
| `completion.ts` | Completion rounds, client reviews, the reviews dashboard. |
| `users.ts` | The admin's Users screens. |
| `locale.ts`, `format.ts`, `datetimeInput.ts` | Portal language, server-side formatting, local date inputs. |

## Sessions and access control

**Tokens** (`app/lib/auth.ts`) are `base64url(payload).base64url(HMAC-SHA256)` signed with
`AUTH_SECRET` using Web Crypto, so the proxy can verify them. Payload: `sub`, `iat`, `exp`
(7 days). Portal tokens add `aud: "portal"` and `ver` (the user's `sessionVersion`), and
are signed over the string `portal.<payload>`; admin tokens sign the bare payload. That
domain separation means a client's cookie can never verify as an admin session.

| | Admin | Portal |
| --- | --- | --- |
| Cookie | `admin_session` | `portal_session` |
| Attributes | httpOnly, `SameSite=Strict`, `Secure` in production, 7 days | httpOnly, `SameSite=Lax` (so links in emails land signed in), `Secure` in production, 7 days |
| Identity | `ADMIN_EMAIL` (env, scrypt hash in `ADMIN_PASSWORD_HASH`) | `User` row (bcrypt) |
| Revocation | Only by rotating `AUTH_SECRET` (stateless) | Bump `User.sessionVersion` |

**Checks, layer by layer.**

1. `proxy.ts`: signature, expiry and audience only.
2. `getPortalUser()`: loads the user, rejects a `sessionVersion` mismatch, a missing
   password or a non-client role. Cached per request with React `cache()`.
3. `authorizeClientProject()`: membership (`ProjectMember`) is the only thing that grants
   access. Unknown project → 404; not a member → 403 (`forbidden()`).
4. Client queries apply visibility in one place (`queries.ts`): internal tasks, hidden
   files, and activity tied to them never reach a client. Milestones returned to clients
   are allow-listed, because the progress select reads internal task statuses.

**The admin as an author.** Messages, uploads and activity need a `User` author, so
`getAdminActor()` upserts a `role: "admin"` row for `ADMIN_EMAIL` (no password, can't sign
in to the portal). Inviting that email as a client is refused.

**"View as client"** (`/portal/preview/[projectId]`) is let through by the proxy with the
admin cookie and renders the shared `ProjectView` read-only, as the project's first client
sees it, with links pointing at admin APIs.

## Credentials and one-time links

- Client passwords: bcrypt, cost 12. Policy: at least 10 characters (code points) and at
  most 72 **bytes** (bcrypt ignores the rest). No complexity rule, not trimmed.
- Unknown emails at sign-in are compared against a precomputed `DUMMY_HASH`, so response
  time doesn't reveal which emails have accounts. Forgot-password always answers the same
  way and sends after responding.
- Invitation, reset and proposal tokens: 256 random bits, base64url (43 characters,
  `TOKEN_PATTERN`). Only their SHA-256 is stored. The raw link exists only in the email and
  in the API response to the admin who created it.
- **Invitations**: valid 7 days. Inviting the same email to the same project again revokes
  older pending invitations; resending issues a new token. Accepting creates or completes
  the account (new: optional name + password; existing: current password), adds the
  membership, signs in, and emails the admin.
- **Password reset**: valid 60 minutes, single use; a new request deletes older unused
  tokens. Resetting bumps `sessionVersion` (every session ends) and signs this browser in.

## Proposals

Lifecycle (`proposals.ts`):

```text
draft ──send──▶ sent ──accept──▶ accepted   (project + milestones + account, one transaction)
  ▲              │  ├──changes──▶ changes_requested
  │              │  └──decline──▶ declined   (lead → lost)
  │              └──(validUntil passes)──▶ "expired" (computed; changes/decline still allowed)
  └── revise: copy latest into version N+1; sending it marks older sent/changes_requested → superseded
```

- One draft at a time; v1 is pre-filled from the brief with `proposalDefaults()` in the
  lead's language (`contactLocale`, or a guess).
- **Send** requires at least one phase and a total above zero, refuses the admin's own
  email and converted requests, locks the content, stores `tokenHash`, sets `validUntil =
  now + validDays`, supersedes older open versions, and moves the lead to `proposal`.
  Re-sending a sent or expired version replaces the token and restarts the validity.
- **Accept** (`acceptProposal()`), in one transaction: checks the token, state and
  password (existing account) or creates the user; creates the project via
  `createProjectInTransaction()` with one milestone per phase (`estimatedDays` =
  `durationDays`, due dates from the schedule); adds the membership; stores the signer's
  name, IP and user agent, `snapshot` (JSON of the accepted content) and `snapshotHash`
  (SHA-256); marks the lead `won`. The client is signed in and lands in the project.
- The client's language: a language picked with the switch on the proposal page wins;
  otherwise the proposal's language; never the browser's.

## Projects and progress

- `createProject()` / `createProjectInTransaction()` create the project, its
  `PROJECT_CREATED` activity and, when it comes from a request, set `requestId` (unique:
  a request converts once) and the lead's `won` status.
- **Current phase** (`currentPhaseOf()`): the first milestone (in order) that isn't done,
  or the last one; `Project.currentPhase` only for projects without milestones.
- **Progress** (`progressPercent()`): each milestone weighs its `estimatedDays` (missing
  estimates weigh the average of the others; all equal when none has one). Done counts
  fully; in progress counts the done share of its tasks (internal tasks included), capped
  at 90% of its weight. The result is capped at 99 until every milestone is done.
- **Status changes** are logged (`STATUS_CHANGED`) and emailed to every client;
  `completed` sends the completion email instead and opens a sign-off round.

## Milestone sign-off and change requests

`reviews.ts`:

- The admin may only set `todo` or `in_progress`; `done` is reached through an approved
  `MilestoneReview`. An already-done milestone must be reopened before asking again.
- One `pending` round per milestone. The admin can withdraw it (hidden from the client
  feed, kept in history).
- Any client member answers; the update claims the round atomically so a double click,
  a second client or a racing withdrawal loses. Approve → milestone `done` (+
  `completedAt`); changes (comment required) → `in_progress`.
- **Change-request threads** (`replyToChangeRequest()`): `ReviewComment` replies only on
  the latest non-withdrawn round while it is `changes_requested`; a new approval request
  closes it (`409 reviewNotOpen`). Every reply emails the other side, unbatched. The
  admin's Milestones badge counts threads where the client spoke last.

## Tasks and task comments

- `work.ts`: dense ordering within each milestone; moving swaps neighbours and renumbers.
  Status `done` stamps `completedAt` and logs `TASK_COMPLETED`.
- **Visibility.** Toggling `visibleToClient` also flips the task's comment attachments and
  its activity entries (`syncActivityVisibility()`), and logs `FILE_UPLOADED` activity for
  attachments that become visible.
- **Comments** (`taskComments.ts`): clients on visible tasks only; the admin on any (on an
  internal task it's a private note, never emailed). Emails are batched per recipient:
  covered while the last email is less than 24 hours old and the recipient hasn't
  commented since (`Project.adminTaskCommentsNotifiedAt`,
  `ProjectMember.taskCommentsNotifiedAt`). A task "waits for reply" while its newest
  comment is a client's; there is no resolved state.

## Meetings, calendar files and reminders

Rules (`meetings.ts`); "client" means any client member:

- Creating a meeting proposes it; the start must be in the future; duration from
  `MEETING_DURATIONS`.
- Only the side that did **not** make the pending proposal (`proposedByRole`) can accept.
  Either side can propose another time (the decision goes back to the other side) or
  cancel, including after confirmation.
- Details (topic, agenda, duration, milestone) belong to the creator (`createdByRole`) and
  can be edited without asking again. The Meet link (`location`) is always the admin's;
  setting it emails the clients (`MEETING_LINK_ADDED`).
- After the start time the admin can write notes (publishing → `held`) or mark
  `no_show`. Both are final.
- Every update is conditional on the state that was checked, so two people acting at once
  can't both win.

**Calendar files** (`calendar.ts`): RFC 5545, times in UTC, a stable UID per meeting and a
growing SEQUENCE so a newer file updates (or, cancelled, removes) the same event; alarms a
day and an hour before. Attached to confirmation and cancellation emails, and downloadable
from `…/meetings/[id]/ics`.

**Reminders** (`sendMeetingReminders()` in `notify.ts`, run by the daily cron): confirmed
meetings starting within the next 36 hours, confirmed at least 6 hours ago, on
non-archived projects, not yet reminded. Each is claimed via `reminderSentAt` before
sending (overlapping runs never double-send); rescheduling clears it. Clients and the
admin are emailed.

## Meeting notes

`meetingNotes.ts`: once a meeting has started, the admin saves a summary (≤ 10,000
characters) and action items (≤ 30, owner `admin` or `client`). Drafts are private.
Publishing sets `outputPublishedAt`, status `held`, and emails the clients. Editing
published notes bumps `outputSavedAt` and, if the content changed, clears the client's
acknowledgement. Under published notes: clients acknowledge, comment (≤ 3000 characters;
the admin is emailed), and tick their own items; the admin ticks any item and replies
(no email). Each change bumps `Meeting.updatedAt`, which the live stamps pick up.

## Messages

`messages.ts`:

- Input: JSON `{ content, uploads? }` (direct Blob uploads) or multipart with `content` and
  up to 5 `files`. Content is trimmed, ≤ 5000 characters, may be empty when there are
  attachments. Attachments are `ProjectFile` rows with `messageId`, so they also appear
  under Files, follow visibility, and download through the same authorized routes.
- Pages of 100 (`?before=<id>` for older ones).
- Read markers: `ProjectMember.lastReadAt` for clients, `Project.adminLastReadAt` for the
  admin. Unread counts derive from them.
- **Email batching** (`notifyAboutMessage()`): one email per unread batch. A recipient
  whose last message email is unread and less than 24 hours old gets none (the message is
  marked `emailBatched`). The send is claimed first via `lastNotifiedAt` so simultaneous
  messages can't both email; a failed send releases the claim. The email states how many
  messages are unread and quotes the newest.

## Files and uploads

**Validation** (`files.ts`):

- Allowed types by extension (`UPLOAD_TYPES`): pdf, png, jpg/jpeg, gif, webp, zip, docx,
  xlsx, pptx, txt, csv. The stored MIME type comes from the extension; the browser's
  claimed type is ignored. The file's leading bytes must match the extension (magic
  numbers; text files must contain no NUL bytes in the first 8 KB).
- Size: `PORTAL_MAX_UPLOAD_MB` (default 25, capped at 100) per file.
- Display names are sanitised: path separators, control characters and bidi overrides
  (which could disguise `invoice‮fdp.exe`) are removed; length capped.

**Storage drivers** (`storage.ts`): `local` (disk under `STORAGE_LOCAL_DIR`, development
only, refused on Vercel) and `vercel-blob` (private store). `ProjectFile.storageDriver`
records the driver per file, so changing drivers keeps old files readable. Another
backend only needs to implement the `StorageDriver` interface. No storage URL is ever
handed out.

**Direct uploads (Vercel Blob).** Vercel Functions reject bodies over 4.5 MB, so:

1. The browser asks `POST …/uploads` for a client token (`uploadTokens.ts`); the token
   only allows one file, the allowed content types and the size limit, under
   `projects/<projectId>/incoming/<uuid>.<ext>`.
2. The browser uploads straight to Blob (`@vercel/blob/client`, `uploadClient.ts`).
3. The app request (file upload, message, task comment) carries only
   `{ pathname, filename }` references. `claimDirectUploads()` checks the prefix, that the
   blob isn't claimed already, the size and the leading bytes; if any check fails, all of
   them are deleted.

With the local driver, files travel in the multipart request instead. Uploads through the
app are stored under `projects/<projectId>/<uuid>`.

**Downloads** stream through the authorized routes with `Content-Disposition:
attachment`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src
'none'; sandbox` and `Cache-Control: private, no-store`. A row whose bytes are missing
answers 410 and is reported to the problem log.

## Notifications and email

- Notifications run in `after()` once the response is sent, then record the outcome on
  the related row (`emailSent` / `emailError`, or in `Activity.meta`). Failures other than
  "Resend not configured" go to the problem log (`reportDeliveryFailure()`).
- **Every client gets their own email, in their own language** (`User.locale`), so
  addresses are never exposed to each other. Admin emails go to `PORTAL_NOTIFY_EMAIL`.
- Links use `portalUrl()` (`NEXT_PUBLIC_SITE_URL`), never the request's Host header.
- Without `RESEND_API_KEY` nothing is sent; in development invitation and reset links are
  printed to the server console.
- All strings are under `portalEmail` in `messages/*.json`; the HTML layout comes from
  `app/lib/emailTheme.ts`.

| Batched | Not batched |
| --- | --- |
| Messages (per unread batch, 24 h), task comments (per recipient, 24 h) | Everything else: invitations, proposals and answers, approvals, change-request replies, meetings, notes, status, completion, reviews, resets |

## Activity and audit trail

`logActivity()` writes an `Activity` row with an English `summary` (for the admin) and a
JSON `meta` from which the portal builds a translated sentence
(`portal.activity.<TYPE>`). `logAudit()` records admin-side changes (`AUDIT_ACTIVITY_TYPES`)
with `visibleToClient: false`. Entries tied to a task or file follow its visibility.
Activity types are grouped into colour-coded categories (`ACTIVITY_CATEGORIES`) for the
feeds.

## Completion and client reviews

`completion.ts`:

- `syncCompletionRound()` runs inside the project-update transaction: status `completed`
  needs an open `CompletionRound` (opened if missing); any other status closes it.
  Completing again opens a new round, so everyone is asked again.
- Each client member's `ClientReview` row: `answerCompletion()` (confirmed, or `not_yet`
  with a note, which emails the admin; `not_yet` can later become confirmed) then
  `submitClientReview()` (required: `overall`, `portalEase`; optional: `recommend`,
  `painPoints`, service and communication ratings, text answers; locks on submit, emails
  the admin). Archived projects still accept both.
- The reviews dashboard (`getReviewsDashboard()`) computes averages, the Net Promoter
  Score (`netPromoterScore()`: % promoters 9–10 minus % detractors 0–6) and the waiting
  list. Reviews are never exposed outside the admin.

## Language and time zones

- **Portal language** (`locale.ts`): the `portal_locale` cookie (one year) if set;
  otherwise what is known about the person (their account, the proposal's language); then
  the browser's `Accept-Language`. The switch (`POST /api/portal/locale`) sets the cookie
  and, when signed in, `User.locale`. Sign-in saves a cookie language to the account.
- **Emails** always use the recipient's `User.locale`.
- Known gap: invitation and proposal pages open in the cookie or browser language on the
  first visit, because the root portal layout sets `<html dir>` before the page knows the
  token.
- **Time zones** (`format.ts`): everything is formatted on the server. Clients use
  `User.timeZone` (sent by `TimeZoneSync` when the browser's zone differs), falling back to
  `PORTAL_TIME_ZONE`; the admin uses `PORTAL_TIME_ZONE` and also sees the client's local
  time for meetings. Arabic dates use Levantine month names with Latin digits, matching the
  rest of the Arabic copy. Date-only values are UTC midnight. Meeting inputs use
  `datetime-local` converted to an ISO instant in the browser (`datetimeInput.ts`).

## Live updates

No websockets. Open project screens poll a cheap "updates" endpoint every 15 seconds:

- Portal: `GET /api/portal/projects/[id]/updates` returns one stamp per live section
  (messages, files, activity, meetings, comments…) plus the unread count;
  `LiveSections.tsx` re-fetches only the sections whose stamp changed, from the portal GET
  APIs.
- Admin: `GET /api/admin/projects/[id]/updates`; when its stamp changes, the screen reloads
  `GET /api/admin/projects/[id]/view`.
- The admin sidebar polls `/api/admin/unread` every minute.
