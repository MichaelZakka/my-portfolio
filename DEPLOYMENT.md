# Deployment Guide

This guide covers deploying your portfolio to various hosting platforms.

## 🧩 Client portal in production

The client portal (`/portal` for clients, `/admin/projects` for you) needs four
things in production that local development fakes: a real database, private file
storage, email, and the auth secret. Everything below assumes Vercel.

### 1. Switch Prisma from SQLite to Postgres

SQLite is a local file; Vercel's filesystem is read-only and per-instance, so
production needs a managed Postgres (Neon, Supabase, or Postgres from the Vercel
Marketplace). The schema was written for both providers (enum-like fields are
validated strings, list fields are JSON text), so only the provider changes.

Migrations are provider-specific, though: the files in `prisma/migrations` are
SQLite SQL and cannot be replayed on Postgres. Create a Postgres baseline once:

1. Create the database and copy its connection string. For serverless, use the
   **pooled** URL as `DATABASE_URL` and the **direct** URL as `DIRECT_URL`, and add
   `directUrl = env("DIRECT_URL")` under `url` in the `datasource` block.
2. In `prisma/schema.prisma`, set `provider = "postgresql"`.
3. Keep the SQLite history for reference and start a Postgres one:
   ```bash
   git mv prisma/migrations prisma/migrations-sqlite
   # with DATABASE_URL / DIRECT_URL pointing at an empty development Postgres database:
   npx prisma migrate dev --name init
   ```
   This writes `prisma/migrations/<timestamp>_init` and a `migration_lock.toml`
   with `provider = "postgresql"`. Commit both.
4. Apply it to production: `npm run db:deploy` (runs `prisma migrate deploy`)
   with the production `DATABASE_URL`, or set Vercel's build command to
   `prisma migrate deploy && next build`. `prisma generate` already runs on
   `postinstall`.
5. Existing SQLite data (leads, analytics) is not copied automatically. Export
   what you need (for example with `npx prisma studio` or a small script) before
   switching.
6. From then on, develop against Postgres too (a Neon dev branch or local
   Postgres): one schema cannot point at both providers at once.

### 2. Files: private Vercel Blob

Create a Blob store in Vercel → **Storage**, and connect it to the project; Vercel
adds `BLOB_READ_WRITE_TOKEN`. With that token present the portal stores new
uploads in Blob automatically (or set `STORAGE_DRIVER=vercel-blob`).

- Blobs are written with `access: "private"`. The browser never receives a blob
  URL: downloads stream through `/api/portal/projects/[id]/files/[fileId]` (members
  only, files shared with the client) and `/api/admin/projects/[id]/files/[fileId]`.
- Each file records which driver stored it, so older local files stay readable if
  you switch drivers, and the `local` driver is refused on Vercel (uploads answer
  503 rather than writing to a disposable disk).
- Vercel Functions reject request bodies over 4.5 MB, so `PORTAL_MAX_UPLOAD_MB`
  defaults to 4. Larger files would need direct client-to-Blob uploads.
- Allowed types: PDF, PNG, JPEG, GIF, WebP, ZIP, DOCX, XLSX, PPTX, TXT, CSV. The
  type comes from the extension and is checked against the file's leading bytes;
  downloads are always sent as attachments with `nosniff`.
- After connecting the store, upload and download one file on a preview
  deployment to confirm the token works.

### 3. Email (Resend)

- Verify your domain in Resend and set `RESEND_FROM_EMAIL` to an address on it.
  Without a verified domain, Resend's test sender only delivers to your own
  Resend account address (that is why earlier test invitations failed).
- Set `NEXT_PUBLIC_SITE_URL` to the canonical production URL. Invitation and
  password-reset links are built from it, never from the request's Host header.
- `PORTAL_NOTIFY_EMAIL` is where a client's new message is sent (defaults to the
  inbox in `app/lib/projectBrief.ts`). Your messages and status changes are
  emailed to each client with access, in the language they use the portal in.
- Every send is recorded like `Lead.emailSent/emailError`: on the invitation,
  the reset token, the message, or (for status changes) the activity entry. The
  admin project screen shows failures.
- Without `RESEND_API_KEY` nothing is sent. In development the invitation and
  reset links are printed to the server console instead. In any environment the
  admin sees a copyable invitation link right after creating or resending one.

### 4. Auth and security

- `AUTH_SECRET` (32+ random characters) signs both admin and portal session
  cookies. Portal tokens are signed over a separate prefix, so a client's cookie
  can never verify as an admin session. Rotating the secret signs everyone out.
- `proxy.ts` gates `/portal` and `/api/portal` (fail closed, like `/admin`), and
  every portal page and API route re-checks the session and project membership on
  the server: another client's project answers 403, an unknown one 404.
- Client passwords are bcrypt; invitation and reset tokens are 256-bit random
  values stored only as SHA-256 hashes. Invitations expire after 7 days, reset
  links after 60 minutes and work once; a password reset signs out all other
  sessions.
