# Security policy

This repository holds the source of my portfolio site, its admin dashboard and
the client portal where clients follow their projects. Reports that help keep
client data safe are very welcome.

## Reporting a vulnerability

Please report privately. **Do not open a public issue or pull request** for a
security problem.

1. Preferred: on GitHub, open the **Security** tab of this repository and choose
   **Report a vulnerability** (private vulnerability reporting).
2. Or email **michealzakka@gmail.com** with the subject `Security: <short summary>`.

Please include:

- what is affected (page, API route or file) and what an attacker could do
- steps to reproduce, or a proof of concept
- whether you accessed, changed or kept any data that is not yours

I aim to acknowledge reports within 7 days and to keep you updated until the
issue is fixed. Please give me a reasonable time to fix it before disclosing it
publicly, and tell me if you would like to be credited.

## Scope

In scope: the live site and this code, including `/admin`, `/portal` and the
`/api` routes.

Out of scope: denial-of-service and volume testing, spam or social engineering,
reports from automated scanners with no demonstrated impact, and vulnerabilities
in third-party services themselves (Vercel, Supabase, Resend).

## Testing in good faith

Only use accounts you own or the local demo data from `npm run db:seed`. Do not
access, change or keep other people's data, and stop as soon as you reach data
that is not yours. I will not take action against research done in good faith
within these rules.

## Secrets in this repository

This repository is public. Secrets live only in `.env` (git-ignored) and in the
hosting provider's environment settings, never in code, docs or history.
`.env.example` lists the variable names with placeholder values. The pre-commit
hook in `.githooks/` (enable it with `npm run hooks:install`) refuses env files,
keys and database dumps, and scans staged changes with
[gitleaks](https://github.com/gitleaks/gitleaks) using `.gitleaks.toml`.
`npm run secrets:scan` scans the whole history.

If you find a secret in this repository or its history, report it as above: it
will be revoked and rotated, not just deleted.
