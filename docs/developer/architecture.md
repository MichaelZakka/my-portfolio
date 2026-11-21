# Architecture

**For:** developers. How the application is put together and where things live.

- [System overview](#system-overview)
- [Repository layout](#repository-layout)
- [Request flow and `proxy.ts`](#request-flow-and-proxyts)
- [Layouts and the HTML shell](#layouts-and-the-html-shell)
- [The public site](#the-public-site)
- [Internationalisation](#internationalisation)
- [The content system](#the-content-system)
- [The design system](#the-design-system)
- [The admin dashboard](#the-admin-dashboard)
- [The client portal](#the-client-portal)
- [Server libraries](#server-libraries)

## System overview

```text
                     ┌──────────────────────────── Vercel (functions pinned to cdg1, Paris) ──┐
 Browser ──HTTPS──▶  │ proxy.ts ─▶ App Router pages (RSC) and route handlers (app/api)        │
                     │              │            │             │                           │
                     └──────────────┼────────────┼─────────────┼───────────────────────────┘
                                    ▼            ▼             ▼
                     Supabase Postgres    Resend (email)   Vercel Blob (private files)
                     (Paris, via pooler,
                      Prisma ORM)
 Vercel Cron ──(daily 06:00 UTC)──▶ /api/cron/meeting-reminders
 Uptime monitor ──────────────────▶ /api/health
```

- One Next.js app serves everything; there is no separate backend. Data access goes through
  Prisma in server components, server actions and route handlers.
- Functions run in Paris (`vercel.json` → `regions: ["cdg1"]`), next to the Supabase
  database in `eu-west-3`. Running them elsewhere (they were in `iad1` before) added about
  400 ms to every query.
- There is no third-party auth, queue or cache: sessions are signed cookies, notifications
  run after the response (`after()` from `next/server`), and rate limits live in memory.

## Repository layout

```text
app/
  [locale]/                 Public site: home, projects/[slug], blog, work-with-me, not-found
  admin-jfaygpory6/         Admin dashboard (path deliberately unguessable, not secret)
    (dashboard)/            Authenticated screens: overview, requests, proposals, projects,
                            users, reviews, visitors, content, messages, notifications, site
    _components/            Sidebar, AdminMain, KPI cards, charts, skeletons
    login/                  Sign-in page
  portal/                   Client portal
    (app)/                  Signed-in screens: home, projects/[projectId] (+ review), account
    invite/[token]/         Accept an invitation
    proposal/[token]/       Read and answer a proposal (public, token-gated)
    reset-password/[token]/ forgot-password/ login/ enter/
    preview/[projectId]/    Admin's "view as client"
    _components/            Auth card, language switch, proposal document, time-zone sync…
  api/                      Route handlers: admin/*, portal/*, analytics, errors, health,
                            cron/*, project-brief
  actions/contact.ts        Server action behind the home page contact form
  components/               Public site sections (Hero, About, Projects…) and shared UI
                            (HtmlDocument, confirmDialog, MediaLightbox, Reveal)
  lib/                      Server and shared logic (see "Server libraries")
    content/                Portfolio content system (Content editor)
    portal/                 Client portal domain logic
  assets/                   Bundled images (project screenshots, volunteering logo)
  globals.css               Design tokens and global styles
  layout.tsx                Root layout: metadata only, no <html>
  robots.ts, sitemap.ts     SEO routes
content/blog/               Blog posts (MDX)
data/                       Default portfolio content: projects, experience, skills, strengths
i18n/                       next-intl routing, request config, navigation helpers
messages/                   en.json and ar.json: every UI string, portal and email text
prisma/                     schema.prisma, migrations/, migrations-sqlite/ (history), seed.mjs
public/                     Static files: CV, Open Graph image, icon, search-console file
scripts/hash-password.mjs   Generates ADMIN_PASSWORD_HASH
proxy.ts                    Middleware (Next.js 16 name): auth gates and locale routing
instrumentation.ts          Startup env check; unhandled-error reporting
docs/                       This documentation and the manual test plan
```

## Request flow and `proxy.ts`

`proxy.ts` is the middleware. It runs for admin and portal paths, their APIs, and every
page that isn't an API route, a Next internal or a static file.

| Path | What the proxy does |
| --- | --- |
| `/portal…`, `/api/portal…` | Lets the public portal paths through (sign-in, forgot/reset password, invitation and proposal pages, `/portal/enter`, the auth, invitation-accept, proposal-respond and locale APIs). `/portal/preview/*` needs an **admin** session. Everything else needs a valid **portal** session cookie: pages redirect to `/portal/login?from=…`, APIs answer 401. |
| `/admin-jfaygpory6…`, `/api/admin…` | The login page and login API are public. Everything else needs a valid admin session; pages redirect to the login page, APIs answer 401. If admin auth isn't configured at all, it fails closed. |
| Any other page | Locale routing through next-intl (English unprefixed, Arabic under `/ar`). Before that, a **typed or bookmarked visit** (`Sec-Fetch-Site: none` and `Sec-Fetch-Mode: navigate`) to any page other than `/`, `/en` or `/ar` is redirected to the home page of its language. Clicks inside the site and links from other sites carry other `Sec-Fetch-Site` values and open normally; bots without fetch metadata are untouched, so case studies stay indexable. |

The proxy only checks that a cookie is genuine and unexpired. **Every page and route
handler checks again on the server**: `requireAdminSession()` (admin pages),
`authorizeAdmin()` / `authorizeAdminProject()` (admin APIs), and `getPortalUser()` /
`authorizeClientProject()` (portal), which also load the user from the database so a
password reset or removed membership takes effect immediately. See
[Portal internals](portal-internals.md#sessions-and-access-control).

## Layouts and the HTML shell

- `app/layout.tsx` only sets metadata (metadata base, icons, theme colour) and returns its
  children. It renders no `<html>`.
- `app/components/HtmlDocument.tsx` renders `<html lang dir>` and `<body>` for each area:
  `app/[locale]/layout.tsx` (lang/dir from the URL), `app/admin-jfaygpory6/layout.tsx`
  (English, LTR, `noindex`) and `app/portal/layout.tsx` (language from the portal cookie,
  `noindex`, `analytics={false}`). It loads the fonts through `next/font` (Space Grotesk
  for headings, Inter for body, IBM Plex Sans Arabic, not preloaded) and, unless disabled,
  the first-party `AnalyticsTracker` plus Vercel Analytics and Speed Insights.
- `app/not-found.tsx` is the fallback 404 for paths outside any locale;
  `app/[locale]/not-found.tsx` is the localised one, reached through the catch-all
  `app/[locale]/[...rest]/page.tsx`.

## The public site

### Pages

| Route | File | Notes |
| --- | --- | --- |
| `/`, `/ar` | `app/[locale]/page.tsx` | Sections: Hero, About, Strengths, Projects (lazy-loaded), Experience, Skills, Education, Volunteering, Contact; Footer. JSON-LD for Person, WebSite and the home page. |
| `/projects/[slug]` | `app/[locale]/projects/[slug]/page.tsx` | Case study: overview, challenge → solution, results, screenshots, facts sidebar, previous/next. |
| `/work-with-me` | `app/[locale]/work-with-me/page.tsx` | The five-step `ProjectIntakeSurvey` (English-only on both locales; it asks for the contact language). Posts to `/api/project-brief`. |
| `/blog`, `/blog/[slug]` | `app/[locale]/blog/…` | MDX from `content/blog/` via `app/lib/blog.ts`. English-only. Drafts appear in development only; the index is `noindex` while nothing is published. Not linked from the site. |

The contact form is a server action (`app/actions/contact.ts`): honeypot field, 5 per 10
minutes per IP, saved to `ContactMessage` first, then emailed.

### Rendering and caching

- Public pages are **statically generated** (`generateStaticParams` for locales, project
  slugs and posts) and regenerated on demand: saving in the Content editor calls
  `revalidatePath('/', 'layout')` and revalidates the sitemap. There is no
  `unstable_cache` layer, so nothing else can go stale.
- `dynamicParams = true` on the locale layout, case studies and blog posts, so pages
  revalidated after a content save (and projects published after a deploy) can render.
  Unknown values still 404 through explicit checks. Setting it to `false` breaks
  revalidation on Next 16.1.1; see [Known issues](known-issues.md#nextjs-161-traps).
- Content reads that fail for any reason other than "table missing" throw on purpose: a
  failed regeneration keeps the last good page instead of publishing defaults over the
  admin's edits.

### Small but important behaviours

- **TODO placeholders** (`data/todo.ts`): any project or experience string starting with
  `TODO` renders highlighted in development and is filtered out in production.
- **Intro screen** (`app/components/IntroScreen.tsx`): an inline boot script sets
  `<html data-intro=play|leave|done>` before first paint, once per tab session
  (`sessionStorage`), skipped for `prefers-reduced-motion`. The hero's entrance
  animations wait for it.
- **Scroll reveal** (`app/components/motion/Reveal.tsx`) adds `is-visible`; a `<noscript>`
  style in `HtmlDocument` shows everything without JavaScript.
- **SEO** (`app/lib/seo.ts`): `buildPageMetadata()` sets canonical URLs, `hreflang`
  alternates (with `x-default`), Open Graph and Twitter cards; JSON-LD helpers for the
  person, website, home page, Work with me and each project. `app/sitemap.ts` emits every
  public route once per locale with alternates; `app/robots.ts` disallows `/api/` and
  deliberately doesn't name the admin path (its pages are `noindex` instead). The site URL
  comes from `getSiteUrl()` (`NEXT_PUBLIC_SITE_URL`, else `https://michael-zakka.com`).

### First-party analytics

`AnalyticsTracker` sends a `page_view` beacon on every route change (skipping the admin;
the portal doesn't render it). `app/lib/analyticsClient.ts` also tracks `cta_click` and
the brief funnel (`survey_started`, `survey_step_completed`, `survey_submitted`,
`survey_abandoned`). Beacons go to `POST /api/analytics` (120 per minute per IP, silently
dropped above that) and land in `AnalyticsEvent` with path, referrer, UTM tags, a coarse
device type from the User-Agent, the country from `x-vercel-ip-country`, and a random
per-tab session id from `sessionStorage`. No cookies. The admin's Overview and Analytics
screens aggregate them (`app/lib/analyticsServer.ts`).

## Internationalisation

- **next-intl** with locales `en` and `ar` (`i18n/routing.ts`): `localePrefix:
  'as-needed'` (English at `/`, Arabic at `/ar`), `localeDetection: false` (no automatic
  redirect; recruiters land on English).
- `i18n/request.ts` loads `messages/<locale>.json` and merges the admin's text overrides
  over it (see the content system below). The locale layout passes only the namespaces
  client components need (`common`, `nav`, `meta`, `hero`, `projects`, `contact`) to
  `NextIntlClientProvider`; everything else stays on the server.
- Direction comes from the locale (`dirFor()`), set on `<html dir>`. Styles use logical
  properties; directional icons use `.flip-rtl`. Arabic uses IBM Plex Sans Arabic through
  the font stacks.
- Use `Link`, `useRouter` and friends from `i18n/navigation.ts` on the public site so links
  keep the locale; `localizedPath()` (`i18n/paths.ts`) builds prefixed paths by hand.
- **The portal is outside `[locale]`.** Its language comes from the `portal_locale` cookie
  (set by the language switch, by `/portal/enter?lang=…` from the site footer, and at
  sign-in from `User.locale`), falling back to what is known about the person, then the
  browser. Portal strings live under `portal` and email strings under `portalEmail` in the
  same message files. Emails always use the recipient's `User.locale`. Details in
  [Portal internals](portal-internals.md#language-and-time-zones).
- **The admin is English-only**; its labels are in code (`app/lib/portal/constants.ts`,
  `app/lib/leads.ts`).

## The content system

The admin's **Content** editor (`app/admin-jfaygpory6/(dashboard)/content/`) edits the
portfolio without a deploy. Code: `app/lib/content/`.

```text
data/*.ts + messages/*.json + lib/site.ts ──(defaults.ts)──▶ default docs ─┐
                                                                           ├─▶ resolveDocs() ─▶ getPortfolio(locale)
SiteContent rows (profile, socials, projects, experience,                  │    (portfolio.ts)  ─▶ components
                  strengths, skills) ──(schema.ts validates)──────────────┘
SiteContent rows text.en / text.ar ──(text.ts)──▶ applyTextOverrides() in i18n/request.ts ─▶ t()
```

- **Parts.** Six JSON documents (`profile`, `socials`, `projects`, `experience`,
  `strengths`, `skills`) with zod schemas in `schema.ts`. A part without a row uses the
  defaults built by `defaults.ts` from `data/*.ts`, `app/lib/site.ts`, `app/lib/seo.ts` and
  the Arabic overlay under `content` in `messages/ar.json`. Saving a part writes its whole
  document; "Reset to original" deletes the row.
- **Localised values** are `{ en, ar }`; an empty Arabic value falls back to English
  (`pick()`, `pickList()`).
- **Section text.** `text.en` and `text.ar` hold only the message keys whose text differs
  from the files. `applyTextOverrides()` replaces those keys in the loaded messages, but
  only keys listed in `TEXT_SECTIONS` (or the profile keys) and only values that keep the
  default's `{placeholders}` and contain no other braces or tags (they go through ICU
  formatting). A value equal to the file's text is dropped, so the file stays the source.
- **Reads.** `getStoredContent()` is wrapped in React `cache()` (once per request);
  `readStoredContent()` is the admin's always-fresh read. A stored part that no longer
  validates falls back to the defaults and is reported as invalid. A missing table (Prisma
  `P2021`) means "never saved".
- **Writes.** `PUT`/`DELETE /api/admin/content/[part]` (`part` = a part name or `text`)
  validate, save in a transaction, and call `revalidatePublicSite()`.
- **Screenshots** are referenced by key (`SCREENSHOT_SETS`, built from the images imported
  in `data/projects.ts`); uploading new images isn't supported.

**Adding a field to a part:** extend the zod schema in `schema.ts`, the default in
`defaults.ts`, the public shape in `portfolio.ts`, the component that renders it, and the
editor under `content/<part>/`. Adding public text is simpler: add a message key to both
JSON files and it becomes editable in its section automatically (if its namespace is in
`TEXT_SECTIONS`).

## The design system

All tokens are CSS custom properties in `:root` of `app/globals.css` (there is no separate
tokens file):

| Group | Tokens |
| --- | --- |
| Surfaces | `--bg` `#0a1628` (deep navy), `--bg-elevated`, `--bg-elevated-2`, `--border`, `--border-strong` |
| Text | `--text`, `--text-muted`, `--text-dim` (lifted to pass WCAG AA on `--bg`) |
| Accent | `--accent` `#1a73ff` (signal blue), `--accent-hover`, `--accent-strong` (buttons with white text), `--accent-text` (accent as small text, AA), `--accent-soft`, `--accent-line` |
| Status | `--success`, `--warning`, `--danger`, `--danger-text`, `--violet` |
| Shape and space | `--radius-sm/--radius/--radius-lg`, `--s-1`…`--s-9` (4–96 px), `--container` (1200 px), `--gutter`, `--section-y` |
| Type | `--font-heading` (Space Grotesk), `--font-body` (Inter), both falling back to IBM Plex Sans Arabic; `--font-code` |

Global helpers: `.btn`, `.btn-primary`, `.btn-outline`, `.card`, `.card-interactive`,
`.container`, `.section`, `.section-title`, `.eyebrow`, `.skip-link`, `.visually-hidden`,
`.flip-rtl`, `.todo`. Section headings animate (typing caret on the eyebrow, bar draw) in
CSS, keyed on `.reveal.is-visible`.

Gotchas (also in [Known issues](known-issues.md#css-and-layout)): every `<section>` gets
`content-visibility: auto` for the long marketing page, so app screens must opt out; only
`ul` has its list style reset, not `ol`; `.btn` has no disabled style; modal `<dialog>`s
need `margin: auto` because of the global reset. The admin's CSS modules partly use
hard-coded hex values that match the tokens; new CSS should use the tokens.

## The admin dashboard

- **Server components** render each screen; interactive parts are client components
  ("panels") that call the admin APIs. Every page starts with `requireAdminSession()`.
- **Navigation shimmer.** There is deliberately no `loading.tsx` in the admin.
  `_components/AdminMain.tsx` watches link clicks and shows a `ScreenSkeleton` for the
  target path until the new page commits (state in a `useSyncExternalStore` store).
  The reason is a Next 16.1.1 bug with `router.refresh()` behind Suspense; see
  [Known issues](known-issues.md#nextjs-161-traps).
- **Refreshing after an action.** Simple screens call `router.refresh()`
  (`useAdminAction`). The project screen renders from `buildAdminProjectView()`
  (`app/lib/portal/adminView.ts`) and re-reads `GET /api/admin/projects/[id]/view` through
  `ProjectViewContext.reload()` after each change, and polls `/updates` every 15 seconds.
- **Sidebar badges** come from `GET /api/admin/unread` every minute, on navigation, and on
  the window event `admin-badges` (fired by the notifications screen).
- Responsive: below 900 px the sidebar becomes a top bar with a native `<dialog>` drawer,
  and tables turn into one card per row (each `td` needs `data-label`).
- `confirmDialog()` (`app/components/confirmDialog.tsx`) replaces `window.confirm`.

## The client portal

- `app/portal/(app)/layout.tsx` loads the signed-in user (`getPortalUser()`); project pages
  call `authorizeClientProject()` and answer `forbidden()` (403, enabled by
  `experimental.authInterrupts`) for another client's project and 404 for unknown ones.
- **Shared project view.** `ProjectView.tsx` renders the project for both the client and
  the admin preview (`/portal/preview/[projectId]`, read-only, links pointing at admin
  APIs).
- **Server-formatted data.** `app/lib/portal/present.ts` shapes everything a client may see
  (labels and dates already formatted in the viewer's language and time zone; no internal
  fields), used by the first render and by the portal GET APIs.
- **Live sections.** `LiveSections.tsx` polls `GET /api/portal/projects/[id]/updates` every
  15 seconds; each section (messages, files, activity, meetings, comments…) has a stamp,
  and only sections whose stamp changed are re-fetched.
- `TimeZoneSync` posts the browser's time zone once it differs from the stored one;
  `LanguageSwitch` posts to `/api/portal/locale`.
- Error boundaries (`app/portal/error.tsx`, the admin's `(dashboard)/error.tsx`) report
  browser-side crashes to `/api/errors`.
- Response headers for every portal path (`next.config.ts`): `X-Frame-Options: DENY`,
  `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` (invitation and reset
  URLs carry tokens).

## Server libraries

| Module | Responsibility |
| --- | --- |
| `app/lib/db.ts` | Prisma singleton (reused across dev reloads; longer transaction timeouts). |
| `app/lib/auth.ts` | HMAC-signed session tokens (Web Crypto, safe in the proxy). |
| `app/lib/session.ts` | Admin session helpers, same-origin check. |
| `app/lib/password.ts` | scrypt hashing for the admin password. |
| `app/lib/env.ts` | Startup check of required environment variables. |
| `app/lib/rateLimit.ts` | In-memory fixed-window limiter; client IP from `x-forwarded-for`. |
| `app/lib/email.ts`, `briefEmailHtml.ts`, `contactEmailHtml.ts`, `emailTheme.ts` | Resend client and the brief/contact notification emails. |
| `app/lib/projectBrief.ts`, `leads.ts` | Brief parsing and validation, request statuses, brief ↔ `Lead` mapping, `INBOX_EMAIL`. |
| `app/lib/monitoring.ts` | `reportError()`: problem log, alert email and webhook. |
| `app/lib/notices.ts` | Admin notifications feed and sidebar badges. |
| `app/lib/analyticsClient.ts`, `analyticsServer.ts` | Analytics beacons and aggregation. |
| `app/lib/seo.ts`, `site.ts`, `blog.ts` | Metadata, JSON-LD, site URL and profile constants, blog posts. |
| `app/lib/content/*` | The content system (above). |
| `app/lib/portal/*` | The portal domain: see [Portal internals](portal-internals.md#where-the-code-lives). |
