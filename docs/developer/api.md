# API reference

**For:** developers. Every route handler under `app/api/` (plus `/portal/enter`), who may
call it, and what it does. The UI is the only consumer; these are internal APIs, not a
public, versioned contract.

- [Conventions](#conventions)
- [Public routes](#public-routes)
- [Admin: session, dashboard and content](#admin-session-dashboard-and-content)
- [Admin: requests and proposals](#admin-requests-and-proposals)
- [Admin: projects](#admin-projects)
- [Portal: authentication and account](#portal-authentication-and-account)
- [Portal: projects](#portal-projects)
- [Rate limits](#rate-limits)

## Conventions

**Authentication.**

- *Admin* routes need the `admin_session` cookie. `proxy.ts` rejects requests without a
  valid one (401), and each handler checks again with `authorizeAdmin()` or
  `authorizeAdminProject()` (which also returns 404 for an unknown project).
- *Client* routes need the `portal_session` cookie. Handlers load the user from the
  database with `getPortalUser()` (401 when the session was revoked) and check project
  membership with `authorizeClientProject()`: **404** for an unknown project, **403** for
  someone else's.
- *Public* routes need no session. Token routes treat the emailed token as the credential.

**CSRF.** Session cookies are `SameSite` (`Strict` for the admin, `Lax` for the portal). In
addition, every mutation passes `rejectCrossOrigin()`: when an `Origin` header is present
its host must match the request's, otherwise 403.

**Inputs** are validated with zod (`app/lib/portal/validation.ts`,
`app/lib/content/schema.ts`). Ids that don't look like cuids answer 404 without a query.

**Errors.** Portal and project APIs answer `{ "error": "<English message>", "code":
"<stableCode>" }`. The portal shows `portal.errors.<code>` from the message files; the
admin shows `error`. A few older admin routes (login, requests) answer `{ "error" }` only.

**Uploads.** Endpoints that take files accept either `multipart/form-data` (local disk
storage) or JSON references to files the browser already uploaded to Vercel Blob with a
token from the matching `/uploads` route (`{ pathname, filename }`). See
[Portal internals](portal-internals.md#files-and-uploads).

**Side effects after the response.** Emails and other notifications run in `after()`, so
a slow email never delays the response; their outcome is recorded on the related rows.

## Public routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/project-brief` | Submit a Work with me brief. Saves the `Lead` first (500 and a problem report if that fails), then emails the inbox; the email result is stored on the lead. Returns `{ success, id }`. |
| `POST` | `/api/analytics` | Analytics beacon (`type`, `path`, `label`, `referrer`, UTM fields, `sessionId`, `meta`). Always answers quickly; invalid or rate-limited beacons get 202 and are dropped. |
| `POST` | `/api/errors` | Browser crash report from the portal and admin error boundaries (`message`, `stack`, `path`). 204. Same-origin only. |
| `GET` | `/api/health` | Uptime check: `SELECT 1` against the database. 200 `{ status: "ok", checks, ms, time }`, or 503 with `"down"`. `no-store`. |
| `GET` | `/api/cron/meeting-reminders` | Sends due meeting reminders. Needs `Authorization: Bearer $CRON_SECRET` (constant-time compare); 503 when `CRON_SECRET` is unset, 401 when wrong. |
| `GET` | `/portal/enter?lang=en\|ar` | Footer "Client login": sets the `portal_locale` cookie if none is set yet, then redirects to `/portal/login`. |

The home page contact form is a **server action** (`submitContact` in
`app/actions/contact.ts`), not a route.

## Admin: session, dashboard and content

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/login` | `{ email, password }` against `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`; sets `admin_session` (httpOnly, Strict, 7 days). 503 if admin auth isn't configured. Public. |
| `POST` | `/api/admin/logout` | Clears the cookie. |
| `GET` | `/api/admin/unread` | Sidebar badges: `{ messages, problems, requests, updates, notices }`. |
| `POST` | `/api/admin/notices/seen` | The notifications screen was opened: updates `AdminState.noticesSeenAt` and returns fresh badges. |
| `POST` | `/api/admin/errors` | Resolve problems: `{ id }` for one or `{ all: true }`. |
| `GET` | `/api/admin/content/[part]` | Current content of a part (`profile`, `socials`, `projects`, `experience`, `strengths`, `skills`, or `text`): saved or default, and whether it was ever saved. |
| `PUT` | `/api/admin/content/[part]` | Save a part and/or text edits, then revalidate the public site. Validation errors come back per field. |
| `DELETE` | `/api/admin/content/[part]` | Reset a part (or given text keys) to the code's defaults. |
| `POST` | `/api/admin/users/[userId]/sign-out` | Bumps the client's `sessionVersion` (every session ends; the password stays). Logged on each of their projects. |

## Admin: requests and proposals

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/requests/[id]` | One request, with parsed list fields. |
| `PATCH` | `/api/admin/requests/[id]` | `{ status?, notes?, lastContactedAt? }`. Status changes add a `LeadStatusEvent`. |
| `POST` | `/api/admin/requests/[id]/accept` | "Accept without a proposal": creates the project from the brief, marks the request `won`, invites the client (`requestAccepted` email, chosen language). Returns the project and the invitation link. |
| `POST` | `/api/admin/requests/[id]/proposals` | Opens the request's draft: version 1 pre-filled from the brief, or the next version copied from the latest. Returns the existing draft if the latest version is one; 409 if the request was converted or already has an accepted proposal. |
| `PATCH` | `/api/admin/proposals/[proposalId]` | Save the whole draft. Sent versions answer 409. |
| `DELETE` | `/api/admin/proposals/[proposalId]` | Delete a draft. |
| `POST` | `/api/admin/proposals/[proposalId]/send` | Send a draft (needs at least one phase and a total above zero), or re-send a sent/expired one with a fresh link and validity. Supersedes older open versions, sets the request to `proposal`. Returns the link and the email result. 409 when the request was already converted. |

## Admin: projects

All paths below start with `/api/admin/projects`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `` (the base path) | Project list. |
| `POST` | `` | Create a project: name, summary, status, phase, estimated completion, optional `requestId` (converts the request, marks it `won`) and an optional first invitation. |
| `GET` | `/[projectId]` | Project detail. |
| `PATCH` | `/[projectId]` | Edit fields, change status (emails clients; Completed opens a sign-off round and sends the completion email instead), archive / restore (`{ archived }`). Audited. |
| `GET` | `/[projectId]/view` | The admin project screen's full data (`{ view }`), re-read after each change. |
| `GET` | `/[projectId]/updates` | Change stamp polled every 15 s by the open project screen. |
| `POST` | `/[projectId]/milestones` | Add a milestone (a new due date must be after every existing one). |
| `PATCH` | `/[projectId]/milestones/[milestoneId]` | Edit, set status (`todo` / `in_progress`), or move up/down. |
| `DELETE` | `/[projectId]/milestones/[milestoneId]` | Delete (its tasks and meetings stay, unlinked). |
| `POST` | `/[projectId]/milestones/[milestoneId]/review` | Ask the clients to approve (`note`, optional `link`); emails every client. 409 if already pending or done. |
| `DELETE` | `/[projectId]/milestones/[milestoneId]/review` | Withdraw the pending approval request. |
| `POST` | `/[projectId]/milestones/[milestoneId]/review/comments` | Reply under the client's change request; emails every client. |
| `POST` | `/[projectId]/tasks` | Add a task (title, description, status, milestone, `visibleToClient`). |
| `PATCH` | `/[projectId]/tasks/[taskId]` | Status, milestone, visibility (moves its comment files and activity along), fields, or move up/down. |
| `DELETE` | `/[projectId]/tasks/[taskId]` | Delete. |
| `POST` | `/[projectId]/tasks/[taskId]/comments` | Comment (JSON or multipart with files). On a client-visible task, clients are emailed (batched); on an internal one it is a note. |
| `POST` | `/[projectId]/meetings` | Propose a meeting; every client is emailed. |
| `PATCH` | `/[projectId]/meetings/[meetingId]` | `action`: accept, propose another time, cancel, edit details (including the Meet link), or mark no-show. |
| `GET` | `/[projectId]/meetings/[meetingId]/ics` | The meeting as an `.ics` file. |
| `PUT` | `/[projectId]/meetings/[meetingId]/notes` | Save the notes (summary + action items) as a draft, publish them (meeting becomes `held`, clients emailed), or edit published notes (clears the client's confirmation). |
| `POST` | `/[projectId]/meetings/[meetingId]/notes` | Under published notes: comment, or tick/untick an action item. No email. |
| `GET` | `/[projectId]/messages` | The newest page (100), or `?before=<messageId>` for the page before. |
| `POST` | `/[projectId]/messages` | Post as the admin (JSON, or multipart with up to 5 attachments); clients emailed once per unread batch. |
| `POST` | `/[projectId]/messages/read` | Mark read up to `until`. |
| `GET` | `/[projectId]/files` | File list (including hidden files). |
| `POST` | `/[projectId]/files` | Upload (multipart, or JSON refs after a direct Blob upload); `visibleToClient = "false"` keeps it internal. |
| `GET` | `/[projectId]/files/[fileId]` | Download (always as an attachment). |
| `PATCH` | `/[projectId]/files/[fileId]` | Share with clients or hide (its activity entry follows). |
| `DELETE` | `/[projectId]/files/[fileId]` | Delete the row and the stored bytes. |
| `POST` | `/[projectId]/uploads` | Issue a short-lived Vercel Blob client token for one direct upload. |
| `POST` | `/[projectId]/invitations` | Invite a client (`email`, `name`, `locale`): creates the user if needed, emails the link, returns the link. 409 for the admin's own email. |
| `POST` | `/[projectId]/invitations/[invitationId]/resend` | New token and email; the old link stops working. |
| `POST` | `/[projectId]/invitations/[invitationId]/revoke` | Stop a pending link. |
| `DELETE` | `/[projectId]/members/[memberId]` | Remove a client's access to this project (account untouched). |

## Portal: authentication and account

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/portal/auth/login` | Public | `{ email, password }`. Sets `portal_session` (httpOnly, Lax, 7 days). A language already picked with the switch (the `portal_locale` cookie) is saved to the account; otherwise the account's language sets the cookie. Unknown emails still pay the bcrypt cost. |
| `POST` | `/api/portal/auth/logout` | Public | Clears the session cookie. |
| `POST` | `/api/portal/auth/forgot-password` | Public | Always 200 with the same body; emails a 60-minute reset link after responding if the account exists. |
| `POST` | `/api/portal/auth/reset-password` | Token | `{ token, password }`: sets the password, uses the token, bumps `sessionVersion` (signs out everywhere), signs this browser in. |
| `POST` | `/api/portal/invitations/accept` | Token | New account: `{ token, name?, password }`; existing account: `{ token, password }`. Adds the membership, signs in, emails the admin "client joined". |
| `POST` | `/api/portal/proposals/respond` | Token | Accept (`signerName`, password, agreement), ask for changes (`note`), or decline (optional `note`). Accepting creates the project and account and signs in. |
| `POST` | `/api/portal/locale` | Public | `{ locale }`: sets the cookie and, when signed in, `User.locale` (email language). |
| `POST` | `/api/portal/timezone` | Client | Saves the browser's IANA time zone. |
| `PATCH` | `/api/portal/account` | Client | Display name. |
| `POST` | `/api/portal/account/password` | Client | Change password (checks the current one); ends other sessions, keeps this one. |
| `POST` | `/api/portal/account/sessions` | Client | Sign out every other device. |

## Portal: projects

All paths below start with `/api/portal/projects` and require a client session plus
membership of the project.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `` (the base path) | The client's projects (membership is the filter). |
| `GET` | `/[projectId]` | Project detail, with client-visible milestones and tasks. |
| `GET` | `/[projectId]/updates` | One stamp per live section plus the unread count; polled every 15 s. |
| `GET` | `/[projectId]/activity` | Client-visible activity. |
| `GET` | `/[projectId]/comments` | Comment threads on client-visible tasks, keyed by task id. |
| `GET` | `/[projectId]/messages` | Newest page, or `?before=<messageId>`. |
| `POST` | `/[projectId]/messages` | Send a message (JSON, or multipart with up to 5 files). Closed on archived projects. |
| `POST` | `/[projectId]/messages/read` | Mark read up to `until`. |
| `GET` | `/[projectId]/files` | Files shared with clients. |
| `POST` | `/[projectId]/files` | Upload a file. Closed on archived projects. |
| `GET` | `/[projectId]/files/[fileId]` | Download a shared file (attachment, `nosniff`, sandbox CSP, `no-store`). |
| `POST` | `/[projectId]/uploads` | Blob client token for one direct upload (Files, message or task-comment attachment). |
| `GET` | `/[projectId]/meetings` | Meetings. |
| `POST` | `/[projectId]/meetings` | Propose a meeting; the admin is emailed. |
| `PATCH` | `/[projectId]/meetings/[meetingId]` | Accept the admin's proposal, propose another time, cancel, or edit a meeting the client created. |
| `GET` | `/[projectId]/meetings/[meetingId]/ics` | `.ics` download. |
| `POST` | `/[projectId]/meetings/[meetingId]/notes` | Confirm the notes, comment (admin emailed), or tick off a client-owned action item. |
| `POST` | `/[projectId]/milestones/[milestoneId]/review` | Approve (milestone becomes done) or request changes (comment required; milestone reopens). |
| `POST` | `/[projectId]/milestones/[milestoneId]/review/comments` | Follow up under a change request; the admin is emailed. |
| `POST` | `/[projectId]/tasks/[taskId]/comments` | Comment on a client-visible task (JSON, or multipart with files); the admin is emailed (batched). |
| `POST` | `/[projectId]/completion` | Answer "is the project complete?": confirmed, or not yet with a note (admin emailed). Works on archived projects. |
| `POST` | `/[projectId]/review` | Submit the private end-of-project review (once per client per round; locked after). |

## Rate limits

In-memory, fixed window, **per server instance** (`app/lib/rateLimit.ts`), so on Vercel the
effective limit varies with the number of warm instances. Exceeding one answers 429
(`code: "rateLimited"`), except where noted.

| Key | Limit |
| --- | --- |
| Contact form (server action) | 5 per 10 min per IP |
| Project brief | 5 per 10 min per IP |
| Admin login | 10 per 5 min per IP |
| Portal login | 10 per 5 min per IP, and 10 per 15 min per email |
| Forgot password | 5 per 15 min per IP; 3 per hour per email (silently answers 200) |
| Reset password, invitation accept, proposal answer | 10 per 15 min per IP each |
| Password change, sign out other devices | 5 per 15 min per user each |
| Messages, task comments | 20 per minute per user each |
| Uploads (files) | 20 per 10 min per user |
| Upload tokens (direct Blob uploads) | 40 per 10 min per user |
| Meetings (create and act) | 20 per 10 min per user |
| Meeting-note follow-ups | 40 per 10 min per user |
| Milestone answers, change-request replies, completion answers | 20 per 10 min per user each |
| Client review | 10 per 10 min per user |
| Analytics beacons | 120 per minute per IP (silently answers 202) |
| Browser error reports | 10 per 10 min per IP (silently answers 204) |

Admin project routes have no rate limits beyond the session requirement.
