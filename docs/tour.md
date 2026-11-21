# Site tour

**For:** reviewers, recruiters and prospective clients. No technical knowledge needed.

[michael-zakka.com](https://michael-zakka.com) is two things at once:

1. **A portfolio.** Michael Zakka is a frontend developer who specialises in websites that
   work equally well in English and Arabic. The site itself demonstrates that: every page
   exists in both languages, and the Arabic version is laid out right to left, not just
   translated.
2. **A way to work together.** Anyone can send a project brief. Michael replies with a
   priced proposal, and once it is accepted the client follows the whole project (progress,
   approvals, meetings, messages and files) in a private client portal.

## The public site

| Page | What is on it |
| --- | --- |
| **Home** | Introduction, About, "What I bring to a team", selected projects, work experience, skills, education and certifications, volunteering ("Giving Back"), and a contact section with a form. |
| **Project case studies** | One page per project: overview, the challenge and the solution, results, screenshots, role, team, technology stack, and links to the live site or code where they can be shared. |
| **Work with me** | A five-step project brief: overview (title, description, budget, timeline, contact details, preferred language), project type, business domain, brand, and colours and visual direction. |

- **Languages.** English lives at `michael-zakka.com`, Arabic at `michael-zakka.com/ar`.
  The switch in the menu keeps you on the same page. The brief form itself is in English
  on both versions, but it asks which language you want to be contacted in, and
  everything sent to you afterwards (proposal, emails, portal) uses that language.
- **A short intro.** The first visit in a browser tab plays a "console" intro of about
  three seconds.
  Any key, click or tap skips it, and it never plays for people who have asked their
  device to reduce motion.
- **Links open from clicks.** Case studies and other inner pages open when you follow a
  link (from the site, a search engine, LinkedIn or an email). Typing or bookmarking an
  inner page's address takes you to the home page of that language instead, by design.
- **Contact.** The home page ends with a contact form plus email and LinkedIn links, and
  its top section has a "download CV" button. The "Work with me" button in the menu opens
  the brief. A "Client login" link in the footer leads existing clients to the portal.

## How a project runs, start to finish

```text
 Brief ──▶ Reply ──▶ Proposal ──▶ Accepted ──▶ Project in the portal ──▶ Sign-off and review
                     (or a direct invitation for small jobs)
```

1. **Brief.** You fill in the Work with me form. It is saved straight away, so it is never
   lost even if an email fails, and Michael is notified.
2. **Reply.** Michael reads the brief and gets in touch, by email or WhatsApp.
3. **Proposal.** For priced work you receive a proposal by email: a private link to a page
   with the scope, the phases and timeline, what is and isn't included, what is needed from
   you, the price, payment terms, the number of revision rounds, and how long the offer is
   valid. On that page you can:
   - **Accept**: you type your full name, tick "I accept the scope, timeline and price",
     and choose a portal password. The project and your portal account are created at once,
     and you land in your new project. A record of exactly what you accepted is kept.
   - **Ask for changes**: describe what should change; a revised version follows by email.
   - **Decline**, optionally saying why.

   For small or repeat jobs, Michael can skip the proposal and send you an invitation to
   the portal instead.
4. **The project.** Everything about the project lives in the client portal (see below).
   Each phase from the proposal becomes a milestone.
5. **Sign-off and review.** When the work is finished, you confirm that everything was
   delivered (or say what is still missing), then answer a short, private review.

## The client portal

The portal is invite-only: there is no public sign-up. An account only ever comes from a
proposal you accepted or an invitation Michael sent.

| In the portal you can… | How it works |
| --- | --- |
| Follow progress | A progress bar, the current phase, the estimated completion date, and every milestone with its due date. |
| Approve work | When a milestone is ready, you get an email and an "Approve" or "Request changes" choice. A milestone only counts as done once a client approves it. |
| See and discuss tasks | The tasks shared with you, with a comment thread on each. |
| Book meetings | Either side proposes a time; the other accepts or suggests another. Times show in your own time zone, meetings come with a Google Meet link and an "Add to calendar" file, and you get a reminder the day before. |
| Read meeting notes | After a meeting you receive a summary and action items. You can confirm the notes, comment, and tick off the items that are yours. |
| Message | One conversation per project, with attachments. New messages appear without reloading, and you're emailed when something arrives (one email per batch of unread messages, not one per message). |
| Share files | Upload and download documents and images; images show as a gallery. |
| See the history | An activity timeline of everything that happened on the project. |

The portal, its emails and the proposal pages all work in English and Arabic. Your
language choice also decides the language of every email you receive.

## Privacy and security, in plain words

- **Private by default.** Portal pages are never shown to search engines, and every page
  and file checks that you belong to that project before showing anything. Files are
  stored privately and are only downloadable by project members.
- **Passwords** are stored only as one-way hashes. Invitation, password-reset and proposal
  links are single-purpose, expire, and are stored only in a form that cannot be turned
  back into a working link.
- **No tracking in the portal.** The public site counts page visits without cookies and
  without identifying anyone (a random number that lasts until you close the tab). The
  portal records no visits at all.
- **Reviews stay private.** End-of-project reviews are only shown to Michael and are never
  published on the site.

## What the site does not do

- No online payments: proposals state the price and payment terms, and payment is arranged
  directly.
- No public sign-up for the portal.
- The blog exists in the code but has no published posts yet, so it is not linked from
  the site.

## How it is built

Next.js 16 and React 19 with TypeScript, styled with plain CSS Modules (no UI framework),
translated with next-intl, data in PostgreSQL (Supabase) through Prisma, email through
Resend, hosted on Vercel (with Vercel Blob for files and Vercel Cron for reminders). The
code is open source under the AGPL-3.0 licence; the [developer guide](developer/README.md)
explains how it fits together.
