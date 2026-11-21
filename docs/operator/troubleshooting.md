# Troubleshooting

**For:** the site operator. Common problems, what causes them, and what to do. Start with
**Site** in the admin dashboard: its health checks and problem log explain most failures.

## Emails

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| No emails go out at all | `RESEND_API_KEY` missing, or the sender domain isn't verified in Resend. | Site → **Resend email** check. In Resend, verify the domain used by `RESEND_FROM_EMAIL`. Without a verified domain, Resend only delivers to the Resend account's own address. |
| A client says the invitation never arrived | Spam folder, a typo in the address, or a delivery failure. | Check the Clients tab (a failed send says "Not sent") and Site → Problems. **Resend** issues a new link; you can also copy the link shown after sending and send it by WhatsApp or email yourself. |
| A request arrived but no brief email | The email failed after the brief was saved. | Nothing is lost: the request is in **Requests**, and its page shows the email error. |
| A client's emails come in the wrong language | Their account language is wrong (older accounts may still have English saved). | Ask them to switch the language once in the portal while signed in. It is saved to their account. |
| Alert email's "Details" link shows "page not found" | Known bug: the link uses the old `/admin/site` address. | Open **Site** from the dashboard. |

## Client access

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| "Invitation has expired" | Links last 7 days. | **Resend** on the Clients tab, or **Send a new link** on the user's page. |
| "This invitation was withdrawn" | It was revoked, or replaced by a newer invitation. | Send a new one. Only the newest link works. |
| Client can't sign in | Wrong password, or too many attempts (10 per 5 minutes per network, 10 per 15 minutes per email). | Ask them to wait a few minutes, then use **Forgot password**. Check **Users** for their status: an account without a password has never accepted its invitation. |
| Client sees "forbidden" or "not found" for a project | They aren't (or no longer are) a member. | Invite them again from the project's Clients tab. |
| Client is signed out unexpectedly | Sessions last 7 days; password changes, resets and "sign out everywhere" end other sessions. | Normal. If you changed `AUTH_SECRET`, everyone was signed out. |
| Someone asks how to sign up | The portal is invite-only by design. | Invite them to their project. |

## Proposals and projects

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Client says the proposal link doesn't work | It expired, was replaced by a newer version, or the link was resent (old links stop working). | Use **Resend link** on the latest version, or send the newest version's email. |
| "This request was already converted" | A request becomes at most one project. | Open its project from the request page. |
| Can't edit a sent proposal | Sent versions are locked so the client accepts exactly what they saw. | **Revise as version N**, then send it. |
| Progress is stuck at 99% | The bar shows 100% only when every milestone is approved by a client. | Ask for approval on the remaining milestones. A project with no client can't reach 100%. |
| Can't mark a milestone Done | Done comes only from the client's approval. | Ask the client to approve it. |
| Can't add a milestone with that due date | A new milestone's due date must be after every existing due date. | Pick a later date, or add it without a date and reorder. |
| Meeting reminders don't arrive | `CRON_SECRET` not set, the meeting isn't confirmed, it was confirmed less than 6 hours before the job ran, or the project is archived. | Check the variable in Vercel and the cron job in Vercel → Project → Cron Jobs. |
| An upload fails | Wrong type, too large, content doesn't match the extension, or file storage isn't configured. | Check the allowed types and limit. If every upload fails, Site → Problems shows a storage error; file storage needs `BLOB_READ_WRITE_TOKEN` in Vercel. |
| A file says "no longer available" | Its stored bytes are missing. | Site → Problems has the details. Ask for the file again. |

## The public site

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Typing or bookmarking a case-study address opens the home page | By design: inner pages open from links (on the site, search engines, LinkedIn, email), while typed or bookmarked visits go to the home page of that language. | Share links normally; they work when clicked. |
| A content edit doesn't show | The page rebuilds on the first visit after a save. | Reload once. Check the editor says "All changes saved". |
| The blog isn't on the site | No post is published yet (all posts are drafts), and nothing links to it. | A developer sets `draft: false` on a finished post. |
| The intro animation doesn't play | It plays once per browser tab, and never with "reduce motion" turned on. | Open a new tab to see it again. |

## The admin dashboard

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| A screen didn't update after an action | A known quirk of the framework version in use. | Reload the page. The project screens re-read their own data to avoid this. |
| "Admin auth is not configured" | `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` or `AUTH_SECRET` is missing in Vercel. | Set them for Production and Preview, then redeploy. |
| Forgot the admin password | It is not stored anywhere readable. | Generate a new hash with `npm run hash-password -- "new password"`, put it in `ADMIN_PASSWORD_HASH` in Vercel, redeploy. |

## The whole site is down

1. Check `https://michael-zakka.com/api/health`: `"database": "down"` (503) means the
   site runs but can't reach the database.
2. Check the Vercel dashboard (latest deployment, function logs) and the Supabase dashboard
   (project paused, connection limits).
3. A deployment fails if its database migration fails; the previous deployment keeps
   serving in that case.
4. A server missing a required setting refuses to start and names the setting in the
   Vercel logs. See [Configuration](../developer/configuration.md).

For anything deeper, see [Known issues](../developer/known-issues.md) and
[Deployment and operations](../developer/deployment.md).
