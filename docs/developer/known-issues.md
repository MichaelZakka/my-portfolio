# Known issues and gotchas

**For:** developers. Traps already hit (so they aren't hit again), open bugs, product
gaps, and tech debt, as of 20 November 2026. Remove entries when they are fixed.

- [Open bugs](#open-bugs)
- [Next.js 16.1 traps](#nextjs-161-traps)
- [CSS and layout](#css-and-layout)
- [Behaviour that surprises people (by design)](#behaviour-that-surprises-people-by-design)
- [Product gaps](#product-gaps)
- [Tech debt](#tech-debt)

## Open bugs

| Issue | Where | Fix |
| --- | --- | --- |
| Alert emails and webhooks link to `/admin/site#errors`, which 404s since the admin moved to `/admin-jfaygpory6`. | `app/lib/monitoring.ts` (`sendAlert`) | Use `/admin-jfaygpory6/site#errors`. |
| JSON-LD is serialised with plain `JSON.stringify`. Admin-entered project text containing `</script>` would end the script tag and inject markup into public pages. Only the admin can enter it, so the risk is low, but it is a stored-XSS path if the admin account is ever compromised. | `app/components/JsonLd.tsx` | Escape `<` as `<` in the serialised JSON. |
| The conversion rate (Overview) divides brief submissions by views of `/work-with-me` only; views of `/ar/work-with-me` aren't counted, so Arabic traffic inflates the rate. | `getConversionRate()` in `app/lib/analyticsServer.ts` | Count both paths. |
| The Site page's "Site URL" check says an unset `NEXT_PUBLIC_SITE_URL` falls back to "Vercel URL / localhost"; the code actually falls back to `https://michael-zakka.com`. | `app/admin-jfaygpory6/(dashboard)/site/page.tsx` | Correct the message. |
| Invitation and proposal pages open in the cookie or browser language on the first visit, not the invitee's known language, because the portal's root layout sets `<html lang dir>` before the page knows the token. Emails are unaffected. | `app/portal/layout.tsx` | Resolve the language from the token before rendering. |
| Accounts created before the email-language fix (18 November) may still have `locale = 'en'` although the client uses Arabic. | Data | Ask the client to switch once, or correct `User.locale`. |

## Next.js 16.1 traps

These are framework behaviours on Next.js 16.1.1. Re-test them after upgrading.

- **`router.refresh()` drops updates behind Suspense.** When a page streams behind a
  `loading.tsx` or `<Suspense>` boundary and the server answers within a few
  milliseconds (a fast database, production build), `router.refresh()` (and
  `router.replace` to the same URL) silently doesn't apply the update. It works under
  `next dev` and with more than ~50 ms latency, so it is easy to miss. Similar report:
  vercel/next.js#86055. Consequences in this codebase:
  - **No `loading.tsx` in the admin.** Any `loading.tsx` at `(dashboard)/` or above wraps
    every admin page. Adding one broke Site → Problems → Mark resolved. The navigation
    shimmer is client-side instead (`_components/AdminMain.tsx`), with its pending state in
    a `useSyncExternalStore` store because `useState` updates were swallowed by the
    router's speculative renders.
  - Screens that rely on `router.refresh()`: the request page (status, Accept, Proposal
    panels), Site (Problems), the proposal editor and workspace, and New project. Keyed
    in-page `<Suspense>` is only used on the Requests and Projects lists, which never
    refresh.
  - The project screens avoid `router.refresh()`: the portal keeps live sections in client
    state and re-reads the portal GET APIs; the admin re-reads
    `GET /api/admin/projects/[id]/view` through `ProjectViewContext.reload()`.
  - After upgrading Next.js, test "Mark resolved" with a `loading.tsx` in place before
    simplifying any of this.
- **`dynamicParams = false` + `revalidatePath` = NoFallbackError.** Pages revalidated after
  a content save then fail with 404/500 instead of rebuilding (the first content save
  404'd the whole site in testing). Keep `dynamicParams = true` on `[locale]/layout.tsx`,
  case studies and blog posts; unknown values still 404 through explicit checks.
- **No `generateMetadata` in `[locale]/not-found.tsx`.** It gets no params, so next-intl
  falls back to `headers()`, and a rebuilt page that calls `notFound()` then fails with
  "Page changed from static to dynamic" (500). 404 tabs show the layout's default title.
- **The middleware file is `proxy.ts`** (Next 16's name). A `middleware.ts` would conflict.
- **Server modules can't call functions from `'use client'` modules**: they only get client
  references. That is why tab ids live in `tabs.ts` next to `ProjectTabs.tsx` /
  `AdminProjectTabs.tsx`.
- **Prisma errors by code, not class.** In development (Turbopack) errors can come from
  another copy of the Prisma module, so check `error.code === 'P2021'` (missing table)
  rather than `instanceof`.

## CSS and layout

- Every `<section>` has `content-visibility: auto` with a 700 px intrinsic size (it speeds
  up the long home page). App screens must opt out (`.main section { content-visibility:
  visible }`), or off-screen cards render blank.
- Only `ul` has its list style reset, not `ol`. `.btn` has no disabled style.
- The global reset (`* { margin: 0 }`) pins a modal `<dialog>` to the top-left corner; it
  needs `margin: auto` (see `confirmDialog.module.css`).
- An absolutely positioned `.visually-hidden` inside a horizontal scroller escapes it
  unless an ancestor inside the scroller is positioned (it once widened every admin page
  to 549 px).
- Bar-chart fills made of `<span>` need `display: block`, or they never render.
- The admin `.shell` grid needs `grid-template-rows: auto 1fr`, or short screens stretch
  the top bar.
- Admin form fields are 16 px below 640 px wide; smaller text makes iOS zoom on focus.
- Admin tables become one card per row below 900 px: every `td` needs a `data-label`.

## Behaviour that surprises people (by design)

- **Typed or bookmarked visits to inner public pages go to the home page**
  (`typedVisitHome()` in `proxy.ts`, keyed on `Sec-Fetch-Site: none`). Clicks and external
  links work; crawlers are unaffected. If this is ever unwanted, remove that function.
- **Saving a Content part freezes it**: later edits to `data/*.ts` or the message files
  don't show for that part until "Reset to original" (section text is per key, so only
  changed keys freeze).
- **Content read errors other than a missing table throw**, so a failed regeneration
  keeps the last good page rather than publishing the code defaults.
- **Milestones become Done only through client approval**, so a project without clients
  can't reach 100%.
- **The portal is invite-only.** There is deliberately no sign-up or "request access"
  route; any new way to create a client account must require an admin-issued token.
- **Client reviews are private.** They are never published as testimonials.
- **Strings starting with `TODO`** are hidden in production on project and experience
  content.
- **Drafted blog posts** exist only in development.

## Product gaps

- The Work with me survey is English-only, also on `/ar` (there is a `TODO` in
  `app/[locale]/work-with-me/page.tsx`).
- The blog has two outline drafts, no published posts, English only, and no link from
  the site.
- Portfolio screenshots can't be uploaded from the admin (no public image storage);
  new projects get no cover image.
- No account deletion, email change, or data export for clients.
- No automatic reminder for clients who haven't answered the completion sign-off.
- Unclaimed direct uploads in `projects/<id>/incoming/` are never cleaned up.
- `GITHUB_URL` and `SOURCE_REPO_URL` in `app/lib/site.ts` are `null` (marked TODO), so
  GitHub and "view source" links stay hidden unless added in the Content editor.
- Proposal defaults (USD, 50% upfront / 50% before launch, 14 days validity, 2 revision
  rounds) were chosen as reasonable starting points and are editable per proposal; change
  them in code if your usual terms differ.
- `Lead.lastContactedAt` is accepted by `PATCH /api/admin/requests/[id]` but the request
  page has no field for it.

## Tech debt

- **No automated tests.**
- **Unused dependency:** `@supabase/supabase-js` (nothing imports it).
- **Unused components:** `app/components/Stats.tsx`, `app/components/CtaBand.tsx`.
- **Unused files:** `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`,
  `window.svg`, `me.jpg`; the PNG originals next to the WebP images in `app/assets/` (only
  the WebP files are imported); `app/assets/Michael.png` / `.webp`; and
  `app/assets/CV _ Michael zakka.pdf` (the served CV is `public/michael-zakka-cv.pdf`).
- **The admin path is a string literal in several files**; renaming it means a search and
  replace (see [Configuration](configuration.md#hard-coded-settings-worth-knowing)).
- **Admin CSS** partly uses hard-coded hex colours instead of the tokens.
- **`scripts/hash-password.mjs`** tells you to add the hash to `.env.local`; the rest of
  the docs use `.env` (both work for this variable, since only Next.js reads it).
- **`prisma/migrations-sqlite/`** is historical and could move out of the tree.
- **In-memory rate limits** (see [Security](security.md#known-limitations)).
