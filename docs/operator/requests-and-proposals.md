# Requests and proposals

**For:** the site operator. How a project brief becomes a signed proposal and a client
project. Screens are in the admin dashboard (`/admin-jfaygpory6`).

```text
Work with me brief ─▶ Request (New) ─▶ Contacted ─▶ Qualified
                                                     │
              ┌──────────────────────────────────────┼─────────────────────────────┐
              ▼                                      ▼                             ▼
   A. Proposal (priced scope)          B. Accept without a proposal      C. Customize, then convert
      sent ─▶ accepted ─▶ project         project + invitation email        New project form
           ├▶ changes ─▶ revise v2
           └▶ declined ─▶ request Lost
```

## Where requests come from

A request is a brief sent from the **Work with me** page (English at `/work-with-me`,
Arabic at `/ar/work-with-me`; the form itself is English on both). It has five steps:

1. **Overview**: project title and description, budget range, timeline, the client's name,
   email, company and phone, and the language they want to be contacted in.
2. **Type**: web project, landing page, Shopify store, mobile application, or other.
3. **Domain**: e-commerce, SaaS, education, healthcare, and so on, or other.
4. **Brand**: whether they have a brand (name, tagline, personality, references, logo link).
5. **Visuals**: primary, secondary and accent colours, light or dark mood, and whether to
   match their colours or take recommendations.

The brief is **saved first, then emailed to you** (Reply-To is the client), so a request
is never lost because an email failed; the request page shows whether the email went out.
The client gets no confirmation email. Contact-form messages are separate: they go to
**Messages**, not Requests.

## The Requests screen

A table of every brief, newest first, with filters for status, project type and date
range, and a search box. The **Requests** badge counts requests still marked New.

| Status | Meaning | Set by |
| --- | --- | --- |
| **New** | Just arrived. | Automatically |
| **Contacted** | You replied. | You |
| **Qualified** | Worth a proposal. | You |
| **Proposal sent** | A proposal is out. | Automatically when you send one (or you) |
| **Won** | Became a project. | Automatically when a project is created from it (or you) |
| **Lost** | Didn't go ahead. | Automatically when the client declines a proposal (or you) |
| **Archived** | Put away. | You |

You can move a request to any status at any time; each change is kept in its status
history. Requests can't be deleted.

## A request's page

- Every field of the brief, including the colour swatches.
- **Status** and **Admin notes** (private, never shown to the client), with **Save changes**.
- Quick actions: **Email** the client, **Open WhatsApp with summary** (when they gave a
  phone number), and copy their email address.
- **Proposal** card and **Accept / convert** card, described below.
- Once converted, a link to the project. A request becomes at most one project.

## A. Send a proposal

Use this for priced work: the client sees exactly what they agree to, and accepting
creates everything at once.

### 1. Create the draft

On the request page choose **Create proposal from this brief**. Version 1 is pre-filled:
title and summary from the brief, and starting phases that suit the brief's first project
type (for a web project: Discovery, Design, Development, Content and testing, Launch), in
the client's language. Everything is editable.

### 2. Edit it

| Field | Notes |
| --- | --- |
| Language | English or Arabic: the language of the proposal page and its emails. Defaults to the language the client chose in the brief. |
| Title, summary | What the client reads first. |
| Phases | Up to 12, each with a title, description and duration in days. Each phase becomes a milestone, and its duration becomes the milestone's weight in the progress bar. Reorder with the arrows. |
| Included / Not included / What I'll need from you | Lists of up to 20 items each. |
| Currency, total | USD, EUR, GBP, AED, SAR, QAR, KWD or SYP, in whole units. |
| Payment terms | Free text. The default is "50% upfront to start the work, 50% before launch." |
| Revision rounds | 0 to 10 (default 2). |
| Start date | Optional. Empty means "when you accept"; the timeline is calculated from it. |
| Valid for | 1 to 90 days (default 14), counted from when it is sent. |

**Preview** shows the page exactly as the client will see it.

### 3. Send it

**Send** (it needs at least one phase and a total above zero) locks the version, emails the
client a private link, and moves the request to **Proposal sent**. Right after sending you
also see the link itself, so you can share it another way if the email fails. The link
is shown only then: copy it if you need it.

While it is out:

- **Resend link** issues a fresh link and restarts the validity period. The old link stops
  working. Use it when the client lost the email or the proposal expired.
- **Revise as version N** copies the latest version into a new draft. Sending the new
  version marks older open versions **Replaced**, and their links stop working.

### 4. The client answers

You get an email for each answer, and it appears under Notifications.

| Answer | What happens |
| --- | --- |
| **Accept** | The client types their full name, ticks the acceptance box and sets a portal password (or enters their existing one). In one step: the project is created with one milestone per phase, the client's account is created and added to it, and the request becomes **Won**. The proposal keeps an acceptance record: who signed, when, from which IP address and browser, and a fingerprint (SHA-256) of exactly what was accepted. |
| **Ask for changes** | Their note is saved and you're emailed. Revise as a new version and send it. |
| **Decline** | Their optional reason is saved, and the request becomes **Lost**. |

A sent proposal past its validity date shows as **Expired**. The client can no longer
accept it, but can still ask for changes or decline; **Resend link** reopens it.

## B. Accept without a proposal

For small or repeat jobs. Pick the **Email language** and choose **Accept without a
proposal**. The project is created from the brief, the request becomes **Won**, and the
client gets a "request accepted" email with an invitation link (valid 7 days). Right
after, the screen shows the invitation link too, in case the email fails.

## C. Customize, then convert

**Customize, then convert** opens the **New project** form pre-filled from the brief:
name, summary, status, current phase, estimated completion, and an optional first
invitation (email, name, language). Saving creates the project and marks the request Won.

You can also create a project with no request at all from **Projects → New project**.

## Tips

- Set the request to **Contacted** when you first reply; it keeps the New badge honest.
- Use **Admin notes** for call notes and prices discussed; the client never sees them.
- Proposal defaults (starting phases per project type, payment terms, currency, validity)
  live in the code (`app/lib/portal/proposalDefaults.ts` and
  `app/lib/portal/constants.ts`); change them there if your usual terms differ.

Next: [Running a project](running-projects.md).
