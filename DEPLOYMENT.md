# Deployment Guide

This guide covers deploying your portfolio to various hosting platforms.

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

