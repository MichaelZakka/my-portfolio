# Data model

**For:** developers. The PostgreSQL schema (`prisma/schema.prisma`), its conventions, and
how migrations are made and applied.

- [Conventions](#conventions)
- [Overview](#overview)
- [Sales: requests and proposals](#sales-requests-and-proposals)
- [People and access](#people-and-access)
- [Project work](#project-work)
- [Completion and reviews](#completion-and-reviews)
- [Site and operations](#site-and-operations)
- [What gets deleted with what](#what-gets-deleted-with-what)
- [Migrations](#migrations)

## Conventions

- **Ids** are Prisma `cuid()` strings. Route parameters are validated against
  `idSchema` (`/^[a-z0-9]{20,40}$/i`); anything else answers 404 without a query.
- **Enum-like columns are plain strings** (statuses, roles, sources). Allowed values and
  admin labels live in `app/lib/portal/constants.ts` (and `LEAD_STATUSES` in
  `app/lib/leads.ts`); client labels in `messages/*.json` under `portal`. This dates from
  when the schema also had to run on SQLite.
- **List-like columns are JSON text** (`Lead.projectTypes`, `Proposal.phases`,
  `ClientReview.painPoints`, `SiteContent.data`…), parsed with helpers that tolerate bad
  data (`fromJsonArray()`, `proposalContent()`, `parsePainPoints()`).
- **Emails are stored lower-cased** (`User.email` is unique).
- **Date-only fields** (due dates, estimated completion) are stored as UTC midnight.
- **Tokens are never stored**: invitations, password resets and proposals store the
  SHA-256 hex of a 256-bit random token (`tokenHash`, unique).
- **Email bookkeeping**: rows that trigger an email record the outcome (`emailSent`,
  `emailError`), so failures are visible in the admin.
- **Row-level security is on for every table**, with no policies (see
  [Migrations](#migrations)).

## Overview

```text
Lead ─┬─< LeadStatusEvent
      ├─< Proposal (one row per version)
      └── Project? (requestId, unique)
             │
User ─< ProjectMember >─ Project ─┬─< Milestone ─┬─< Task ─< TaskComment ─< ProjectFile
  │                               │              ├─< MilestoneReview ─< ReviewComment
  ├─< Invitation >────────────────┤              └─< Meeting (optional link)
  ├─< PasswordResetToken          ├─< Meeting ─┬─< MeetingActionItem
  │                               │            └─< MeetingComment
  │                               ├─< Message ─< ProjectFile (attachments)
  │                               ├─< ProjectFile
  │                               ├─< Activity
  │                               └─< CompletionRound ─< ClientReview >─ User
  │
Standalone: AnalyticsEvent, ContactMessage, SiteContent, AdminState, ErrorEvent
```

## Sales: requests and proposals

### `Lead`: a project request

One row per brief from the Work with me form. Holds every brief field 1:1 (title,
description, timeline, budget, contact details, project types, domains, brand, colours,
mood…), plus:

| Field | Meaning |
| --- | --- |
| `status` | `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`, `archived`. Any transition is allowed. |
| `source` | Always `work-with-me` today. |
| `notes`, `lastContactedAt` | The admin's private notes (the API also accepts `lastContactedAt`; the UI doesn't set it yet). |
| `contactLocale` | `en` or `ar`: the language chosen in the brief for everything sent to the client. Null on older rows; `guessLeadLocale()` then guesses from the landing path and the brief's script. |
| `userAgent`, `referrer`, `landingPath` | Request metadata. `landingPath` is the first page of the visitor's tab session. |
| `emailSent`, `emailError` | Outcome of the notification email to the inbox. |

`LeadStatusEvent` records every status change (`fromStatus`, `toStatus`, `note`).

### `Proposal`: a priced scope, one row per version

| Field | Meaning |
| --- | --- |
| `version` | 1, 2, … per lead (`@@unique([leadId, version])`). |
| `status` | `draft` → `sent` → `accepted` / `changes_requested` / `declined`, or `superseded` when a newer version is sent. "Expired" is computed (`sent` and `validUntil` in the past), never stored. |
| `locale` | Language the content is written in. |
| `title`, `summary`, `phases` (JSON `{ title, description, durationDays }[]`), `included`, `excluded`, `clientProvides` (JSON lists) | The content. Only drafts are editable. |
| `currency`, `totalAmount` (whole units), `paymentTerms`, `revisionRounds`, `startDate` (null = on acceptance), `validDays` | Terms. |
| `recipientEmail`, `recipientName`, `tokenHash`, `sentAt`, `validUntil`, `emailSent`, `emailError` | Set when sent; re-sending replaces `tokenHash` and restarts `validUntil`. |
| `respondedAt`, `responseNote`, `signerName`, `signerIp`, `signerUserAgent` | The client's answer. |
| `snapshot`, `snapshotHash` | JSON of exactly what was accepted, and its SHA-256. |

Accepting a proposal creates, in one transaction, the `Project` (linked to the lead), one
`Milestone` per phase (with `estimatedDays` = the phase's duration), the client's `User`
(or reuses it) and their `ProjectMember` row, and marks the lead `won`.

## People and access

### `User`

Anyone attached to a project.

| Field | Meaning |
| --- | --- |
| `role` | `client`, or `admin` for the single author account of `ADMIN_EMAIL` (created on first use by `getAdminActor()`; it never has a password and can't sign in to the portal). |
| `passwordHash` | bcrypt (cost 12). Null until an invitation or proposal is accepted. |
| `locale` | `en` / `ar`: portal language and the language of every email to this person. |
| `timeZone` | IANA zone from the browser; null = `PORTAL_TIME_ZONE`. |
| `sessionVersion` | Embedded in each portal session token. Bumping it (password change or reset, "sign out other devices", the admin's "sign out everywhere") invalidates every existing session. |
| `emailVerifiedAt`, `lastLoginAt` | Set when a link is accepted, and at each sign-in. |

### `ProjectMember`

**The only thing that grants a client access to a project.** Unique per
`(projectId, userId)`. Also stores the client's message read marker (`lastReadAt`) and
email batching stamps (`lastNotifiedAt`, `taskCommentsNotifiedAt`).

### `Invitation` and `PasswordResetToken`

- `Invitation`: `email`, `tokenHash`, `expiresAt` (7 days), `acceptedAt`, `revokedAt`,
  `lastSentAt`, email outcome. State is computed (`pending`, `accepted`, `revoked`,
  `expired`). Inviting the same email to the same project again revokes older pending
  invitations; resending issues a new token.
- `PasswordResetToken`: `tokenHash`, `expiresAt` (60 minutes), `usedAt`, email outcome. A
  new request deletes older unused tokens.

## Project work

### `Project`

`name`, `summary`, `status` (`planning`, `in_progress`, `review`, `on_hold`, `completed`),
`currentPhase` (manual fallback; normally derived from milestones), `estimatedCompletion`,
`startedAt`, `completedAt`, `archivedAt` (archived = read-only for clients), `requestId`
(the lead it came from, unique). The admin isn't a member, so the admin's read and email
stamps live here: `adminLastReadAt`, `adminLastNotifiedAt`, `adminTaskCommentsNotifiedAt`.

### `Milestone`, `MilestoneReview`, `ReviewComment`

- `Milestone`: `title`, `description`, `status` (`todo`, `in_progress`, `done`), `order`
  (dense 0..n-1), `estimatedDays` (weight in the progress bar), `dueDate`, `completedAt`.
  The admin can only set `todo` / `in_progress`; `done` comes from an approved review.
- `MilestoneReview`: one sign-off round. `status` `pending` → `approved` /
  `changes_requested`, or `withdrawn`. At most one pending round per milestone. Keeps the
  note, optional preview `link`, who asked and who answered, the response, and the email
  outcome. Rounds are never deleted.
- `ReviewComment`: replies under a `changes_requested` round (`authorRole` client or
  admin). Only allowed on the latest non-withdrawn round while it is
  `changes_requested`.

### `Task` and `TaskComment`

- `Task`: optional `milestoneId`, `status` (`todo`, `in_progress`, `done`),
  `visibleToClient`, `order` within its milestone, `completedAt`.
- `TaskComment`: `body`, `authorRole`. Attachments are `ProjectFile` rows with
  `taskCommentId`; they follow the task's visibility.

### `Meeting`, `MeetingActionItem`, `MeetingComment`

| Field | Meaning |
| --- | --- |
| `status` | `proposed`, `confirmed`, `cancelled`; after the meeting `held` (notes published) or `no_show`. |
| `proposedByRole` | The side whose proposal is pending (`client`/`admin`); flips on every new time. Only the other side can accept. |
| `createdByRole` | Who created it: owns the topic, agenda, duration and milestone. |
| `startsAt`, `durationMinutes` | 15, 30, 45, 60, 90 or 120. |
| `location` | The Google Meet link (admin-owned). |
| `confirmedAt`, `cancelledAt`, `reminderSentAt` | `reminderSentAt` claims the reminder; cleared when the time changes. |
| `outputSummary`, `outputSavedAt`, `outputPublishedAt`, `noShowAt` | Meeting notes: a draft until published. |
| `acknowledgedAt`, `acknowledgedById` | A client confirmed the notes; cleared when they change. |

`MeetingActionItem`: `text`, `owner` (`admin` / `client`), `position`, `doneAt`,
`doneById`. `MeetingComment`: the thread under published notes.

### `Message`

`content` (up to 5000 characters, or empty with attachments), `senderId`, email outcome
plus `emailBatched` (no email of its own because the recipient still had an unread
notification). Attachments are `ProjectFile` rows with `messageId`.

### `ProjectFile`

`filename` (sanitised display name), `storageKey`, `storageDriver` (`local` or
`vercel-blob`: the driver that holds the bytes, so switching drivers never orphans old
files), `fileSize`, `mimeType` (derived from the extension, checked against the bytes),
`visibleToClient`, and optional `messageId` / `taskCommentId`.

### `Activity`

The project's event log: `type` (one of `ACTIVITY_TYPES`), `actorId`, `summary` (English,
for the admin), `meta` (JSON details, from which clients get a translated sentence, plus
email bookkeeping), `visibleToClient`. Audit types (edits, deletions, visibility changes,
removed members, revoked or resent invitations, sign-outs, submitted reviews) are always
internal.

## Completion and reviews

- `CompletionRound`: opened each time a project becomes `completed`, closed
  (`closedAt`) when it leaves that status. Completing again opens a new round.
- `ClientReview`: one per client per round (`@@unique([roundId, userId])`).
  `completion` (`confirmed` / `not_yet`), `missingNote`, `answeredAt`, `confirmedAt`,
  then the survey: `overall` and `portalEase` (1–5, required), `recommend` (0–10),
  `painPoints` (JSON keys from `REVIEW_PAIN_POINTS`), the service and communication
  ratings (1–5, optional), free-text answers; `submittedAt` locks it. `reviewerName` and
  `reviewerEmail` are copied so the review survives account deletion.

## Site and operations

| Table | Purpose |
| --- | --- |
| `AnalyticsEvent` | Page views and funnel events (`page_view`, `cta_click`, `survey_*`): path, label, referrer, UTM fields, device, country, per-tab session id, small JSON `meta`. |
| `ContactMessage` | Home page contact-form messages: name, email, message, `read`, `emailSent`. |
| `SiteContent` | The Content editor's documents, keyed `profile`, `socials`, `projects`, `experience`, `strengths`, `skills`, `text.en`, `text.ar`. A missing row means "use the code's defaults". |
| `AdminState` | A single row (`id = 1`): `noticesSeenAt` for the notifications badge. Missing row = last 7 days count as new. |
| `ErrorEvent` | The problem log: unique `fingerprint` (source + normalised message), `source`, `message`, `detail`, `path`, `count`, `firstSeenAt`, `lastSeenAt`, `alertedAt`, `resolvedAt`. |

## What gets deleted with what

Nothing in the UI deletes a lead, project or user. The schema still defines the cascades:

- Deleting a `Project` deletes its members, invitations, milestones, tasks, comments,
  messages, files (rows only, not stored bytes), meetings, activity, reviews and rounds.
  Its `Lead` keeps existing (`requestId` is on the project).
- Deleting a `Lead` deletes its status events and proposals; its project's `requestId`
  becomes null.
- Deleting a `User` deletes their memberships, invitations, reset tokens, messages and
  uploaded files (rows); authored comments, activity and reviews keep their content with
  the author set to null.
- Deleting a `Milestone` keeps its tasks and meetings (their `milestoneId` becomes null)
  and deletes its review rounds.

The admin can delete individual milestones, tasks, files, contact messages and proposal
drafts.

## Migrations

`prisma/migrations/` holds the PostgreSQL history; Vercel applies it on every deploy with
`prisma migrate deploy` (the `vercel-build` script), and a failed migration fails the
deploy. `prisma/migrations-sqlite/` is the earlier SQLite history, kept for reference only.

| Migration | Adds |
| --- | --- |
| `20261031000000_init` | Leads, analytics, users, projects, members, invitations, reset tokens, milestones, tasks, messages, files, activity (Postgres baseline). |
| `20261031120000_meetings` | Meetings. |
| `20261101000000_proposals` | Proposals. |
| `20261101120000_milestone_reviews` | Milestone sign-off rounds; `Milestone.estimatedDays`. |
| `20261101180000_time_zones_reminders` | `User.timeZone`, `Meeting.reminderSentAt`. |
| `20261102000000_messages_audit_monitoring` | Read markers and email batching stamps, attachments, `ErrorEvent`. |
| `20261109000000_enable_rls` | Row-level security on every existing table. |
| `20261110000000_site_content` | `SiteContent`. |
| `20261111000000_admin_state` | `AdminState`. |
| `20261118000000_contact_messages` | `ContactMessage`. |
| `20261118120000_lead_contact_locale` | `Lead.contactLocale`. |
| `20261118130000_meeting_created_by_role` | `Meeting.createdByRole`. |
| `20261118140000_meeting_notes` | Meeting notes, action items, comments. |
| `20261118150000_task_comments` | Task comments and their batching stamps. |
| `20261118160000_review_comments` | Change-request replies. |
| `20261119120000_client_reviews` | Completion rounds and client reviews (backfills an open round for already-completed, non-archived projects). |

### Adding a migration

1. Change `prisma/schema.prisma`.
2. Against a **development** database, run `npm run db:migrate -- --name <what_changed>`,
   or write the SQL yourself and generate the exact diff with
   `prisma migrate diff --from-url <migrated throwaway db> --to-schema-datamodel prisma/schema.prisma --script`.
   An empty diff afterwards proves the schema and migrations match.
3. **Enable row-level security on every new table** in the same migration:
   `ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;`. Supabase's Data API would otherwise
   expose it to anyone holding the project's publishable key. The app connects as the
   table owner through Prisma, which RLS doesn't restrict.
4. Keep new string-enum values in `constants.ts`, and make new columns nullable or
   defaulted so the deploy's migration can't fail on existing rows.
5. Commit the migration folder; `*.sql` is git-ignored except under `prisma/migrations*/`.
