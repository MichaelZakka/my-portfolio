# Editing the site's content

**For:** the site operator. How to change what the public portfolio says, in English and
Arabic, without touching code. Everything here is under **Content** in the admin
dashboard.

## What you can edit

| Editor | What it controls | Limits |
| --- | --- | --- |
| **Profile & contact** | Your name, job title, location and languages (both languages); public email; phone number with separate switches to show it as a phone link and as a WhatsApp link (both off by default, so the number stays private); CV link; "view source" repository link; city and two-letter country code for search engines. | |
| **Social links** | Links to LinkedIn, GitHub, X, Instagram, Behance, WhatsApp, Telegram, email, a website and more, each with optional display text, and where it appears: **Hero**, **About card**, **Contact section**, **Footer**. | Up to 20 links |
| **Portfolio projects** | The projects on the home page and their case-study pages: web address (slug), published or hidden, "personal project" badge, title, summary, overview, role, team, challenges, solutions, results, technology stack, live and code links, "client code private", screenshots, employer and collaborators. | Up to 40 projects |
| **Experience** | Work history: company, note, website, job title, dates, location, achievements and their results. | Up to 20 roles, 15 achievements each |
| **Strengths** | The "What I bring to a team" cards: icon, title and proof line. | Up to 12 |
| **Skills** | Skill groups and their skills, plus the short "top stack" list shown in the terminal card at the top of the home page. | 12 groups, 30 skills each, 10 top-stack items |
| **Section text** | Every other piece of text on the public site, section by section: hero, about, strengths, projects and case studies, experience, skills, education and certificates, volunteering, contact and the contact form, footer, menu and intro screen, search and sharing (page title and description), the Work with me page headings, blog labels, and the 404 page. | |

Every translatable field has an English and an Arabic box. **Leave the Arabic box empty to
show the English text** on the Arabic site.

## Saving

Each editor has a bar at the bottom:

- **Save changes** publishes the edits. The site picks them up on the next page load
  ("Saved. The public site shows it on the next page load."). Every public page in both
  languages is refreshed, plus the sitemap.
- **Discard** drops unsaved edits. Leaving the page with unsaved edits asks first.
- **Reset to original** goes back to the content that ships with the code.
- **View on site** opens the matching public page in a new tab.

After saving, open the page in **both languages** to check it.

### "Original" versus "saved" content

Until you save an editor for the first time, the site shows the content written in the
code. Saving takes over **that editor only**: from then on, edits made by a developer in
the code files no longer show up for that part, until you use **Reset to original**. For
section text, only the texts you actually changed are stored; every other text keeps
following the code.

## Rules the editors enforce

- **Placeholders**: some texts contain `{name}`-style placeholders (for example
  `{title}` or `{year}`); the site fills them in. Keep them exactly as written. Curly
  braces are only allowed for placeholders, and HTML tags like `<b>` aren't supported.
- **Links** must be complete: `https://…` for web links; social links may also be
  `mailto:` or `tel:`; the CV link may be a path on the site such as `/michael-zakka-cv.pdf`.
- **Web addresses of projects** (slugs) use lowercase letters, numbers and dashes, and must
  be unique. Changing a slug changes the case study's address, which breaks links already
  shared.
- Each part has length limits; the editor tells you which field is too long.

## Projects: publishing and screenshots

- A project is listed on the home page, and gets a case-study page, only while it is
  **published**. Unpublished projects stay in the editor as drafts.
- **Screenshots** are chosen from the image sets bundled with the site (one set per
  original project). New screenshots can't be uploaded from the dashboard yet: a developer
  adds them to `app/assets/` and `data/projects.ts`. A new project without a set has no
  cover image.

## "TODO" placeholders

Any project or experience text that starts with `TODO` is treated as unfinished: it is
highlighted in development and **hidden on the live site**. Use it to park content you
haven't written yet.

## What the Content editor can't change

These need a developer (see the [developer guide](../developer/README.md)):

- uploading new project screenshots or images,
- the CV file itself (`public/michael-zakka-cv.pdf`; the link to it is editable),
- blog posts (MDX files in `content/blog/`),
- the Work with me brief form (it is English-only, in code),
- the "Michael Zakka" logo text in the menu and footer, and the lines printed by the intro
  screen,
- the client portal's text and all emails (in `messages/en.json` and `messages/ar.json`
  under `portal` and `portalEmail`).

## If something goes wrong

- **The save was refused**: the message names the field and the problem (often a removed
  placeholder or an incomplete link).
- **A notice says content can't be saved yet**: the database table for content is
  missing; a developer needs to run the database migrations (`npm run db:deploy`).
- **The change doesn't show**: reload the public page once; the first visit after a save
  rebuilds it. If it still doesn't show, check that the part was saved (the bar says "All
  changes saved").
