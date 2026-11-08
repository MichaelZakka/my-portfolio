# Smoke test, commonly missed scenarios, open questions

[← Index](README.md)

## Smoke test (before every release)

Run on production-like staging after each deploy, on Chrome desktop and iPhone Safari (plus the [browser matrix](05-system.md#stage-8-cross-browser-and-cross-device) before bigger releases). About 45 minutes. Any failure blocks the release.

| # | Check | Covers |
|---|---|---|
| 1 | `/` and `/ar` load with correct language, direction and no console errors | V-LOC-01, V-LOC-02 |
| 2 | Language switch keeps the page (case study EN → AR) | V-LANG-02 |
| 3 | CV downloads (real file) | V-LINK-01 |
| 4 | Contact form sends; email arrives with Reply-To | V-CON-01 |
| 5 | Brief with required fields only → success → lead in admin → admin email | PR-SRV-01, PR-API-10 |
| 6 | Admin sign-in; `from=https://evil.example` does not redirect off-site | A-LOG-01, A-LOG-07 |
| 7 | Admin pages and APIs refuse a missing cookie | A-LOG-08, A-LOG-09 |
| 8 | Create proposal draft → send → proposal email arrives (correct language, working link) | A-PROP-07, PR-PROP-01 |
| 9 | Prospect accepts as a new client → signed in on the new project with milestones; lead Won; admin email | PR-ACC-01 |
| 10 | Expired proposal cannot be accepted | PR-ACC-11 |
| 11 | Invite a client → email → accept → lands in the project; admin "joined" email | A-CLI-01, C-INV-03 |
| 12 | Client sign-in; wrong password shows the generic error | C-LOG-01, C-LOG-04 |
| 13 | Forgot password → reset link → new password works, old session elsewhere signed out | C-RST-01, C-RST-03, C-RST-04 |
| 14 | Client A cannot open client B's project page or APIs | C-ACL-01, C-ACL-02 |
| 15 | Internal task, hidden file and audit entries are not visible to the client | C-OVR-06, C-FILE-10, C-ACT-02 |
| 16 | Message with an attachment both ways; appears live within 15 s; one email per batch | C-MSG-07, C-MSG-12, C-MSG-16 |
| 17 | Upload an allowed file and download it (Arabic name); `.exe` renamed `.pdf` is refused | C-FILE-01, C-FILE-03, C-FILE-07 |
| 18 | Milestone review: admin requests → client approves → milestone Done, progress updates | A-MS-06, C-REV-02 |
| 19 | Meeting: client proposes → admin accepts → `.ics` in the email imports into a calendar | C-MTG-01, C-MTG-02, C-MTG-15 |
| 20 | Project status change emails every client member | A-SET-02, C-NTF-01 |
| 21 | Archived project is read-only for the client | A-SET-04, C-LIFE-01 |
| 22 | Remove a member → immediate loss of access | A-CLI-06, C-LIFE-03 |
| 23 | Sign out (portal and admin) → Back shows no data | C-OUT-01, A-LOG-10 |
| 24 | `/api/health` 200; admin Site page all green; no new Problems from the run | S-MON-01, A-SITE-01 |
| 25 | Cron endpoint: 401 without the secret, 200 with it | S-CRON-07, S-CRON-01 |

## Commonly missed for a platform like this

Testers usually skip these. Most already have rows in the plan; the IDs show where.

**Money and contract integrity**
1. Two people accepting the same proposal (two tabs, two devices, or prospect + admin sending a new version at the same moment). PR-ACC-09, PR-ACC-10, PR-DEC-05.
2. A proposal edited in another tab between "read" and "send" (stale send). A-PROP-13.
3. The accepted snapshot actually matching the screen, and its hash being re-checkable later. PR-ACC-02, S-DATA-02.
4. Expiry exactly at the boundary, and a page left open past expiry. PR-ACC-12.
5. Currency formatting for KWD/SYP/AED in Arabic, and very large totals. PR-PROP-06, A-PROP-18.

**Dates and time zones**
6. Date-only fields (ETA, due dates, proposal start) showing one day early for users west of UTC. PR-PROP-05, C-OVR-07, S-L10N-04.
7. Meetings across a DST change, and clients in a different zone from the admin. C-MTG-13, C-MTG-14.
8. "Today" KPIs around midnight in Damascus vs UTC. A-DASH-04.
9. Reminder rules: meetings confirmed less than 6 h ahead never get a reminder. S-CRON-04.

**Visibility leaks**
10. Internal data in the RSC/HTML payload even when the UI hides it (view source, not just the screen). C-MS-02, C-OVR-06.
11. A file hidden or deleted after the client already loaded the list (stale link). C-FILE-11, C-FILE-12.
12. Emails to members who were removed. S-EML-09.
13. Activity entries of hidden tasks/files still showing in the feed. C-ACT-03, A-TSK-02.

**Sessions**
14. A copied session cookie still working after sign-out (stateless tokens). C-OUT-02, A-LOG-11.
15. Password reset and password change signing out other devices. C-RST-04, C-ACC-03.
16. Clicking an invite/reset/proposal link while signed in as a different client. C-INV-17, PR-ACC-14, C-RST-14.
17. Email links opened in Gmail's in-app browser (separate cookie jar). C-INV-20.

**Input**
18. Passwords whose character count passes but byte count fails (Arabic, emoji). PR-ACC-05, C-INV-06.
19. Emails accepted by the brief form but rejected by the portal (`qa@example.c`). PR-SRV-05, A-REQ-17.
20. Bidi-override and path characters in file names; Arabic file names on download. C-FILE-09, C-FILE-03.
21. `javascript:` / `data:` URLs in any field that becomes a link (logo URL, meeting location, review link). PR-SRV-16, A-REQ-12, C-MTG-11, A-MS-07.
22. Content-length tricks: 4 MB + multipart overhead against Vercel's 4.5 MB body cap. C-FILE-05, C-MSG-10.

**Infrastructure**
23. The default Resend sender (`onboarding@resend.dev`) silently dropping mail to everyone but the account owner. S-EML-01.
24. The private Vercel Blob driver never having been tested against a real store. S-STO-01.
25. Rate limits behaving differently across serverless instances; spoofed `X-Forwarded-For` off Vercel. S-SEC-10.
26. `router.refresh()` not updating screens on the production build (Next 16.1 bug); only visible with `next start`. A-PRJ-05.
27. The admin pages being frameable (headers only cover `/portal`). A-LOG-12, S-SEC-04.

**Lifecycle**
28. There is no way to delete a lead, a project or a client account, or to change a client's email. Privacy requests (GDPR-style) cannot be handled in the app. A-REQ-18, A-SET-05, C-ACC-09, C-ACC-10.
29. Prospects get no confirmation that their brief arrived. PR-SUB-12.

## Gaps and likely defects found while writing this plan

These come from reading the code, not from running it. Each has a test row; run those first.

| # | Finding | Where | Row | Suggested priority |
|---|---|---|---|---|
| 1 | **Admin login open redirect.** The admin login form sends the user to whatever `from` contains (`router.push(searchParams.get('from') \|\| '/admin')`), so a phishing link can bounce the admin to another site right after a real sign-in. The portal login already restricts `from` to `/portal…`. | `app/admin/login/LoginForm.tsx:33` | A-LOG-07 | P0 |
| 2 | Logo URL on the admin request page is rendered as `href={lead.logoUrl}` with no scheme check (the email version checks for http(s)). React 19 blocks `javascript:`, but other schemes are not filtered. | `app/admin/(dashboard)/requests/[id]/page.tsx:195` | A-REQ-12 | P1 |
| 3 | No server-side length limits on `/api/project-brief` fields (any size is stored and emailed). | `app/lib/projectBrief.ts` (`parseProjectBrief`) | PR-API-06 | P1 |
| 4 | `lastContactedAt` accepts any string; an invalid date likely becomes a 500. | `app/api/admin/requests/[id]/route.ts` | A-REQ-14 | P3 |
| 5 | Sign-out does not revoke the token server-side (admin and portal). | `app/api/*/logout` | C-OUT-02, A-LOG-11 | P2 |
| 6 | No frame-protection header on `/admin`. | `next.config.ts` headers | A-LOG-12 | P1 |
| 7 | Brief email regex is looser than the portal's, so some leads can never be invited or sent a proposal without editing. | `app/lib/projectBrief.ts` vs `app/lib/portal/validation.ts` | PR-SRV-05 | P2 |
| 8 | Intake survey is English-only on `/ar` (known TODO), and its success text claims the brief was emailed even when the email failed. | `app/[locale]/work-with-me/page.tsx`, `ProjectIntakeSurvey.tsx` | PR-SRV-20, PR-SUB-11 | P2 |
| 9 | Survey data is lost on refresh, Back or a language switch, with no warning. | `ProjectIntakeSurvey.tsx` | PR-SUB-03, PR-SUB-04, V-LANG-03 | P2 |
| 10 | Survey default colours are still the old red theme (`#dc2626` …). | `parseProjectBrief` | PR-SRV-18 | P3 |
| 11 | Passwords of 10 spaces are accepted. | `checkPasswordPolicy` | PR-ACC-05 | P3 |

## Questions that would let me add more scenarios

1. **Browsers and devices:** which browsers/versions and devices do you promise to support (and do clients use the portal mostly on phones)?
2. **Payments:** will invoices, deposits ("50 % upfront") or online payment be added? Then the plan needs payment declined / succeeded / timeout / refund / webhook rows.
3. **Proposal defaults:** are USD, "50 % upfront / 50 % before launch" and 14-day validity the real defaults? Which currencies do you actually quote in?
4. **Privacy:** do you need to handle deletion or export requests for leads and clients (GDPR / client contracts)? If yes, which data must be removed and which kept (signed proposals)?
5. **Account changes:** should clients be able to change their email, delete their account, or remove files they uploaded by mistake?
6. **Multiple admins:** will anyone else (a designer, a second developer) ever need admin access? That would add roles, permissions and audit-by-person scenarios.
7. **Prospect acknowledgement:** should prospects receive an automatic "I got your brief" email (and in which language)?
8. **Survey translation:** is translating the intake survey into Arabic planned? Then all PR-SRV rows run twice.
9. **Expected volumes:** how many leads per month, clients per project, and file sizes do you expect? This sets the limits for performance and upload tests (e.g. design files larger than 4 MB).
10. **Email channel:** any plans for WhatsApp/SMS notifications (common for clients in the region) or a notification-preferences page?
11. **Monitoring:** where do alert webhooks go (Slack, Telegram, Discord)? Who is on call?
12. **Environments:** is there a dedicated staging deployment with its own database and Blob store, or should tests run locally only?
13. **Time zone:** is `PORTAL_TIME_ZONE` set to `Asia/Damascus` in production? Should "today" in the dashboard follow it?
14. **Legal:** is the proposal acceptance meant to be a binding e-signature? If yes, add rows for a terms link, a downloadable signed copy (PDF) for the client, and an emailed receipt.
