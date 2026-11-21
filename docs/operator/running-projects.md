# Running a project

**For:** the site operator. Everything you do on a client project, from setting it up to
the final review. Screens are under **Projects** in the admin dashboard.

- [The project list](#the-project-list)
- [The project screen](#the-project-screen)
- [Status and phase](#status-and-phase)
- [Milestones and approvals](#milestones-and-approvals)
- [Tasks](#tasks)
- [Meetings and meeting notes](#meetings-and-meeting-notes)
- [Messages](#messages)
- [Files](#files)
- [Clients: invitations and access](#clients-invitations-and-access)
- [Activity and the audit trail](#activity-and-the-audit-trail)
- [Settings: editing and archiving](#settings-editing-and-archiving)
- [View as client](#view-as-client)
- [Completion sign-off and client reviews](#completion-sign-off-and-client-reviews)
- [What clients are emailed](#what-clients-are-emailed)

## The project list

**Projects** shows Active, Archived or All projects, with their clients, status, phase,
progress, estimated completion and last update. Projects are created from a request (see
[Requests and proposals](requests-and-proposals.md)) or with **New project**. A project
can be archived but not deleted.

## The project screen

Eight tabs: **Overview, Milestones, Meetings, Messages, Files, Clients, Activity** and
**Settings**. The screen checks for changes every 15 seconds and reloads its data when a
client did something, so you don't need to refresh.

Times on the admin screens are in your time zone (the `PORTAL_TIME_ZONE` setting, e.g.
`Asia/Damascus`). Clients see times in their own browser's time zone, and meeting entries
show both when they differ.

## Status and phase

| Status | Use it for |
| --- | --- |
| Planning | Before work starts. |
| In progress | Work under way. |
| In review | Waiting on the client's review. |
| On hold | Paused. |
| Completed | Finished: this starts the client sign-off (see [below](#completion-sign-off-and-client-reviews)). |

Every status change is emailed to the clients, in their language. **Current phase** is
worked out from the milestones (the first one that isn't done); you only type a phase by
hand on a project without milestones. **Estimated completion** is a date you set.

## Milestones and approvals

Milestones are the project's phases, in order. Projects created from a proposal start with
one milestone per proposal phase.

- **Add** a milestone with a title, description, due date and an estimate in days. A new
  milestone's due date must be later than every existing one. Reorder with the arrows.
- **Status**: you can set **To do** or **In progress**. Only a client's approval marks a
  milestone **Done**. To rework a done milestone, set it back to In progress.
- **Progress bar**: each milestone weighs its estimated days (milestones without an
  estimate weigh the average). Done counts fully; In progress counts the share of its
  tasks that are done, capped at 90%. The bar shows 100% only when every milestone is
  Done, so a project without any client can never reach 100%.

### Asking for approval

1. On a milestone, **ask the client to approve it**, with an optional note (what to check)
   and an optional preview link (`https://…`).
2. Every client on the project is emailed, and the milestone shows "Awaiting client
   approval". You can **withdraw** the request while it is pending.
3. Any one client answers:
   - **Approve**: the milestone becomes Done.
   - **Request changes** (a comment is required): the milestone goes back to In progress
     and a **Changes requested** card opens under it. You and the client can reply there;
     every reply emails the other side. The Milestones tab badge counts change threads
     where the client spoke last.
4. Ask for approval again when the changes are ready. That closes the old thread.

Every round is kept, so you can see who approved what, when, and how many rounds a
milestone took.

## Tasks

Tasks sit under a milestone or under "Other tasks".

- New tasks are shown to the client unless you untick it. Hidden ones show an
  **Internal** tag. Switching visibility also shows or hides the task's comments,
  attachments and activity entries.
- Statuses: To do, In progress, Done.
- **Comments**: on a task the client can see, your comment is emailed to the clients
  (batched: one email covers comments until they comment back or a day passes). On an
  internal task, comments are private notes. A task shows "waiting for reply" while its
  newest comment is a client's; replying answers it.

## Meetings and meeting notes

Meetings run on Google Meet. Either side can propose one.

| Situation | What you can do |
| --- | --- |
| You want a meeting | Propose it: topic, date and time (in the future), duration (15, 30, 45, 60, 90 or 120 minutes), agenda, related milestone, Meet link. Clients are emailed to accept or suggest another time. |
| A client proposed a time | **Accept** it, **propose another time** (the decision goes back to them), or **cancel**. |
| A meeting is confirmed | Add or change the **Google Meet link** (clients are emailed), reschedule, or cancel. |
| A meeting's details | The side that created it owns the topic, agenda, duration and milestone. On a client's meeting you only add the link. |

- Confirmation and cancellation emails carry a calendar file, and **Add to calendar**
  downloads one; both include reminders a day and an hour before.
- A reminder email goes to everyone on the project before each confirmed meeting (sent
  by a daily job at 06:00 UTC for meetings in the next 36 hours; meetings confirmed less
  than 6 hours earlier are skipped because their confirmation is fresh). Rescheduling
  re-arms the reminder. Archived projects get no reminders.

### After the meeting

Once a meeting has started you can write its **notes**: a summary (up to 10,000
characters) and up to 30 **action items**, each owned by you or the client.

1. Notes stay a private **draft** until you **publish** them.
2. Publishing marks the meeting **Held** and emails the clients.
3. Clients can confirm the notes ("Looks right"), comment (you're emailed), and tick off
   their own action items. You can tick off any item and reply under the notes (your
   replies send no email).
4. Editing published notes clears the client's confirmation, so they can check again.

If a meeting didn't happen, mark it **Did not take place** instead.

## Messages

One conversation per project with all its clients.

- Text up to 5000 characters and up to 5 attachments per message.
- The conversation updates live (about every 15 seconds). Opening it marks messages read;
  the Projects badge counts unread client messages.
- Clients are emailed once per unread batch: if they haven't read your previous message
  yet, a new one doesn't send another email, until a day has passed.
- If a message's email failed, the message shows it.

## Files

- **Upload** files for the project. Allowed: PDF, PNG, JPEG, GIF, WebP, ZIP, Word, Excel,
  PowerPoint, TXT and CSV, up to the size limit (25 MB per file by default; the
  `PORTAL_MAX_UPLOAD_MB` setting). Each file's content must match its extension.
- Each file is **shared** with clients or **hidden** (internal). Hiding a file also hides
  its activity entry. You can **delete** files.
- Files attached to messages and task comments appear here too.
- Images show as a gallery; everything else is listed as documents.

## Clients: invitations and access

- **Send invitation**: email, name and language. The client gets a link valid for 7 days.
  The screen also shows the link itself, so you can send it another way if the email
  fails. Inviting the same email again replaces their older pending invitation.
- **Resend** issues a new link (the old one stops working). **Revoke** stops a pending link.
- **Remove** takes a client off this project immediately. Their account and other
  projects are untouched.
- A project can have several clients. Each gets their own emails, in their own language,
  and never sees the others' addresses.
- You can't invite the admin email address as a client.

## Activity and the audit trail

The Activity tab shows everything that happened: what the client sees, plus internal
entries only you see (edits, deletions, visibility changes, removed members, revoked or
resent invitations, sign-outs, submitted reviews). Entries are colour-coded by area.

## Settings: editing and archiving

- Edit the name, summary, status, phase and estimated completion.
- **Archive project**: clients keep read-only access to its history and files; their
  messages, uploads, new meetings and comments are closed, and meeting reminders stop. **Restore project** reverses it. Archived projects
  still accept the end-of-project sign-off.

## View as client

**View as client** opens the project exactly as its first client sees it (internal tasks,
hidden files and their activity left out), read-only. Use it before asking for an
approval, or to check what a client is talking about.

## Completion sign-off and client reviews

1. Set the project's status to **Completed**. Each client is emailed (instead of the usual
   status email) and asked to confirm completion and review the project.
2. Each client answers **Is everything delivered as agreed?**
   - **Yes**: they go on to the review survey.
   - **Not yet**, with what is missing: you're emailed; the project stays Completed. When
     it is sorted, they can change their answer to yes.
3. The **review**: overall satisfaction and portal ease of use (1 to 5, required);
   likelihood to recommend (0 to 10), hard parts of the portal, ratings of the work and
   communication, and written answers (optional). It locks on submit, and you're emailed.
4. Results appear under **Client reviews** and on the project's Overview. They are
   private and never published.

Moving the project out of Completed closes the sign-off (answers are kept). Completing it
again opens a new round and asks everyone again. There are no automatic reminder emails.

## What clients are emailed

| Event | Recipients |
| --- | --- |
| Invitation / request accepted / proposal sent | The invited person |
| Your messages | Every client (batched) |
| Status change (Completed: the sign-off request instead) | Every client |
| Approval request, your reply in a change thread | Every client |
| Meeting proposed, rescheduled, confirmed, cancelled, or link added | Every client |
| Meeting reminder | Every client (you get one too) |
| Meeting notes published | Every client |
| Your comments on tasks they can see | Every client (batched) |
| Password reset | The client who asked |

Every email uses the recipient's portal language.
