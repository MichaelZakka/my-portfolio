# Role: Visitor (guest)

[← Index](README.md) · Test data IDs (S-…, E-…) are defined in the [catalogue](README.md#test-data-catalogue-referenced-by-id-in-the-tables).

## Stage 1: Discovery and first load

### Feature: Search, link previews and metadata

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-DISC-01 | Home page title and meta description (EN) | None | 1. Open `/`.<br>2. View page source / devtools Elements `<head>`. | — | `<title>` and `meta description` are present, English, and describe "Frontend Developer · Next.js · Arabic/RTL". No "TODO" or placeholder text. | P1 | Happy |
| V-DISC-02 | Home page title and meta description (AR) | None | 1. Open `/ar`.<br>2. Inspect `<head>`. | — | Arabic title and description. `html[lang=ar]` and `dir=rtl` after load. | P1 | Happy |
| V-DISC-03 | hreflang alternates and canonical | None | 1. Open `/`, `/ar`, `/projects/<slug>`, `/ar/projects/<slug>`.<br>2. Inspect `link rel=alternate hreflang` and `rel=canonical`. | any published slug | Each page lists `en`, `ar` (and `x-default` if used) alternates pointing at the right locale URLs. Canonical is the page itself, absolute, on `NEXT_PUBLIC_SITE_URL`, not a `*.vercel.app` preview host. | P2 | Happy |
| V-DISC-04 | Open Graph preview when the link is shared | Deployed URL | 1. Paste `/` into LinkedIn Post Inspector, the Facebook Sharing Debugger and a WhatsApp chat.<br>2. Repeat for `/ar` and a case study. | — | Title, description and image render. The image loads (absolute URL, correct size). Arabic page shows the Arabic text. `og:image:alt` set. | P2 | Integration |
| V-DISC-05 | JSON-LD structured data is valid | None | 1. Run `/`, `/work-with-me` and a case study through Google Rich Results Test / validator.schema.org. | — | No errors. Person / WebSite / Service data matches the visible page (name, job title, links). | P3 | Integration |
| V-DISC-06 | sitemap.xml lists every public page once per locale | None | 1. Open `/sitemap.xml`. | — | Contains home, work-with-me, every published project, blog index and posts only when a post is published, each in EN and AR with alternates. No `/admin`, `/portal`, `/api`, draft posts or unpublished projects. All URLs use the production host. | P2 | Happy |
| V-DISC-07 | robots.txt blocks private areas | None | 1. Open `/robots.txt`. | — | `Disallow: /api/` and `/admin/`. Sitemap URL absolute. Portal pages are protected by the `X-Robots-Tag: noindex` header instead (see S-SEC-03). | P2 | Security |
| V-DISC-08 | Favicon and tab title on every public page | None | 1. Visit home, a case study, the blog, work-with-me and a 404 in EN and AR. | — | Favicon shows. Tab title is page-specific (not the same generic title everywhere). | P3 | UI |

### Feature: Locale routing

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-LOC-01 | `/` serves English | Clear cookies | 1. Open `/`. | — | English content, `html[lang=en][dir=ltr]`. No redirect loop. | P0 | Happy |
| V-LOC-02 | `/ar` serves Arabic RTL | Clear cookies | 1. Open `/ar`. | — | Arabic content, `lang=ar`, `dir=rtl`, Arabic font (IBM Plex Sans Arabic). Layout mirrored. | P0 | Happy |
| V-LOC-03 | Browser language does not auto-redirect | Browser language Arabic first | 1. Set Accept-Language `ar`.<br>2. Open `/`. | — | Stays on English `/` (`localeDetection: false`). Arabic is one click away. | P2 | Edge |
| V-LOC-04 | `/en` prefix is normalised | None | 1. Open `/en` and `/en/projects/<slug>`. | — | Redirects to `/` and `/projects/<slug>` (as-needed prefix), or serves the same content with the canonical without `/en`. No duplicate indexable URL. | P2 | Edge |
| V-LOC-05 | Unsupported locale prefix | None | 1. Open `/fr`, `/de/projects/<slug>`, `/AR`. | — | Localised 404 page (not a 500, not a blank page). `/AR` handled consistently (404 or redirect to `/ar`). | P2 | Negative |
| V-LOC-06 | No hydration flash of the wrong direction | Throttle CPU 4x, network Slow 3G | 1. Hard-reload `/ar`.<br>2. Watch the first paint. | — | Text and layout render RTL from the first paint, or the flip is not noticeable. Note: `lang`/`dir` are set by a client component after hydration, so record any visible LTR → RTL jump. | P2 | UI |
| V-LOC-07 | Query string and hash survive the locale redirect | None | 1. Open `/?utm_source=linkedin#projects`. | S-… none | UTM params kept (analytics records them), page scrolls to Projects. | P3 | Edge |

## Stage 2: Browsing the home page

### Feature: Navigation and header

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-NAV-01 | Each nav link scrolls to its section | Desktop 1440 px | 1. Click Home, About, Projects, Experience, Contact. | — | Smooth scroll to each section. The sticky header does not cover the section heading. URL hash updates (if designed). | P1 | Happy |
| V-NAV-02 | Nav links from a sub-page go back to the home section | On a case study | 1. Click "Projects" in the nav. | — | Navigates to `/#projects` (or `/ar#projects` on Arabic) and scrolls there. | P1 | Happy |
| V-NAV-03 | Work-with-me nav button | None | 1. Click "Work with me". | — | Opens `/work-with-me` in the current locale. `cta_click` analytics event fired with label `work-with-me`. | P1 | Happy |
| V-NAV-04 | Mobile menu opens and closes | 375 px | 1. Tap the menu button.<br>2. Tap a link.<br>3. Reopen and tap the close button.<br>4. Reopen and press Esc. | — | Menu opens with an accessible label ("Open menu" / "Close menu"). Closes after a link tap, on close, and on Esc. Background scroll is locked while open. Focus returns to the menu button on close. | P1 | UI |
| V-NAV-05 | Mobile menu in RTL | 375 px, `/ar` | 1. Open the menu. | — | Panel slides from the correct side for RTL. Icons that indicate direction are mirrored (`.flip-rtl`). Labels Arabic. | P2 | UI |
| V-NAV-06 | Rotate the device with the menu open | iPhone / Android | 1. Open the menu in portrait.<br>2. Rotate to landscape and back. | — | Menu stays usable or closes cleanly. No stuck overlay, no horizontal scroll. | P3 | Edge |
| V-NAV-07 | Resume nav link | None | 1. Click "Resume" in the nav. | — | Downloads or opens the CV PDF (see V-LINK-01). | P1 | Happy |
| V-NAV-08 | Skip-to-content link | Keyboard only | 1. Load `/`.<br>2. Press Tab once.<br>3. Press Enter. | — | The first Tab shows a visible "Skip to content" link. Enter moves focus to `#main`. Works in AR too, with the translated `common.skipToContent` label. | P1 | Accessibility |

### Feature: Home sections content

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-HOME-01 | Hero renders name, role, availability and CTAs | None | 1. Open `/`. | — | Name, intro, "open to remote / onsite" chips, View projects, Download resume, GitHub and LinkedIn buttons. Stack label visible. | P0 | Happy |
| V-HOME-02 | Hero "View projects" CTA | None | 1. Click "View projects". | — | Scrolls to the Projects grid. `cta_click` recorded. | P2 | Happy |
| V-HOME-03 | About section facts | None | 1. Scroll to About. | — | Location, email (`mailto:` link), LinkedIn, languages. Email and phone stay LTR inside Arabic text. | P1 | Happy |
| V-HOME-04 | Projects grid lists every published project | Compare with `data/projects.ts` | 1. Scroll to Projects. | — | Every published project appears once with cover, role, stack and links. No unpublished projects. Personal projects marked "Personal". Projects without a public link show "Private" instead of a dead link. | P1 | Happy |
| V-HOME-05 | Projects grid "Live" and "Code" links | None | 1. Click each Live and Code link. | — | Opens in a new tab with `rel="noopener noreferrer"`. Screen-reader text says it opens in a new tab. No 404s. | P1 | Happy |
| V-HOME-06 | Experience timeline is in order | None | 1. Scroll to Experience. | — | Newest first (Toward Greatness Oct 2025–Present, B-wire Apr–Dec 2024, freelance). Dates localised in AR. | P2 | Happy |
| V-HOME-07 | Skills, Education, Volunteering, Strengths render | None | 1. Scroll through each section. | — | All sections have content in both locales. Education certificate bands show correctly. No missing translation keys (no raw `education.certTitle` text). | P1 | Happy |
| V-HOME-08 | Testimonials hidden while the list is empty | `TESTIMONIALS` is `[]` | 1. Scroll the whole page. | — | No empty Testimonials heading or placeholder. | P2 | Edge |
| V-HOME-09 | Stats / numbers are not placeholders | None | 1. Check the Stats section. | — | Numbers are real values, not `0` or `TODO`. Arabic version uses the intended digit style consistently (Western or Arabic-Indic, not mixed). | P2 | UI |
| V-HOME-10 | Off-screen sections render when scrolled into view | Long page, fast scroll | 1. Press End, then scroll up slowly.<br>2. Use the nav to jump to Contact. | — | No blank sections (`content-visibility: auto` on `section`). Scroll position lands on the heading, not offset by the 700 px intrinsic size. | P2 | Edge |
| V-HOME-11 | Reveal animations respect reduced motion | OS "Reduce motion" on | 1. Load `/` and scroll. | — | Content appears without motion (or with a fade only). Nothing stays hidden. | P2 | Accessibility |
| V-HOME-12 | Page works with JavaScript disabled | JS disabled | 1. Load `/` and `/ar`.<br>2. Scroll all sections. | — | All content is visible (server-rendered; not hidden behind Reveal). Links work. The contact form still submits (server action, V-CON-20). | P2 | Edge |
| V-HOME-13 | Circuit background does not hurt readability | None | 1. Check text over the decorative background on desktop and mobile. | — | Text contrast ≥ 4.5:1 everywhere. Background is `aria-hidden` and does not capture clicks. | P3 | UI |

## Stage 3: Case studies

### Feature: `/projects/[slug]`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-PROJ-01 | Open a case study from the grid | None | 1. Click "Case study" on a project card. | — | `/projects/<slug>` loads: breadcrumb, cover, overview, challenge, solution, results, screenshots, facts (role, team, built at, stack). | P1 | Happy |
| V-PROJ-02 | Same case study in Arabic | None | 1. Open `/ar/projects/<slug>`. | — | Arabic content (not English fallback unless intended). RTL breadcrumb separators and prev/next arrows mirrored. | P1 | Happy |
| V-PROJ-03 | Previous / next navigation wraps correctly | None | 1. Open the first project and click Previous.<br>2. Open the last and click Next. | — | Either wraps around or the button is hidden on the ends. Never a 404. | P2 | Edge |
| V-PROJ-04 | Unknown slug | None | 1. Open `/projects/does-not-exist` and `/ar/projects/does-not-exist`. | — | Localised 404 page with a "back" link. HTTP status 404 (check the network tab). | P1 | Negative |
| V-PROJ-05 | Slug with special characters | None | 1. Open `/projects/%3Cscript%3E`, `/projects/..%2F..%2Fadmin`, `/projects/<slug>%00`. | S-XSS1 | 404, no script runs, no path traversal, no 500. | P1 | Security |
| V-PROJ-06 | Unpublished project is not reachable | A project with `published: false` | 1. Open its slug directly. | — | 404, not rendered. | P1 | Negative |
| V-PROJ-07 | "Digital Decisions Platform" placeholder content | Project exists with TODO fields | 1. Open it in EN and AR. | — | Either hidden, or no visible "TODO" text. Release blocker if TODO text shows. | P1 | UI |
| V-PROJ-08 | Screenshots: lazy loading, alt text, sizes | None | 1. Open a case study with screenshots on mobile and desktop.<br>2. Check the network tab. | — | Images load as AVIF/WebP at a fitting width. Each has meaningful alt text in the page's language. No layout shift as they load. | P2 | UI |
| V-PROJ-09 | "More projects" section | None | 1. Scroll to the end of a case study. | — | Other projects are listed, not the current one. "All projects" link goes to `/#projects`. | P3 | Happy |

## Stage 4: Blog

### Feature: `/blog` and `/blog/[slug]`

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-BLOG-01 | Blog index lists published posts newest first | Production build | 1. Open `/blog`. | — | Published posts only, sorted by date descending, with title, date and summary. | P2 | Happy |
| V-BLOG-02 | Draft posts are hidden in production | A post with `draft: true` | 1. Production build: open `/blog` and the draft's slug.<br>2. `next dev`: repeat. | — | Production: absent from the index, the sitemap and the slug URL (404). Dev: visible with a "Draft" label. | P1 | Negative |
| V-BLOG-03 | Empty blog state | All posts are drafts (production) | 1. Open `/blog`. | — | Friendly empty message (`blog.empty`). Page is `noindex`. | P3 | Edge |
| V-BLOG-04 | Post renders MDX correctly | None | 1. Open each post. | — | Headings, code blocks, links and images render. Code blocks scroll horizontally on 320 px without breaking the page. | P2 | Happy |
| V-BLOG-05 | Arabic blog pages | None | 1. Open `/ar/blog` and `/ar/blog/<slug>`. | — | Chrome (nav, labels, date) is Arabic and RTL. Dates use `ar-SY` format. English post bodies are marked `lang="en" dir="ltr"` so they read correctly. | P2 | UI |
| V-BLOG-06 | Unknown post slug | None | 1. Open `/blog/nope`. | — | Localised 404. | P2 | Negative |
| V-BLOG-07 | External links in posts | None | 1. Click every external link in each post. | — | No dead links. External links open safely. | P3 | Happy |

## Stage 5: Language switch

### Feature: LanguageSwitcher (public site)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-LANG-01 | Switch EN → AR on the home page | `/` | 1. Click the language switcher. | — | Goes to `/ar`. Content, direction and font switch. Scroll position resets to the top (or keeps the section; either is consistent). | P0 | Happy |
| V-LANG-02 | Switch keeps the current page | `/projects/<slug>` | 1. Switch language. | — | Lands on `/ar/projects/<slug>`, not the Arabic home. | P1 | Happy |
| V-LANG-03 | Switch on work-with-me keeps typed survey data? | `/work-with-me` at step 3 with data | 1. Switch language. | — | Document what happens: the survey is English-only and its state is in memory, so a navigation loses the typed data. ⚠ Gap: no warning before losing it. | P2 | Edge |
| V-LANG-04 | Switch on a 404 page | `/does-not-exist` | 1. Switch language. | — | Goes to `/ar/does-not-exist` (Arabic 404) or `/ar`. No crash. | P3 | Edge |
| V-LANG-05 | Back button after switching | Switched EN → AR | 1. Press browser Back. | — | Returns to the English page and the English direction is restored (no Arabic text in an LTR layout). | P2 | Edge |
| V-LANG-06 | Switcher accessible name | Screen reader | 1. Focus the switcher. | — | Announced as "Switch language" (translated) with the target language, has `lang` on the target-language label. | P2 | Accessibility |

## Stage 6: CV and outbound links

### Feature: Resume download and contact links

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-LINK-01 | Download resume from hero, about and nav | None | 1. Click each "Download resume". | — | Downloads `/michael-zakka-cv.pdf` (the real CV, not the old placeholder). File opens. `cta_click` recorded. | P0 | Happy |
| V-LINK-02 | Resume link on iOS Safari | iPhone | 1. Tap "Download resume". | — | PDF opens in the viewer or downloads to Files. Not a blank page. | P1 | Integration |
| V-LINK-03 | CV file is reachable directly | None | 1. Open `/michael-zakka-cv.pdf`. | — | 200, `application/pdf`. | P1 | Happy |
| V-LINK-04 | mailto links | Mail client configured | 1. Click each email link (about, contact, footer). | — | Opens the mail client to `michealzakka@gmail.com`. | P2 | Happy |
| V-LINK-05 | Phone / WhatsApp links on mobile | Android + iPhone | 1. Tap the phone and WhatsApp links (if shown). | — | `tel:` opens the dialer with +963…; WhatsApp opens the chat with a prefilled message. | P2 | Integration |
| V-LINK-06 | GitHub / LinkedIn links | None | 1. Click each (hero, contact, footer). | — | Correct profiles, new tab, `noopener`. | P2 | Happy |
| V-LINK-07 | Footer "View source" | None | 1. Click it. | — | Opens the repository (public), or the link is removed if the repo is private. | P3 | Happy |
| V-LINK-08 | Broken-link crawl | None | 1. Run a crawler (e.g. `linkinator` or Screaming Frog) over `/` and `/ar`. | — | No 4xx/5xx internal links. External 4xx listed for review. | P1 | Happy |

## Stage 7: Contact form

### Feature: Contact form (server action `submitContact`)

Limits: name 2–100, email ≤ 254 with a TLD of 2+ letters, message 10–5000. All values are trimmed. Honeypot field `company`. 5 submissions per 10 minutes per IP.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-CON-01 | Send a valid message (EN) | Resend configured | 1. Fill name, email, message.<br>2. Submit. | name `QA Tester`, E-OK, message S-LEN(50) | Button shows a spinner and is disabled. Success card replaces the form. The inbox receives "Portfolio contact: QA Tester" with Reply-To = the visitor's email. `cta_click` `contact-submit` recorded. | P0 | Happy |
| V-CON-02 | Send a valid message (AR) | `/ar` | 1. Fill in Arabic.<br>2. Submit. | name S-AR, message S-MIX | Success card in Arabic. Email shows the Arabic text intact (no mojibake). | P0 | Happy |
| V-CON-03 | Empty submit | None | 1. Click submit with every field empty. | — | Inline errors on all three fields (translated), focus or announcement on the first error. Nothing sent. | P1 | Negative |
| V-CON-04 | Name boundary: 1 / 2 / 100 / 101 chars | None | 1. Submit with each name length. | S-LEN(1), S-LEN(2), S-LEN(100), S-LEN(101) via paste | 1 → error. 2 and 100 → accepted. 101 → the input stops at 100 (`maxLength`); bypass via devtools → server rejects with the name error. | P2 | Edge |
| V-CON-05 | Message boundary: 9 / 10 / 5000 / 5001 chars | None | 1. Submit each. | S-LEN(9), S-LEN(10), S-LEN(5000), S-LEN(5001) | 9 → error. 10 and 5000 → sent. 5001 → truncated by the textarea; via devtools → server error. | P2 | Edge |
| V-CON-06 | Message of only spaces | None | 1. Submit. | message = S-LEN(20) of spaces | Trimmed to empty → message error. | P2 | Negative |
| V-CON-07 | Leading/trailing spaces are trimmed | None | 1. Submit. | name S-PAD, E-PAD | Accepted. Email subject and body show the trimmed values. | P3 | Edge |
| V-CON-08 | Invalid emails | None | 1. Submit each. | E-NOTLD, E-1TLD, `a@b`, `@x.com`, `a b@x.com`, E-255 | All rejected with the email error. | P1 | Negative |
| V-CON-09 | Unusual but valid emails | None | 1. Submit each. | E-PLUS, E-CASE, E-IDN | E-PLUS and E-CASE accepted. E-IDN: record the result (the regex accepts it); the reply-to must still work. | P3 | Edge |
| V-CON-10 | XSS in every field | None | 1. Submit with S-XSS1 in name, S-XSS2 in message. | S-XSS1, S-XSS2 | Success. The received email shows the text literally (escaped); no script, no broken HTML, no remote image loaded. | P0 | Security |
| V-CON-11 | Header injection in name | None | 1. Submit (use devtools to put a real CR/LF in the name). | S-CRLF | Exactly one email, to the inbox only. No added Bcc/Cc. Subject on one line. | P1 | Security |
| V-CON-12 | SQL-like and template strings | None | 1. Submit. | S-SQL1, S-SQL2, S-TPL | Sent literally. No errors. Template expressions not evaluated. | P2 | Security |
| V-CON-13 | Emoji and zero-width characters | None | 1. Submit. | S-EMOJI, S-ZW | Accepted. Emoji render in the email. Length counts do not reject a valid 10-char message containing emoji. | P3 | Edge |
| V-CON-14 | Honeypot filled (bot) | Devtools | 1. Unhide `#contact-company` and type a value.<br>2. Submit valid data. | `ACME` | Success card shown, but **no email is sent**. | P1 | Security |
| V-CON-15 | Rate limit: 6th message in 10 minutes | Single instance | 1. Send 5 valid messages.<br>2. Send a 6th. | — | 6th shows the translated "rate limited" error. After 10 minutes sending works again. | P1 | Security |
| V-CON-16 | Email provider failure | `RESEND_API_KEY` empty or invalid on staging | 1. Submit a valid message. | — | Translated "send failed" error. Form keeps the typed values so the visitor can retry or use the email link. | P1 | Integration |
| V-CON-17 | Double-click submit | Throttle to Slow 3G | 1. Double-click submit quickly. | — | One email only. Button disabled while pending. | P1 | Edge |
| V-CON-18 | Offline submit | Devtools offline | 1. Go offline.<br>2. Submit. | — | A visible error (not a silent hang or a stuck spinner). Typed values kept. | P2 | Edge |
| V-CON-19 | Refresh after success | Success card visible | 1. Refresh.<br>2. Press Back. | — | Fresh empty form. No resubmission prompt, no duplicate email. | P2 | Edge |
| V-CON-20 | Submit with JavaScript disabled | JS off | 1. Fill and submit. | valid data | Server action handles the POST; success (or validation errors) rendered by the server. | P2 | Edge |
| V-CON-21 | Field errors are announced and linked | Screen reader | 1. Submit invalid data. | — | Each invalid field has `aria-invalid` and `aria-describedby` → its error; the status line (`role="alert"`) is announced. | P1 | Accessibility |
| V-CON-22 | Labels and autocomplete | None | 1. Inspect the fields. | — | Every field has a visible label; `autocomplete=name/email`. Email input is `dir="ltr"` in Arabic. Honeypot is `aria-hidden` and `tabIndex=-1` (keyboard users never reach it). | P2 | Accessibility |
| V-CON-23 | Mobile keyboard types | iPhone + Android | 1. Focus email. | — | Email keyboard (`@` visible). No zoom-in on focus (font ≥ 16 px). | P3 | UI |

## Stage 8: Errors and edge pages

### Feature: 404 and catch-all

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-404-01 | Unknown English path | None | 1. Open `/nope/deeper`. | — | Localised 404 page, status 404, nav + footer present, "back" link to home. | P1 | Negative |
| V-404-02 | Unknown Arabic path | None | 1. Open `/ar/nope`. | — | Arabic 404 in RTL. | P1 | Negative |
| V-404-03 | Path with a file extension | None | 1. Open `/nope.php`, `/wp-login.php`, `/.env`. | — | 404 (not handled by the locale middleware, not a 500). `/.env` never serves the env file. | P0 | Security |
| V-404-04 | Very long URL | None | 1. Open `/` + 5,000 characters. | S-LEN(5000) | 404 or 414. No 500. | P3 | Edge |
| V-404-05 | Old URLs still resolve | List of URLs used before the Oct 2026 rebuild (if any) | 1. Open each. | — | Redirects to the new equivalent, or a clean 404. | P3 | Negative |

## Stage 9: Analytics and privacy (visitor side)

### Feature: First-party analytics beacons

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| V-ANL-01 | Page view is recorded once per navigation | Admin access to Visitors page | 1. Open `/`, then a case study, then `/ar`.<br>2. Check the network tab and the admin Visitors page. | — | One `page_view` per page (not two from React strict effects). Path correct. | P2 | Integration |
| V-ANL-02 | UTM parameters are captured | None | 1. Open `/?utm_source=qa&utm_medium=test&utm_campaign=nov`. | — | Admin Visitors → campaigns shows `qa / test / nov`. | P2 | Integration |
| V-ANL-03 | No analytics cookies are set | Fresh profile | 1. Browse several pages.<br>2. Inspect cookies and storage. | — | No first-party tracking cookies. Only `sessionStorage` keys `mz_session_id` and `mz_landing_path`. A new tab gets a new session id. | P1 | Security |
| V-ANL-04 | Ad blocker / beacon blocked | uBlock Origin on | 1. Browse and send the contact form. | — | Site works fully; analytics failures are silent (no console errors shown to users, no broken UI). | P2 | Edge |
| V-ANL-05 | Portal and admin pages do not load trackers | Signed in to portal | 1. Open portal pages.<br>2. Check network for Vercel Analytics / Speed Insights scripts. | — | Not loaded in the portal (`analytics={false}`). | P1 | Security |
| V-ANL-06 | Analytics endpoint rejects junk silently | curl | 1. POST `/api/analytics` with `{}` and with `{"type":"hack"}`.<br>2. POST invalid JSON. | — | 202 `{success:false}`; nothing stored. | P3 | Negative |
| V-ANL-07 | Analytics flood | curl loop | 1. Send 130 valid events in 1 minute from one IP. | — | After 120 → 202 `{success:false}`; nothing beyond the limit is stored. | P3 | Security |