- Sign-in, password reset and invitation endpoints are rate-limited per IP (and
  per email for sign-in and reset). Like the existing admin limiter this is
  in-memory per instance; use a shared store (e.g. Upstash Redis) for strict limits.
- Next.js 16.1.1 has published security advisories, including proxy-bypass
  issues; upgrading to 16.4.1 or later is recommended. The portal does not rely
  on `proxy.ts` alone, but the rest of the site does for `/admin`.
- On 16.1.1, `router.refresh()` can skip applying a refresh whose response
  arrives within a few milliseconds, so the project screens re-read their own
  APIs after each change instead. Re-test with plain `router.refresh()` after
  upgrading if you want to simplify them.

### 5. Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` (+ `DIRECT_URL`) | everything | Postgres in production (see step 1) |
| `AUTH_SECRET` | admin + portal | 32+ random characters |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | admin | unchanged; the admin also authors portal messages |
| `NEXT_PUBLIC_SITE_URL` | portal emails | canonical URL used in invite/reset links |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | portal emails | verified domain sender |
| `PORTAL_NOTIFY_EMAIL` | optional | where clients' messages are emailed |
| `PORTAL_TIME_ZONE` | optional | IANA zone for timestamps, default `UTC` |
| `PORTAL_MAX_UPLOAD_MB` | optional | default 4 (Vercel body limit 4.5 MB) |
| `BLOB_READ_WRITE_TOKEN` | portal files | added by connecting a Vercel Blob store |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR` | optional | `local` / `vercel-blob`; local folder (dev) |

### 6. Demo data

`npm run db:seed` creates the admin identity row, a demo client
(`client@example.com` / `portal-demo-2026`, overridable with `SEED_CLIENT_EMAIL`
and `SEED_CLIENT_PASSWORD`) and a project with milestones, tasks and a message. It
refuses to run when `NODE_ENV=production`. Never seed a production database with
the demo password.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is made by the creators of Next.js and offers the best integration.

#### Steps:

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/portfolio.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your repository
   - Click "Deploy"
   - Done! Your site is live

#### Custom Domain (Optional):
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

**Pros:**
- ✅ Automatic deployments on git push
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Zero configuration
- ✅ Excellent performance

**Cost:** Free for personal projects

---

### Option 2: Netlify

Another excellent option with great features.

#### Steps:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login
   - Drag and drop the `.next` folder
   - Or connect your GitHub repo

#### Configuration:
Create `netlify.toml` in root:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Pros:**
- ✅ Easy drag-and-drop deployment
- ✅ Form handling built-in
- ✅ Free SSL
- ✅ Continuous deployment

**Cost:** Free for personal projects

---

### Option 3: GitHub Pages (Static Export)

For a completely static version.

#### Steps:

1. **Update `next.config.ts`:**
   ```typescript
   const nextConfig = {
     output: 'export',
     images: {
       unoptimized: true,
     },
   };
   
   export default nextConfig;
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   - Install gh-pages:
     ```bash
     npm install --save-dev gh-pages
     ```
   
   - Add to `package.json` scripts:
     ```json
     "deploy": "gh-pages -d out"
     ```
   
   - Deploy:
     ```bash
     npm run deploy
     ```

4. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: gh-pages branch
   - Save

**Pros:**
- ✅ Completely free
- ✅ Simple hosting
- ✅ Good for static portfolios

**Cons:**
- ❌ No server-side features
- ❌ Requires static export

---

### Option 4: AWS Amplify

For AWS users.

#### Steps:

1. **Install Amplify CLI:**
   ```bash
   npm install -g @aws-amplify/cli
   ```

2. **Initialize:**
   ```bash
   amplify init
   ```

3. **Add hosting:**
   ```bash
   amplify add hosting
   ```

4. **Deploy:**
   ```bash
   amplify publish
   ```

**Pros:**
- ✅ AWS integration
- ✅ Scalable
- ✅ Full AWS features

**Cost:** Pay as you go (free tier available)

---

### Option 5: Railway

Modern deployment platform.

#### Steps:

1. **Push to GitHub** (if not already done)

