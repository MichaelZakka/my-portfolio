# Developer guide

**For:** developers working on the code. Start here, then follow the links.

The repository is one Next.js 16 (App Router) application with three areas, sharing one
database:

| Area | URL | Code |
| --- | --- | --- |
| Public portfolio (English and Arabic) | `/`, `/ar`, `/projects/[slug]`, `/work-with-me`, `/blog` | `app/[locale]/`, `app/components/` |
| Admin dashboard (single admin) | `/admin-jfaygpory6` | `app/admin-jfaygpory6/` |
| Client portal (invite-only) | `/portal` | `app/portal/` |
| JSON APIs for all three | `/api/*` | `app/api/` |

**Stack:** Next.js 16.1.1, React 19.2, TypeScript (strict), CSS Modules (no Tailwind, no UI
kit), next-intl 4, Prisma 6 with PostgreSQL (Supabase in production), zod 4, Resend
(email), Vercel Blob (private files), Vercel Cron, Vercel Analytics and Speed Insights,
lucide-react icons, MDX for the blog.

## Guides

- [Architecture](architecture.md): request flow, folders, rendering, i18n, content system, design system.
- [Configuration](configuration.md): environment variables, scripts, config files.
- [Data model](data-model.md): every table, its rules, and how migrations work.
- [API reference](api.md): every route handler, its auth and purpose.
- [Portal internals](portal-internals.md): sessions, access control, and the rules behind proposals, milestones, meetings, messages, files, notifications and completion.
- [Deployment and operations](deployment.md): Vercel, Supabase, Blob, Resend, cron, monitoring.
- [Security](security.md): the security model and the secret-scanning setup.
- [Testing](testing.md): running everything against a throwaway database; the manual test plan.
- [Known issues and gotchas](known-issues.md): read before changing routing, caching or admin screens.

## Local setup

### Prerequisites

- **Node.js 20.9 or newer** and npm.
- **A PostgreSQL database for development**: a separate Supabase project, or a throwaway
  local one from `npx prisma dev` (see [Testing](testing.md#a-throwaway-local-database)).
  **Never point your local `.env` at the production database**: `db:migrate`,
  `db:deploy` and `db:seed` write to whatever `DATABASE_URL` points at.
- **gitleaks**, for the pre-commit secret scan: `winget install Gitleaks.Gitleaks`
  (Windows) or `brew install gitleaks` (macOS).

### Steps

1. Install dependencies (this also runs `prisma generate`):
   ```bash
   npm install
   ```
2. Create `.env` from the template and fill in the required values:
   ```bash
   cp .env.example .env
   ```
   Required: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD_HASH`. Generate the hash with
   `npm run hash-password -- "your-password"` and the secret with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   For local portal links set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Use `.env`,
   not `.env.local`: the Prisma CLI only reads `.env`. Every variable is described in
   [Configuration](configuration.md).
3. Apply the migrations:
   ```bash
   npm run db:deploy
   ```
4. Optional demo data: a demo client and project. The script prints the client's
   password (or set `SEED_CLIENT_PASSWORD`). Re-running it replaces the demo project.
   ```bash
   npm run db:seed
   ```
5. Enable the secret-scanning pre-commit hook (once per clone):
   ```bash
   npm run hooks:install
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```
   - Site: <http://localhost:3000> (Arabic at `/ar`)
   - Admin: <http://localhost:3000/admin-jfaygpory6/login> (`ADMIN_EMAIL` + your password)
   - Portal: <http://localhost:3000/portal/login> (the seeded `client@example.com`)

Without `RESEND_API_KEY` no email is sent; in development, invitation and password-reset
links are printed to the server console instead. Uploads go to `.uploads/` on disk
(git-ignored) unless a Blob token is set.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. `next build` needs no secrets; `next start` refuses to start without the required variables. |
| `npm run vercel-build` | What Vercel runs: `prisma migrate deploy && next build`. |
| `npm run lint` | ESLint (`eslint-config-next` core-web-vitals + TypeScript). |
| `npm run db:migrate` | `prisma migrate dev`: create a migration from schema changes (development database only). |
| `npm run db:deploy` | `prisma migrate deploy`: apply pending migrations. |
| `npm run db:studio` | Prisma Studio, a table browser. |
| `npm run db:seed` | Demo admin row, client and project (`prisma/seed.mjs`). Refuses to run with `NODE_ENV=production`. |
| `npm run hash-password -- "pw"` | Prints an `ADMIN_PASSWORD_HASH` value (scrypt `salt:hash`). |
| `npm run hooks:install` | Points git at `.githooks/` (pre-commit secret guard). |
| `npm run secrets:scan` | gitleaks over the whole git history, values redacted. |

There is no automated test suite; see [Testing](testing.md) for how changes are checked.

## Conventions

- **Middleware is `proxy.ts`** (the Next.js 16 name). Never add a `middleware.ts`.
- **CSS Modules only**, using the design tokens in `app/globals.css` and logical
  properties (`margin-inline-start`, `inset-inline-end`…) so layouts mirror in Arabic.
  Directional icons get the global `.flip-rtl` class.
- **Public text is a message key** in `messages/en.json` and `messages/ar.json`, which also
  makes it editable in the admin's Content editor. New list fields in the portfolio need
  `schema.ts`, `defaults.ts`, `portfolio.ts` and the editor (see
  [Architecture](architecture.md#the-content-system)).
- **Enum-like columns are strings** validated in code; allowed values live in
  `app/lib/portal/constants.ts` (and `app/lib/leads.ts` for request statuses).
  List-like columns are JSON text.
- **Every API input goes through zod** (`app/lib/portal/validation.ts`,
  `app/lib/content/schema.ts`); portal API errors use `apiError()` with a stable `code`
  the portal translates (`portal.errors.<code>`).
- **Check access on the server, every time**: `requireAdminSession()` in every admin page,
  `authorizeAdmin*()` / `authorizeClientProject()` in every route. `proxy.ts` is only the
  first gate.
- **Format dates on the server** in the viewer's time zone (`app/lib/portal/format.ts`),
  so client components get plain strings and hydration never mismatches.
- **New tables enable row-level security** in their migration (see
  [Data model](data-model.md#migrations)).
- **Don't add `loading.tsx`** above admin pages that call `router.refresh()`, and don't set
  `dynamicParams = false` on public pages. See [Known issues](known-issues.md).
- Imports are relative; the `@/*` alias exists in `tsconfig.json` but isn't used.

## Before you push

1. `npm run lint` and `npm run build` pass.
2. Schema changes come with a migration in `prisma/migrations/` (and RLS for new tables).
3. You tested the changed screens in both languages, and on a phone width.
4. The pre-commit hook ran (it refuses env files, databases and dumps, and runs gitleaks).
5. Vercel builds every push; pushes to the production branch (`master`) go live, and their
   migrations run against the production database first.
