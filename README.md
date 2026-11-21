# michael-zakka.com

The source of [michael-zakka.com](https://michael-zakka.com): the bilingual (English and
Arabic) portfolio of Michael Zakka, frontend developer, together with the business tools
behind it.

- **Public site.** Home page, project case studies, a five-step project brief ("Work with
  me") and a contact form. English at `/`, Arabic at `/ar`, with a full right-to-left
  layout rather than a translated copy.
- **Proposals.** Briefs become priced, versioned proposals with a private link, an expiry
  date and online acceptance that records exactly what was agreed.
- **Client portal (invite-only).** Progress, milestone approvals with change-request
  threads, meetings with calendar files, reminders and meeting notes, live messages with
  attachments, files, an activity timeline, and an end-of-project sign-off with a private
  review. In English and Arabic, with emails in each client's language.
- **Admin dashboard.** Request pipeline, proposals, projects, users, notifications,
  first-party analytics, a content editor for the whole portfolio, health checks and a
  problem log with alerts.

## Documentation

Everything is in [`docs/`](docs/README.md):

| For | Start with |
| --- | --- |
| Reviewers and prospective clients | [Site tour](docs/tour.md) |
| Clients | [Client portal guide](docs/client-guide.md) |
| The site operator | [Operator guide](docs/operator/README.md) |
| Developers | [Developer guide](docs/developer/README.md) |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules (no UI framework) ·
next-intl · Prisma 6 + PostgreSQL (Supabase) · zod · Resend · Vercel (hosting, Blob,
Cron, Analytics, Speed Insights) · MDX.

## Quick start

Requirements: Node.js 20.9+, a **development** PostgreSQL database (never production), and
[gitleaks](https://github.com/gitleaks/gitleaks) for the pre-commit hook.

```bash
npm install
cp .env.example .env        # fill in the five required values (see the file's comments)
npm run db:deploy           # apply migrations
npm run db:seed             # optional demo client and project
npm run hooks:install       # secret-scanning pre-commit hook
npm run dev
```

Site at <http://localhost:3000>, admin at `/admin-jfaygpory6/login`, portal at
`/portal/login`. The full walkthrough, scripts and conventions are in the
[developer guide](docs/developer/README.md); deployment is in
[Deployment and operations](docs/developer/deployment.md).

## Security

This repository is public. Secrets live only in `.env` (git-ignored) and in Vercel's
environment settings, never in code, docs or commits.

- `.env.example` is the template: variable names and placeholder values only.
- The pre-commit hook (`.githooks/pre-commit`, enabled with `npm run hooks:install`)
  refuses env files, keys, databases and dumps, and scans staged changes with gitleaks
  using the rules in `.gitleaks.toml`.
- `npm run secrets:scan` scans every commit on every branch.
- How the site protects client data: [Security](docs/developer/security.md).
- To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

Copyright (C) 2025-2026 Michael Zakka.

This repository is licensed under the [GNU Affero General Public License v3.0](LICENSE)
(AGPL-3.0-only). You may use, modify and share it, including commercially, but if you run
a modified version as a website or other network service, you must offer its users the
complete source code of that version under the same license.
