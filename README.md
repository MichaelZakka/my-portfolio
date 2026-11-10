# Modern Portfolio Website

A stunning, production-ready portfolio website built with Next.js 16, featuring a modern design with smooth animations and responsive layouts.

## 🎨 Design Features

- **Color Scheme:**
  - Primary: RGB(184, 174, 191) - Light purple/lavender
  - Secondary: RGB(65, 27, 94) - Deep purple
  - Accent: RGB(62, 84, 172) - Blue

- **Sections:**
  - Hero/Introduction with animated CTA buttons
  - About Me with personality highlights
  - Skills & Tech Stack with visual indicators
  - Professional Experience timeline
  - Featured Projects showcase
  - Education & Certifications
  - Services offered
  - Stats & Metrics with animated counters
  - Contact form
  - Social Media links in footer

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+ and npm
- A PostgreSQL database for development: a separate [Supabase](https://supabase.com) project, or a
  throwaway local one from `npx prisma dev`. **Never point your local `.env` at the
  production database**: migrations and the seed script write to it.
- [gitleaks](https://github.com/gitleaks/gitleaks) for the pre-commit secret scan:
  `winget install Gitleaks.Gitleaks` (Windows) or `brew install gitleaks` (macOS)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file from the template, then replace the placeholders:
   ```bash
   cp .env.example .env
   ```
   `.env.example` lists every variable with a short comment. Required:
   - `DATABASE_URL` and `DATABASE_URL_UNPOOLED`: pooled and direct Postgres URLs
   - `ADMIN_EMAIL`: the only account that can sign in at `/admin/login`
   - `ADMIN_PASSWORD_HASH`: run `npm run hash-password -- "your-strong-password"` and
     paste the printed value (never the password itself)
   - `AUTH_SECRET`: run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

   Everything else is optional (email, file storage, alerts, reminders). Use `.env`
   rather than `.env.local`: the Prisma CLI only reads `.env`. The server refuses to
   start while a required variable is missing or still a placeholder, and names it.
3. Apply the database migrations:
   ```bash
   npm run db:deploy
   ```
4. Optional demo data (prints the demo client's login): `npm run db:seed`
5. Enable the secret-scanning pre-commit hook, once per clone:
   ```bash
   npm run hooks:install
   ```
6. Start the dev server and open [http://localhost:3000](http://localhost:3000)
   (admin at `/admin/login`, client portal at `/portal/login`):
   ```bash
   npm run dev
   ```

### Build for Production

```bash
npm run build
npm start
```

On Vercel the build runs `npm run vercel-build` (migrations, then `next build`). Set
the same variables in Vercel → Project → Settings → Environment Variables, for
Production and Preview. See `DEPLOYMENT.md`.

## 📝 Customization Guide

### Personal Information

#### 1. Hero Section (`app/components/Hero.tsx`)
- Line 24-25: Update name ("John Doe")
- Line 26: Update professional title
- Line 27-29: Update tagline

#### 2. About Section (`app/components/About.tsx`)
- Lines 9-27: Update personal background and expertise paragraphs
- Lines 30-45: Customize personality highlights

#### 3. Skills Section (`app/components/Skills.tsx`)
- Lines 6-49: Update skills and proficiency levels (0-100)
- Add or remove skill categories as needed

#### 4. Experience Section (`app/components/Experience.tsx`)
- Lines 6-57: Update work history
  - Company names
  - Job titles
  - Duration
  - Key achievements

#### 5. Projects Section (`app/components/Projects.tsx`)
- Lines 6-77: Update project information
  - Project titles and descriptions
  - Technologies used
  - Live demo and GitHub URLs
  - Replace emoji with actual project images

#### 6. Education Section (`app/components/Education.tsx`)
- Lines 6-24: Update degrees and institutions
- Lines 26-55: Update certifications

#### 7. Services Section (`app/components/Services.tsx`)
- Lines 6-78: Customize services offered
  - Service titles and descriptions
  - Features for each service

#### 8. Stats Section (`app/components/Stats.tsx`)
- Lines 11-30: Update statistics
  - Years of experience
  - Projects completed
  - Happy clients
  - Technologies mastered

#### 9. Contact Section (`app/components/Contact.tsx`)
- Lines 50-66: Update contact information
  - Email address
  - Phone number
  - Location

#### 10. Footer (`app/components/Footer.tsx`)
- Lines 62-64: Update name and tagline
- Lines 10-63: Update social media URLs
  - LinkedIn
  - GitHub
  - Twitter
  - Stack Overflow
  - Email

#### 11. Metadata (`app/layout.tsx`)
- Lines 5-18: Update SEO information
  - Page title
  - Description
  - Keywords
  - Author name

### Adding Your Photo

Replace the placeholder avatar in `app/components/Hero.tsx`:

1. Add your photo to the `public` folder (e.g., `public/profile.jpg`)
2. In `Hero.tsx`, replace lines 35-47 with:

```tsx
<Image
  src="/profile.jpg"
  alt="Your Name"
  width={350}
  height={350}
  priority
  className={styles.profileImage}
/>
```

3. Add this CSS to `Hero.module.css`:

```css
.profileImage {
  border-radius: 50%;
  object-fit: cover;
}
```

### Adding Project Images

For project cards in `app/components/Projects.tsx`:

1. Add project images to `public/projects/` folder
2. Replace the emoji `image` property with:

```tsx
image: '/projects/project-name.jpg'
```

3. Update the component to use Next.js Image component

### Customizing Colors

Update colors throughout by searching and replacing these RGB values:

- `rgb(184, 174, 191)` - Light purple (primary)
- `rgb(65, 27, 94)` - Deep purple (secondary)
- `rgb(62, 84, 172)` - Blue (accent)

## 🛠️ Tech Stack

- **Framework:** Next.js 16.1.1
- **Language:** TypeScript
- **Styling:** CSS Modules
- **Icons:** SVG inline icons
- **Font:** System fonts for optimal performance

## 📱 Responsive Design

The portfolio is fully responsive and optimized for:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## ✨ Features

- ✅ Sticky navigation with smooth scroll
- ✅ Animated section transitions
- ✅ Hover effects and micro-animations
- ✅ Animated statistics counters
- ✅ Contact form (ready for backend integration)
- ✅ SEO optimized
- ✅ Accessible (WCAG compliant)
- ✅ Performance optimized
- ✅ No external dependencies for styling

## 🔧 Form Integration

The contact form (`app/components/Contact.tsx`) is ready for integration. To connect it:

### Option 1: Email Service (e.g., EmailJS)

```bash
npm install @emailjs/browser
```

Update `handleSubmit` function with EmailJS configuration.

### Option 2: API Route

Create `app/api/contact/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const data = await request.json();
  // Handle email sending logic
  return NextResponse.json({ success: true });
}
```

### Option 3: Third-party Services

- Formspree
- Netlify Forms
- Getform

## 🔐 Admin Dashboard

A private dashboard at `/admin` shows incoming project requests, first-party
visitor analytics, and a site health/content snapshot. It's for a single
admin (you) — there's no public sign-up.

### Setup

Follow **Setup** under Getting Started above, then sign in at
`http://localhost:3000/admin/login` with `ADMIN_EMAIL` and the password behind
`ADMIN_PASSWORD_HASH`. Set `RESEND_API_KEY` (and a verified `RESEND_FROM_EMAIL`)
to receive notification emails.

### How it works

- **Requests** (`/admin/requests`): every submission from the `/work-with-me`
  survey is saved to the database first (source of truth), then a
  notification email is sent via Resend as a backup. If the email fails,
  the lead is still saved — the failure is logged on the request
  (`emailSent` / `emailError`) and visible on its detail page. Click into a
  request to see every survey field, brand colors, change its status
  (`new → contacted → qualified → proposal → won/lost/archived`), add
  private notes, or use the quick actions to email/WhatsApp the client.
- **Analytics** (`/admin/visitors`) and the **Overview** (`/admin`): the
  public site sends lightweight, cookie-free page-view and event beacons to
  `/api/analytics` (path, referrer, UTM params, a random per-tab session id,
  and a coarse device type parsed from the User-Agent — no fingerprinting).
  These populate the traffic chart, top pages/referrers, device breakdown,
  CTA click breakdown, and the Home → Work-with-me → Survey funnel. Data
  starts appearing as soon as visitors browse the live site.
- **Site** (`/admin/site`): a read-only snapshot of content counts (projects,
  services) and config health checks (is the DB connected? is
  `RESEND_API_KEY` set? is analytics collecting data?).

### Notes

- `/admin/*` is excluded from `sitemap.xml` and disallowed in `robots.txt`,
  and all admin pages are `noindex`.
- Auth is a lightweight signed-cookie session (no third-party auth
  dependency) — see `app/lib/auth.ts` and `proxy.ts`.
- The database is Postgres (Supabase in production); migrations live in
  `prisma/migrations` and run on every Vercel deploy. See `DEPLOYMENT.md`.

## 🔒 Security

This repository is public. Secrets live only in `.env` (git-ignored) and in
Vercel's environment settings, never in code, docs or commits.

- `.env.example` is the template: variable names and placeholder values only.
- The pre-commit hook (`.githooks/pre-commit`, enabled with
  `npm run hooks:install`) refuses env files, keys, databases and dumps, and
  scans staged changes with gitleaks using the rules in `.gitleaks.toml`.
- `npm run secrets:scan` scans every commit on every branch.
- To report a vulnerability, see [SECURITY.md](SECURITY.md).

## 📄 License

Copyright (C) 2025-2026 Michael Zakka.

This repository is licensed under the [GNU Affero General Public License v3.0](LICENSE)
(AGPL-3.0-only). You may use, modify and share it, including commercially, but if
you run a modified version as a website or other network service, you must offer
its users the complete source code of that version under the same license.

## 🤝 Support

For questions or issues, please open an issue on the repository.

---

**Made with ❤️ using Next.js**