2. **Deploy:**
   - Go to [railway.app](https://railway.app)
   - Sign up/login
   - New Project → Deploy from GitHub
   - Select your repository
   - Railway auto-detects Next.js
   - Deploy

**Pros:**
- ✅ Simple deployment
- ✅ Free tier available
- ✅ Great developer experience

**Cost:** Free tier with $5 credit/month

---

### Option 6: DigitalOcean App Platform

For more control.

#### Steps:

1. **Push to GitHub**

2. **Deploy:**
   - Go to [digitalocean.com](https://digitalocean.com)
   - Create App
   - Connect GitHub
   - Select repository
   - Configure:
     - Build Command: `npm run build`
     - Run Command: `npm start`
   - Deploy

**Pros:**
- ✅ More control
- ✅ Scalable
- ✅ Good documentation

**Cost:** Starting at $5/month

---

## 🔧 Pre-Deployment Checklist

Before deploying, ensure you've completed:

### Content
- [ ] Updated all personal information
- [ ] Added your photo
- [ ] Updated all projects with real links
- [ ] Verified all social media links
- [ ] Updated contact information
- [ ] Proofread all text

### Technical
- [ ] Tested locally (`npm run dev`)
- [ ] Built successfully (`npm run build`)
- [ ] No console errors
- [ ] All images optimized
- [ ] All links work
- [ ] Mobile responsive
- [ ] Contact form configured (if using)

### SEO
- [ ] Updated metadata in `layout.tsx`
- [ ] Added proper page title
- [ ] Added meta description
- [ ] Added keywords
- [ ] Verified OpenGraph data

### Performance
- [ ] Optimized images
- [ ] Removed unused code
- [ ] Tested load time
- [ ] Checked Lighthouse score

---

## 🌐 Custom Domain Setup

### For Vercel:

1. **Buy domain** (Namecheap, GoDaddy, Google Domains, etc.)

2. **Add to Vercel:**
   - Project Settings → Domains
   - Add your domain

3. **Configure DNS:**
   - Add A record: `76.76.21.21`
   - Add CNAME: `cname.vercel-dns.com`

### For Netlify:

1. **Add domain:**
   - Site Settings → Domain Management
   - Add custom domain

2. **Configure DNS:**
   - Use Netlify DNS (easiest)
   - Or point to Netlify's servers

---

## 📊 Analytics Setup (Optional)

### Google Analytics

1. **Get tracking ID** from [analytics.google.com](https://analytics.google.com)

2. **Add to `layout.tsx`:**
   ```tsx
   <Script
     src={`https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID`}
     strategy="afterInteractive"
   />
   <Script id="google-analytics" strategy="afterInteractive">
     {`
       window.dataLayer = window.dataLayer || [];
       function gtag(){dataLayer.push(arguments);}
       gtag('js', new Date());
       gtag('config', 'GA_MEASUREMENT_ID');
     `}
   </Script>
   ```

### Vercel Analytics

1. **Install:**
   ```bash
   npm install @vercel/analytics
   ```

2. **Add to `layout.tsx`:**
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   
   // In return statement:
   <Analytics />
   ```

---

## 🔒 Environment Variables

> For this project specifically (database, admin auth, Resend), see the
> **Admin Dashboard** section in `README.md` and `.env.example` for the full
> list of required variables.

If you need environment variables (for API keys, etc.):

### Local Development:
Create `.env.local`:
```env
NEXT_PUBLIC_API_KEY=your_key_here
EMAIL_SERVICE_KEY=your_key_here
```

### Production (Vercel):
1. Project Settings → Environment Variables
2. Add variables
3. Redeploy

### Production (Netlify):
1. Site Settings → Environment Variables
2. Add variables
3. Redeploy

---

## 🐛 Common Deployment Issues

### Issue: Build fails
**Solution:**
- Check for TypeScript errors: `npm run build`
- Ensure all imports are correct
- Check for missing dependencies

### Issue: Images not loading
**Solution:**
- Ensure images are in `public` folder
- Use correct paths (starting with `/`)
- For static export, use `unoptimized: true` in next.config

### Issue: Links not working
**Solution:**
- Use relative paths
- Check for typos in hrefs
- Ensure all pages exist

### Issue: Styles not applying
**Solution:**
- Check CSS module imports
- Verify class names match
- Clear build cache: `rm -rf .next`

---

## 🔄 Continuous Deployment

### Automatic Deployments:

Most platforms support automatic deployment on git push:

1. **Connect repository** to hosting platform
2. **Configure build settings**
3. **Push to main branch**
4. **Automatic deployment** triggers

### Branch Deployments:

Create preview deployments for branches:

**Vercel:**
- Automatic for all branches
- Each branch gets a unique URL

**Netlify:**
- Deploy Previews for pull requests
- Branch deploys for specific branches

---

## 📈 Post-Deployment

After deployment:

1. **Test everything:**
   - All pages load
   - All links work
   - Forms submit
   - Mobile responsive
   - Different browsers

2. **Check performance:**
   - Run Lighthouse audit
   - Test load times
   - Check mobile performance

3. **Monitor:**
   - Set up analytics
   - Monitor error logs
   - Track visitor metrics

4. **Share:**
   - Update LinkedIn
   - Share on Twitter
   - Add to resume
   - Submit to directories

---

## 🎯 Recommended: Vercel

For this Next.js portfolio, **Vercel** is the recommended choice because:

1. ✅ Made by Next.js creators
2. ✅ Zero configuration
3. ✅ Automatic optimizations
4. ✅ Free for personal use
5. ✅ Excellent performance
6. ✅ Easy custom domains
7. ✅ Automatic SSL
8. ✅ Global CDN

### Quick Vercel Deploy:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# Done!
```

---

## 📞 Need Help?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

**Your portfolio is ready to deploy! Good luck! 🚀**

