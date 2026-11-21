# Documentation

This repository is the source of [michael-zakka.com](https://michael-zakka.com): the
bilingual (English and Arabic) portfolio of Michael Zakka, a frontend developer, and the
small business system behind it. Visitors can browse case studies and send a project
brief. The operator turns briefs into priced proposals, and clients follow their
projects in a private, invite-only client portal.

The docs describe the code as of 20 November 2026 (commit `1369901`). If the code and a
doc disagree, the code is right: fix the doc in the same change.

## Pick your guide

| You are… | Start here |
| --- | --- |
| A reviewer, recruiter or prospective client who wants to know what the site does | [Site tour](tour.md) |
| A client following a project in the portal | [Client portal guide](client-guide.md) |
| The site operator, running requests, proposals and projects day to day | [Operator guide](operator/README.md) |
| A developer working on the code | [Developer guide](developer/README.md) |

## All pages

**For everyone (no code)**

- [Site tour](tour.md): the public site, how a project runs from first message to sign-off, privacy.
- [Client portal guide](client-guide.md): step-by-step help for clients.

**For the operator (no code)**

- [Operator guide](operator/README.md): signing in, every admin screen, daily routine, alerts.
- [Requests and proposals](operator/requests-and-proposals.md): from a brief to a signed proposal or a project.
- [Running a project](operator/running-projects.md): milestones, approvals, tasks, meetings, messages, files, clients, completion.
- [Editing the site's content](operator/content.md): the Content editor.
- [Troubleshooting](operator/troubleshooting.md): symptoms, causes and fixes.

**For developers**

- [Developer guide](developer/README.md): local setup, scripts, conventions.
- [Architecture](developer/architecture.md): how the app is put together.
- [Configuration](developer/configuration.md): every environment variable and config file.
- [Data model](developer/data-model.md): tables, relations, migrations.
- [API reference](developer/api.md): every route handler.
- [Portal internals](developer/portal-internals.md): auth, access control and the rules behind each portal feature.
- [Deployment and operations](developer/deployment.md): Vercel, Supabase, Blob, Resend, cron.
- [Security](developer/security.md): the security model and how secrets are kept out of the repo.
- [Testing](developer/testing.md): running the app against a throwaway database, the manual test plan.
- [Known issues and gotchas](developer/known-issues.md): traps already hit, open bugs, tech debt.

## Other documents

- [README](../README.md): project summary and quick start.
- [SECURITY.md](../SECURITY.md): how to report a vulnerability.
- [Manual test plan](qa/README.md): test cases per role. Written against commit `8c2c407`
  (4 November 2026), so it predates several features and changes; see
  [Testing](developer/testing.md#the-manual-test-plan) for what changed since.
- [LICENSE](../LICENSE): GNU Affero General Public License v3.0 (AGPL-3.0-only).
