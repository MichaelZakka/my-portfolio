# Operator guide

**For:** the person running the site day to day: answering requests, sending proposals,
running client projects and keeping the content current. No code needed, except where a
step says so.

Everything happens in the **admin dashboard**. It is English-only, built for one admin
account, and works on a phone (below 900 px wide the sidebar becomes a menu button).

- [Signing in](#signing-in)
- [The screens](#the-screens)
- [A daily routine](#a-daily-routine)
- [Notifications](#notifications)
- [Messages (contact form)](#messages-contact-form)
- [Users](#users)
- [Client reviews](#client-reviews)
- [Analytics](#analytics)
- [Site: health checks and problems](#site-health-checks-and-problems)
- [Alerts](#alerts)
- [Emails you receive](#emails-you-receive)

Next: [Requests and proposals](requests-and-proposals.md) ·
[Running a project](running-projects.md) · [Editing the site's content](content.md) ·
[Troubleshooting](troubleshooting.md)

## Signing in

- Sign in at **`/admin-jfaygpory6/login`** on the live site, with the admin email and
  password. Bookmark it: the address is deliberately not linked from the site, not listed
  in `robots.txt`, and hidden from search engines. It is not a secret, though (the
  repository is public); the password is what protects the dashboard.
- A session lasts 7 days on that browser. **Log out** is at the bottom of the sidebar.
- After 10 failed attempts within 5 minutes from one network, sign-in pauses briefly.
- There is exactly one admin account, defined by server settings, not in the database:
  - **Change the admin password:** run `npm run hash-password -- "new password"` on a
    computer with the code, put the printed value into `ADMIN_PASSWORD_HASH` in Vercel
    (Project → Settings → Environment Variables), then redeploy.
  - **Sign out every session (admin and every client) at once:** change `AUTH_SECRET` in
    Vercel and redeploy. Use it if you suspect a session was stolen. Logging out only
    clears the cookie in that browser; it doesn't end copies of the session elsewhere.

## The screens

| Screen | What it is for | Sidebar badge |
| --- | --- | --- |
| **Overview** | Last 30 days at a glance: visitors (today, 7 and 30 days), total and new requests, conversion rate (briefs submitted ÷ views of the Work with me page), traffic chart, latest requests, CTA clicks, top pages and referrers. | |
| **Notifications** | A feed of everything that happened without you: new requests, client actions, proposal answers, new problems. | New items since you last opened it |
| **Requests** | Every project brief from the Work with me page, as a sales pipeline. See [Requests and proposals](requests-and-proposals.md). | Requests with status New |
| **Messages** | Messages from the home page's contact form. | |
| **Projects** | Client projects in the portal (Active, Archived or All). See [Running a project](running-projects.md). | Unread client messages + client updates |
| **Users** | Every portal account, its status, projects and last sign-in. | |
| **Client reviews** | End-of-project sign-offs and private reviews. | |
| **Analytics** | Detailed visitor analytics. | |
| **Content** | Edit the public portfolio in English and Arabic. See [Editing the site's content](content.md). | |
| **Site** | Health checks and the problem log. | Open problems |

Badges refresh every minute, and whenever you move between screens. On a phone, a yellow
dot on the menu button means a badge needs attention.

## A daily routine

1. Glance at the badges. **Requests** first: a new brief is a potential client waiting.
2. Open **Notifications** to catch up on client activity (approvals, meeting answers,
   comments, files). Opening it marks everything as seen.
3. Answer unread project messages (the **Projects** badge; each project row shows its
   unread count).
4. Check **Site** if its badge shows open problems, or if an alert arrived.
5. Weekly: look at **Users** for invitations that expired, and **Analytics** for traffic.

## Notifications

The feed lists, newest first and grouped by day:

- new requests (briefs),
- anything a client did on a project (messages, approvals and change requests, meetings,
  meeting-note comments and confirmations, task comments, uploads, joining a project,
  completion answers, reviews),
- proposal answers (declined, or changes requested), and
- problems that appeared or came back.

"New" means newer than the last time you opened the screen. Before it was ever opened,
only the last 7 days count as new.

## Messages (contact form)

Messages sent from the contact section of the home page. Each message is saved first and
then emailed to you, so it shows up here even if the email failed. You can mark a message
read or unread, or delete it. To answer, reply to the notification email: its Reply-To is
the sender's address.

## Users

Every portal account, with filters for status, language and inactivity, and a search box.

| Status | Meaning |
| --- | --- |
| **Active** | Has set a password (accepted an invitation or a proposal). |
| **Invited** | Has a live invitation link and hasn't used it yet. |
| **Invite expired** | Only expired invitations remain. Send a new one. |
| **No open invite** | No usable invitation (revoked, or removed from every project). |
| **Admin** | Your own author account (used for messages and files you send; it can't sign in to the portal). |

**Inactive** filters active accounts with no sign-in for 30 days or more.

On a user's page you can **send a new invitation link** and **Sign out everywhere**
(ends every session; their password still works, so they can sign straight back in). The
dashboard cannot delete accounts or change a client's email address.

## Client reviews

The private answers from end-of-project sign-offs (see
[Running a project](running-projects.md#completion-sign-off-and-client-reviews)):
number of reviews, average satisfaction, Net Promoter Score (from "how likely are you to
recommend…", 0 to 10), average portal ease of use, rating breakdowns, the parts of the
portal clients found hard, every review in full, and a **Waiting on clients** list of
completed projects whose clients haven't answered yet. Reviews are never shown publicly.

## Analytics

The site's own visitor statistics: page views (today, 7 and 30 days), unique visitors
over 30 days, page views over time, top pages, devices, referrers, UTM sources, and the
funnel from the home page to Work with me to a submitted brief.

What is recorded: the page, the referring site, UTM tags from campaign links, a coarse
device type, the visitor's country (from Vercel), clicks on calls to action, and brief
progress. A visitor is identified only by a random number that lasts until the browser
tab closes. No cookies are used. The admin dashboard and the client portal are never
recorded. Vercel Analytics and Speed Insights also run on the public pages; see the
Vercel dashboard for those.

## Site: health checks and problems

**Health checks** show whether the database, email (Resend), admin sign-in settings, the
site URL, visitor analytics and problem alerts are working, plus a reminder to set up an
uptime monitor. A red check names what is missing.

**Problems** lists what went wrong recently and hasn't been resolved: failed emails,
failed uploads or downloads, crashed pages (in the server or in a visitor's browser),
database outages, and failed brief saves. The same problem happening again is one row
with a count, first and last time seen. **Mark resolved** closes one row (or all of
them); if it happens again, it reopens and alerts you again.

**Uptime monitor.** A site that is down can't warn you itself. Point a free monitor
(UptimeRobot, Better Stack…) at `https://michael-zakka.com/api/health` every 5 minutes. It
answers 200 when the site and database work and 503 when the database is unreachable.

## Alerts

When a problem first appears you get an email ("Site problem: …") and, if a webhook is
configured, a Slack or Discord message. While the problem stays unresolved, you're alerted
again at most once an hour, and never more than 10 alerts an hour in total.

Alerts go to `ALERT_EMAIL`, or else `PORTAL_NOTIFY_EMAIL`, or else the main inbox. Because
an email outage can't be reported by email, set `ALERT_WEBHOOK_URL` too.

> **Known issue:** the "Details" link in alert emails points to the old `/admin/site`
> address, which no longer exists. Open **Site** in the dashboard instead. See
> [Known issues](../developer/known-issues.md#open-bugs).

## Emails you receive

| Email | Sent when |
| --- | --- |
| Project brief | Someone submits the Work with me form (Reply-To: the client). |
| Contact form message | Someone uses the home page contact form (Reply-To: the sender). |
| Proposal answered | A client accepts, asks for changes or declines a proposal. |
| Client joined | A client accepts an invitation. |
| New messages | A client writes in a project (one email per unread batch, again after 24 hours). |
| Milestone answered / change-request reply | A client approves, asks for changes, or replies in a change thread. |
| Meeting updates | A client proposes, accepts, reschedules or cancels a meeting. |
| Meeting reminder | A confirmed meeting is coming up (the same daily job that reminds clients). |
| Meeting-note comment | A client comments on published notes. |
| Task comments | A client comments on a task (batched). |
| Completion "not yet" / review submitted | A client says something is missing, or submits the end-of-project review. |
| Site problem | Monitoring found a problem (see [Alerts](#alerts)). |

Client emails about projects go to `PORTAL_NOTIFY_EMAIL` (or the main inbox if unset);
contact-form messages go to `CONTACT_TO_EMAIL` (or the main inbox).
