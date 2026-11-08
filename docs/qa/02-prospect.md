# Role: Prospect (brief sender, no account yet)

[← Index](README.md) · Test data IDs are defined in the [catalogue](README.md#test-data-catalogue-referenced-by-id-in-the-tables).

## Stage 1: Work-with-me survey (`/work-with-me`)

The survey has 5 steps. Required fields: **step 1** description, name, email · **step 2** at least one project type (+ text if "Other") · **step 3** at least one business domain (+ text if "Other") · **steps 4–5** nothing required. Enter advances a step and never submits. The form is English-only on `/ar` too. Nothing is saved until the final submit.

### Feature: Step navigation and validation

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-SRV-01 | Complete all 5 steps with only the required fields | None | 1. Step 1: description, name, email → Next.<br>2. Step 2: pick "Landing Page" → Next.<br>3. Step 3: pick "Education" → Next.<br>4. Step 4: Next.<br>5. Step 5: "Send project brief". | E-OK | "Brief sent" success panel. Progress bar went 0 → 100 % across steps. Lead appears in admin Requests with status New. | P0 | Happy |
| PR-SRV-02 | Complete every field on every step | None | 1. Fill every field, choose several options in each multi-select, set three custom colours, mood, colour approach, notes.<br>2. Submit. | title S-MIX, phone `+963 992 833 739`, logo `https://example.com/logo.png` | Success. Every value appears in the admin request page and the admin email (see PR-API-10). | P0 | Happy |
| PR-SRV-03 | Step 1 required-field errors | Step 1 | 1. Click Next with all fields empty. | — | Errors under description ("Please describe your project."), name, email. Stays on step 1. | P1 | Negative |
| PR-SRV-04 | Step 1 invalid email | Step 1 | 1. Enter each email, click Next. | E-NOTLD, `a@b`, `a b@c.com` | "Enter a valid email address." Stays on step 1. | P1 | Negative |
| PR-SRV-05 | Step 1 email the brief accepts but the portal rejects | Step 1 | 1. Use E-1TLD.<br>2. Finish and submit. | E-1TLD | Brief accepted (lax regex). ⚠ Gap: later "Accept request" / "Send proposal" fail with "no valid client email" (see A-REQ-17). | P1 | Edge |
| PR-SRV-06 | Whitespace-only required fields | Step 1 | 1. Put S-WS in description and name. | S-WS | Treated as empty → errors. | P2 | Negative |
| PR-SRV-07 | Step 2 nothing selected | Step 2 | 1. Click Next. | — | "Select at least one project type." | P1 | Negative |
| PR-SRV-08 | Step 2 "Other" without text | Step 2 | 1. Select Other.<br>2. Leave the text empty → Next. | — | "Please specify the project type." | P1 | Negative |
| PR-SRV-09 | Step 2 deselect "Other" after typing text | Step 2 | 1. Select Other, type text.<br>2. Deselect Other → Next → submit. | `Kiosk app` | Text field hides. Admin shows the selected types; the stray "other" text is either discarded or shown — record which (it is still sent in the payload). | P3 | Edge |
| PR-SRV-10 | Step 3 nothing selected / "Other" without text | Step 3 | 1. Next with nothing.<br>2. Select Other, empty text → Next. | — | "Select at least one business domain." then "Please specify the domain." | P1 | Negative |
| PR-SRV-11 | Multi-select chips toggle | Steps 2–4 | 1. Click a chip twice. | — | Toggles on/off; `aria-pressed` follows. | P2 | UI |
| PR-SRV-12 | Back keeps entered data and clears errors | Step 3 with an error shown | 1. Click Back.<br>2. Click Next. | — | Step 2 shows previous selections. The step 3 error is gone until Next is validated again. | P2 | Happy |
| PR-SRV-13 | Enter key in a text field | Step 1 complete | 1. Press Enter in the name field. | — | Advances to step 2 (validated). Never submits the brief early. On step 5, Enter in a field does not send twice. | P1 | Edge |
| PR-SRV-14 | Step indicator states | Any | 1. Move through the steps. | — | Current step has `aria-current="step"`; finished steps look done; "Step N / 5" text matches. | P2 | Accessibility |
| PR-SRV-15 | Brand fields with "No" brand | Step 4 | 1. Choose "No".<br>2. Fill brand name anyway (if visible). | — | Fields behave consistently (hidden or optional). Admin shows "Existing brand: No". | P3 | Edge |
| PR-SRV-16 | Logo URL field | Step 4 | 1. Enter each value → submit. | `https://example.com/a.png`, `example.com`, S-JSURL, S-DATAURL | Accepted as text (no validation). In the admin email only `http(s)` URLs become links. In the admin request page, S-JSURL / S-DATAURL must **not** run script when clicked (see A-REQ-12). | P0 | Security |
| PR-SRV-17 | Colour picker and hex input stay in sync | Step 5 | 1. Pick a colour with the picker.<br>2. Type a hex value.<br>3. Type non-hex characters. | `1a73ff`, `ZZZ999`, `#12345678` | Picker updates from the hex input and vice versa. Non-hex characters are stripped, max 6. A partial value (`12`) does not break the picker. | P2 | Edge |
| PR-SRV-18 | Default colours when untouched | Step 5 untouched | 1. Submit. | — | Lead stores the defaults `#dc2626`, `#e0e0e0`, `#b91c1c`. (⚠ These are the old red theme; confirm they are still the intended defaults.) | P3 | Edge |
| PR-SRV-19 | Survey layout on 320 px | 320 px | 1. Walk all steps. | — | No horizontal scroll. Chips wrap. Buttons reachable. Colour pickers usable by touch. | P1 | UI |
| PR-SRV-20 | Survey on `/ar` | `/ar/work-with-me` | 1. Open and complete. | S-AR in description | Page chrome Arabic/RTL; the survey section is `lang="en" dir="ltr"` (English-only, ⚠ Gap). Arabic typed text displays correctly inside the LTR fields (use `dir="auto"` expectations: Arabic text right-aligned or readable). Lead's landing path is `/ar/...` so admin emails default to Arabic. | P1 | UI |
| PR-SRV-21 | Loading skeleton | Slow 3G | 1. Open `/work-with-me`. | — | A placeholder with `aria-busy` shows until the survey JS loads; no layout jump afterwards. | P3 | UI |

### Feature: Submit and interrupted flows

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-SUB-01 | Submit button state while sending | Slow 3G | 1. Click "Send project brief". | — | Label "Sending…", button disabled. | P1 | UI |
| PR-SUB-02 | Double-click submit | Slow 3G | 1. Double-click Send. | — | Exactly one lead and one admin email. | P0 | Edge |
| PR-SUB-03 | Refresh mid-survey | Step 4 with data | 1. Refresh. | — | Survey restarts at step 1, empty. ⚠ Gap: no draft saved and no "leave page?" warning. `survey_abandoned` event recorded with step 4. | P2 | Edge |
| PR-SUB-04 | Back button mid-survey | Came from `/`, now on step 3 | 1. Press browser Back. | — | Leaves the page (steps are not in history) and the data is lost. ⚠ Gap: users may expect Back = previous step. | P2 | Edge |
| PR-SUB-05 | Close the tab mid-survey | Step 2 | 1. Close the tab. | — | `survey_abandoned` beacon sent (check admin funnel). | P3 | Integration |
| PR-SUB-06 | Offline at submit | Devtools offline on step 5 | 1. Click Send. | — | "Could not send your brief. Please check your connection and try again." + "Email me directly" link. Data kept, so retrying after reconnecting works. | P1 | Edge |
| PR-SUB-07 | Server error at submit | Make the DB unreachable on staging | 1. Submit. | — | Error text from the server ("Could not save your brief right now…"), data kept, problem logged in admin Site → Problems with source `intake`. | P0 | Negative |
| PR-SUB-08 | Rate limit: 6th brief in 10 minutes | Single instance | 1. Submit 5 briefs.<br>2. Submit a 6th. | — | "Too many submissions. Please try again later." Data kept. | P1 | Security |
| PR-SUB-09 | "Start another brief" | Success panel | 1. Click it. | — | Empty form at step 1. A new submit creates a second lead. | P2 | Happy |
| PR-SUB-10 | Session timeout is not an issue | Leave step 5 open 2 hours | 1. Submit. | — | Works (no session involved). | P3 | Edge |
| PR-SUB-11 | Success copy when the admin email failed | `RESEND_API_KEY` invalid | 1. Submit. | — | Lead saved, success panel shown. ⚠ The copy says "your project brief was emailed to me" although the email failed; lead shows emailSent = false and a delivery problem is logged. | P2 | Integration |
| PR-SUB-12 | Prospect confirmation email | Submit with E-OK | 1. Check the prospect's inbox. | — | ⚠ Gap: none is sent. Only the admin is notified. | P2 | Integration |

### Feature: `/api/project-brief` (API-level, use curl)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-API-01 | Invalid JSON | curl | 1. POST `not json`. | — | 400 "Invalid request body." | P2 | Negative |
| PR-API-02 | Body is an array / null / a string | curl | 1. POST `[]`, `null`, `"x"`. | — | 400, no lead created. | P2 | Negative |
| PR-API-03 | Required fields missing (bypassing the UI) | curl | 1. POST without `clientEmail`. 2. Without `projectTypes`. | — | 400 with the matching message; no lead. | P1 | Negative |
| PR-API-04 | Wrong types in fields | curl | 1. POST `projectTypes: "web"`, `clientName: 123`, `personalities: [1, {}]`. | — | Non-strings ignored / treated as empty → validation errors or cleaned arrays. No 500. | P2 | Negative |
| PR-API-05 | Unknown project type ids | curl | 1. POST `projectTypes: ["hack"]`. | — | Currently accepted and stored as-is (labels fall back to the raw id). Admin and email show `hack`, escaped. | P3 | Edge |
| PR-API-06 | Oversized fields | curl | 1. POST description S-HUGE (1 MB) and 1,000 personalities. | S-HUGE | ⚠ Gap: no server-side length limits. Record: stored? email sent? admin page usable? Expected for a hardened API: 400/413. | P1 | Security |
| PR-API-07 | Extra unknown fields | curl | 1. POST valid brief + `status: "won"`, `id: "x"`, `notes: "y"`. | — | Extra fields ignored: lead is New, has a generated id, empty notes (no mass assignment). | P0 | Security |
| PR-API-08 | XSS / SQL strings in every field | curl or UI | 1. Submit with S-XSS1, S-XSS2, S-SQL2 across fields. | S-XSS1, S-XSS2, S-SQL2 | Stored literally. Admin list, detail, email and WhatsApp text show them escaped. No script runs anywhere. | P0 | Security |
| PR-API-09 | landingPath handling | curl | 1. POST `landingPath` of 1,000 chars and of `javascript:x`. | S-LEN(1000) | Stored truncated to 256 chars, shown as text only. | P3 | Edge |
| PR-API-10 | Admin notification email content | Resend on | 1. Submit PR-SRV-02's brief. | — | Subject "Project brief: <title or name>". Reply-To = prospect's email. Every section present; empty fields show "N/A"; colours show swatches; long description wraps; Arabic text renders RTL-correct in Gmail, Outlook, Apple Mail. | P1 | Integration |
| PR-API-11 | Lead metadata | Submit from a link with a referrer | 1. Open the site from a Google result or a test page that links to it.<br>2. Submit. | — | Admin shows user agent, referrer and landing path (first page of the session). | P3 | Happy |

## Stage 2: Receiving and reading a proposal

Preconditions for this stage: the admin sent a proposal to the prospect (see A-PROP). The link is `/portal/proposal/<43-char token>`; it works without signing in.

### Feature: Proposal email and page

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-PROP-01 | Proposal email arrives in the proposal's language | Proposal locale EN, then AR | 1. Send.<br>2. Open the email. | — | Subject and body in the proposal language (Arabic email RTL). Shows title, the total formatted for the proposal's language and currency, valid-until date, one button with an absolute `https://` link to the production host. | P0 | Integration |
| PR-PROP-02 | Open the proposal page | Valid link | 1. Click the button. | — | Page shows the full proposal: title, summary, phases with durations and dates, included, excluded, client provides, total + currency, payment terms, revision rounds, start date ("when you accept" if empty), valid until. Accept / Ask for changes / Decline actions. | P0 | Happy |
| PR-PROP-03 | Schedule dates are correct | Phases 10 d + 5 d + 7 d, no start date | 1. Open the page. | — | Phase end dates run back to back from today (UTC): +10, +15, +22 days. Total 22 days. Completion date matches the last phase. | P1 | Happy |
| PR-PROP-04 | Fixed start date | Start date 2026-12-01 | 1. Open the page. | — | Dates count from 2026-12-01. | P2 | Happy |
| PR-PROP-05 | Date display in a negative-offset time zone | Set the OS zone to America/Los_Angeles | 1. Open the page. | — | Start and phase dates show the same calendar day as stored (no "one day early" from UTC-midnight dates). | P1 | Edge |
| PR-PROP-06 | Each currency formats correctly | Proposals in USD, EUR, GBP, AED, SAR, QAR, KWD, SYP | 1. Open each in EN and AR. | totals 0 decimals | Right symbol/code, grouping, no decimals; KWD and SYP not shown with odd fractions. | P2 | UI |
| PR-PROP-07 | Long content | 12 phases, 20 items per list, 5000-char summary | 1. Open on 320 px and desktop. | S-LEN(5000) | Wraps cleanly, no horizontal scroll, readable; print preview (Ctrl+P) fits pages. | P2 | UI |
| PR-PROP-08 | Arabic proposal layout | Proposal locale `ar` | 1. Open. | S-AR, S-MIX | RTL, Arabic labels, mixed English terms (Next.js, API) keep correct order. | P1 | UI |
| PR-PROP-09 | Prospect's own portal language differs from the proposal | Portal cookie `en`, proposal `ar` | 1. Open. | — | Content language is the proposal's; record which language the page chrome uses, and that it is consistent. | P3 | Edge |
| PR-PROP-10 | Page is not indexable, framable or leaking the token | Valid link | 1. Check response headers.<br>2. Click any external link on the page. | — | `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. Destination sees no Referer. | P0 | Security |
| PR-PROP-11 | Invalid token | None | 1. Open `/portal/proposal/abc`, a 43-char random token, and a token with one character changed. | — | "Not valid" page (no stack trace, no 500). Not redirected to sign-in. | P1 | Negative |
| PR-PROP-12 | Draft proposals have no reachable link | Draft exists | 1. Try to guess any URL for it. | — | Not reachable (drafts have no token). | P1 | Security |

### Feature: Accept (e-signature + account)

Accept needs: signer name 2–100 chars, the "I agree" box, and a password. **New** account: password must meet the policy. **Existing** account with that email: its current password. Accept creates the project, one milestone per phase, the membership and the account in one transaction, then signs the browser in and redirects to the project.

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-ACC-01 | Accept as a new client | Sent, valid, no account for the email | 1. Enter name, tick "I agree", set password.<br>2. Accept. | name `Lina Haddad`, PW-10 | Redirect to `/portal/projects/<id>`, signed in. Project: name = proposal title, status Planning, current phase = first phase, ETA = completion date. One milestone per phase with estimated days and due dates. Activity "proposal accepted" visible. Lead → Won. Admin gets the "accepted" email with a link to the project. | P0 | Happy |
| PR-ACC-02 | Accepted snapshot is stored | After PR-ACC-01 | 1. In DB/admin, open the proposal. | — | Status accepted, signer name, IP, user agent, respondedAt, snapshot JSON + SHA-256 hash. Snapshot equals what the page showed (version, totals, phases, start/completion dates, valid until, recipient email). | P0 | Integration |
| PR-ACC-03 | Accept with an existing client account | Email already has a portal account | 1. Page asks for the current password.<br>2. Enter it, accept. | correct password | Project added to the existing account. Name not overwritten if already set. Signed in. | P0 | Happy |
| PR-ACC-04 | Existing account, wrong password | As above | 1. Enter a wrong password. | `WrongPass123` | "Incorrect password." Nothing created; proposal still open. | P0 | Negative |
| PR-ACC-05 | Password policy for new accounts | New account | 1. Try each password. | PW-9, PW-10, PW-72B, PW-73B, PW-AR36, PW-AR37, PW-EMO10, PW-SP10 | PW-9 and PW-73B and PW-AR37 → "too short"/"too long" (translated). Others accepted. PW-SP10 accepted (⚠ policy question). | P1 | Edge |
| PR-ACC-06 | Signer name boundaries | — | 1. Try each. | `L`, `Li`, S-LEN(100), S-LEN(101), S-WS | 1 char and spaces-only rejected; 2 and 100 accepted; 101 rejected. | P2 | Edge |
| PR-ACC-07 | "I agree" not ticked | — | 1. Leave unticked, accept. | — | Blocked with a visible error; API rejects `agree:false` (400). | P0 | Negative |
| PR-ACC-08 | Double-click Accept | Slow 3G | 1. Double-click Accept. | — | Exactly one project, one account, one membership, one admin email. Second request → "can no longer be accepted" (or ignored silently). | P0 | Edge |
| PR-ACC-09 | Accept in two tabs at once | Two tabs on the same link | 1. Submit Accept in both within a second. | — | One wins; the other gets "proposal closed". One project only. | P0 | Edge |
| PR-ACC-10 | Accept while the admin sends a new version | Admin ready to send v2 | 1. Admin sends v2 while the prospect clicks Accept on v1. | — | Either v1 accepted (v2 send then refused: request converted) or v1 superseded and accept refused. Never both. | P0 | Edge |
| PR-ACC-11 | Accept after expiry | `validUntil` in the past | 1. Open the link.<br>2. Try to accept (also via curl). | — | Page shows "expired" with the date. Accept unavailable; API returns 410 `proposalExpired`. Changes/decline still offered. | P0 | Negative |
| PR-ACC-12 | Accept a proposal that expires while the page is open | `validUntil` = now + 2 min | 1. Open the page.<br>2. Wait 3 minutes.<br>3. Accept. | — | Refused (expired). Clear message, no project. | P1 | Edge |
| PR-ACC-13 | Accept when the request was already converted another way | Admin used "Accept request" after sending | 1. Open the proposal link. | — | Shows "replaced/superseded"; cannot accept. | P1 | Negative |
| PR-ACC-14 | Accept while signed in as a different client | Browser signed in as CB | 1. Accept PR's proposal as a new account. | — | Session switches to the new client; CB's session cookie is replaced. Portal now shows only the new project. | P1 | Security |
| PR-ACC-15 | Proposal recipient email belongs to the admin | Lead email = E-ADMIN | 1. Admin tries to send. | — | Send refused (409 adminEmail). Covered in A-PROP-15. | P1 | Security |
| PR-ACC-16 | Forwarded link | Prospect forwards the email to a colleague | 1. Colleague opens the link and accepts with a new password. | — | Works (the link is the credential); the account is created for the **recipient's** email, not the colleague's. Document as accepted risk or add sign-in. | P2 | Security |
| PR-ACC-17 | Accept with the proposal page open for a long time | Page open 8 h, link still valid | 1. Accept. | — | Works. | P3 | Edge |
| PR-ACC-18 | Accept offline | Devtools offline | 1. Accept. | — | Visible error, form values kept, nothing created. Retry online works. | P2 | Edge |
| PR-ACC-19 | Rate limit on answers | Single instance | 1. Send 11 answer requests in 15 min from one IP (e.g. wrong passwords). | — | 11th → 429, translated "too many attempts". | P1 | Security |
| PR-ACC-20 | Account language after accepting | Portal language cookie `ar` | 1. Accept. | — | New user's locale = `ar`; future emails Arabic. | P2 | Happy |
| PR-ACC-21 | Re-open the link after accepting | Accepted | 1. Open the link again (signed out). | — | "Accepted by <name> on <date>" notice; no form; link to the project/portal. | P1 | Happy |

### Feature: Ask for changes / Decline

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-CHG-01 | Ask for changes | Sent, valid | 1. Choose "Ask for changes".<br>2. Write a note → submit. | S-NL | Confirmation shown; page now shows "changes requested on <date>". Admin emailed with the note (line breaks kept). Proposal status `changes_requested`. Lead status unchanged. | P0 | Happy |
| PR-CHG-02 | Changes with an empty note | — | 1. Submit an empty or spaces-only note. | S-WS | Blocked (note required, 1–3000). | P1 | Negative |
| PR-CHG-03 | Changes note boundaries | — | 1. Submit 3000 and 3001 chars. | S-LEN(3000), S-LEN(3001) | 3000 OK; 3001 rejected. | P2 | Edge |
| PR-CHG-04 | Changes after expiry | Expired | 1. Ask for changes. | — | Allowed (by design). Admin emailed. | P1 | Edge |
| PR-CHG-05 | Changes, then the admin sends v2 | After PR-CHG-01 | 1. Admin revises and sends v2.<br>2. Open the v1 link. | — | v1 shows "replaced by a newer version"; v2 email arrives with a new link that works. | P0 | Happy |
| PR-CHG-06 | XSS in the note | — | 1. Submit S-XSS2. | S-XSS2 | Admin email and admin UI show it as text. | P0 | Security |
| PR-DEC-01 | Decline without a note | Sent | 1. Decline. | — | Page shows "declined". Admin emailed. Lead → Lost, with a status event "Proposal vN declined". | P0 | Happy |
| PR-DEC-02 | Decline with a note | Sent | 1. Decline with a reason. | S-AR | Note in the admin email and stored. | P1 | Happy |
| PR-DEC-03 | Decline when the lead is already Won | Lead manually set to Won | 1. Decline. | — | Proposal declined; lead stays Won. | P2 | Edge |
| PR-DEC-04 | Decline twice / decline after accepting | Already answered | 1. Submit decline again via curl with the token. | — | 409 "already answered or replaced". No status change. | P1 | Negative |
| PR-DEC-05 | Decline vs accept race | Two tabs | 1. Accept in one tab and decline in the other at the same time. | — | Exactly one outcome. If accepted, no Lost status; if declined, no project. | P0 | Edge |

### Feature: Link lifecycle (state transitions)

| ID | Scenario title | Preconditions | Test steps (numbered) | Test data | Expected result | Priority | Type |
|---|---|---|---|---|---|---|---|
| PR-LNK-01 | Admin reissues the link | Sent | 1. Admin clicks resend.<br>2. Open the old and the new link. | — | Old link → "not valid". New link works; valid-until restarts from now. | P0 | Happy |
| PR-LNK-02 | Valid states and their pages | One proposal in each state | 1. Open: sent, expired, accepted, changes_requested, declined, superseded. | — | Each shows the matching notice; only sent offers Accept; sent and expired offer changes/decline; the rest offer nothing. | P1 | Negative |
| PR-LNK-03 | Invalid jumps via the API | One proposal per state | 1. curl `accept` on declined / changes_requested / superseded.<br>2. curl `decline` on accepted. | — | 409 `proposalClosed` each time; no data changes. | P0 | Security |
| PR-LNK-04 | Token in a different case / with padding | Valid token | 1. Change one letter's case. 2. Add `=` or a trailing space. | — | Not valid (tokens are exact). | P2 | Security |
| PR-LNK-05 | Token brute force is impractical | — | 1. GET 50 random tokens.<br>2. POST 11 answers with random tokens. | — | All "not valid" (256-bit tokens). Page GETs are not rate limited; POST answers hit 429 after 10 per 15 min. | P2 | Security |
