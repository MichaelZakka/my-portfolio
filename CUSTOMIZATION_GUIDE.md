# Quick Customization Guide

This guide helps you quickly customize your portfolio with your own information.

## 🎯 Essential Updates (Do These First!)

### 1. Personal Name & Title
**File:** `app/components/Hero.tsx`
- **Line 24-25:** Change "John Doe" to your name
- **Line 26:** Update your professional title
- **Line 27-29:** Write your personal tagline

**File:** `app/components/Footer.tsx`
- **Line 63:** Update name
- **Line 64-66:** Update tagline

**File:** `app/layout.tsx`
- **Lines 5-6:** Update page title and description
- **Line 7:** Update keywords
- **Line 8:** Update author name

### 2. Contact Information
**File:** `app/components/Contact.tsx`
- **Line 52:** Email address
- **Line 58:** Phone number
- **Line 64:** Location

### 3. Social Media Links
**File:** `app/components/Footer.tsx`
- **Lines 10-63:** Update all social media URLs
  - LinkedIn (line 13)
  - GitHub (line 21)
  - Twitter (line 29)
  - Stack Overflow (line 37)
  - Email (line 54)

## 📝 Content Updates

### About Me
**File:** `app/components/About.tsx`
- **Lines 9-27:** Update your background story (3 paragraphs)
- **Lines 30-45:** Customize your personality highlights (3 cards)

### Skills
**File:** `app/components/Skills.tsx`
- **Lines 6-49:** Update your skills
  - Modify skill names
  - Adjust proficiency levels (0-100)
  - Add/remove categories
  - Add/remove individual skills

### Experience
**File:** `app/components/Experience.tsx`
- **Lines 6-57:** Update work history
  - Company name
  - Job title
  - Duration (format: "Mon YYYY - Mon YYYY")
  - Achievements (array of strings)
- Add more jobs by copying the object structure

### Projects
**File:** `app/components/Projects.tsx`
- **Lines 6-77:** Update projects (6 projects shown)
  - Title
  - Description
  - Technologies array
  - Image (emoji or path to image)
  - Live URL
  - GitHub URL
  - Highlights array

### Education
**File:** `app/components/Education.tsx`
- **Lines 6-24:** Update degrees
  - Degree name
  - Institution
  - Location
  - Duration
  - Description
- **Lines 26-55:** Update certifications
  - Name
  - Issuer
  - Date
  - Icon (emoji)

### Services
**File:** `app/components/Services.tsx`
- **Lines 6-78:** Update services offered
  - Icon (emoji)
  - Title
  - Description
  - Features array (4 items per service)

### Statistics
**File:** `app/components/Stats.tsx`
- **Lines 11-30:** Update your stats
  - Number value
  - Suffix (e.g., "+", "K+")
  - Label
  - Icon (emoji)

## 🎨 Visual Customization

### Colors
Search and replace these RGB values throughout all `.module.css` files:

**Primary Color (Light Purple):**
- Current: `rgb(184, 174, 191)`
- Replace with your primary color

**Secondary Color (Deep Purple):**
- Current: `rgb(65, 27, 94)`
- Replace with your secondary color

**Accent Color (Blue):**
- Current: `rgb(62, 84, 172)`
- Replace with your accent color

### Adding Your Photo

1. Add your photo to `public/profile.jpg`
2. In `app/components/Hero.tsx`, replace lines 35-47 with:

```tsx
<Image
  src="/profile.jpg"
  alt="Your Name"
  width={350}
  height={350}
  priority
  style={{ borderRadius: '50%', objectFit: 'cover' }}
/>
```

3. Import Image at the top:
```tsx
import Image from 'next/image';
```

### Adding Project Images

1. Create folder: `public/projects/`
2. Add images: `public/projects/project1.jpg`, etc.
3. In `app/components/Projects.tsx`:
   - Change `image: '🛒'` to `image: '/projects/project1.jpg'`
4. Update the component to use `<Image>` instead of emoji

## 🔧 Technical Customization

### Navigation Items
**File:** `app/components/Navigation.tsx`
- **Lines 42-51:** Modify navigation menu items
  - Add/remove sections
  - Change labels
  - Update section IDs

### Form Handling
**File:** `app/components/Contact.tsx`
- **Lines 15-21:** Update `handleSubmit` function
  - Integrate with your email service
  - Add API endpoint
  - Connect to form service (Formspree, etc.)

### SEO & Metadata
**File:** `app/layout.tsx`
- **Lines 5-18:** Update all metadata
  - Title
  - Description
  - Keywords
  - OpenGraph data

## 📋 Content Checklist

Use this checklist to track your customization:

- [ ] Update name in Hero section
- [ ] Update name in Footer
- [ ] Update page title and metadata
- [ ] Update email address
- [ ] Update phone number
- [ ] Update location
- [ ] Update all social media links
- [ ] Write About Me section
- [ ] List all skills with levels
- [ ] Add work experience
- [ ] Add projects with links
- [ ] Add education history
- [ ] Add certifications
- [ ] Customize services offered
- [ ] Update statistics
- [ ] Add profile photo
- [ ] Add project images
- [ ] Customize colors (optional)
- [ ] Test contact form
- [ ] Review all links

## 🚀 Testing Your Changes

After making changes:

1. Save all files
2. Check the browser (should auto-reload)
3. Test on different screen sizes
4. Click all navigation links
5. Test all external links
6. Try the contact form
7. Check mobile responsiveness

## 💡 Tips

- **Keep it concise:** Shorter descriptions are more impactful
- **Use action verbs:** Start achievements with strong verbs
- **Be specific:** Use numbers and metrics where possible
- **Update regularly:** Keep projects and experience current
- **Test links:** Ensure all URLs work before deploying
- **Optimize images:** Compress images before adding them
- **Proofread:** Check for typos and grammar

## 🆘 Common Issues

**Issue:** Changes not showing
- **Solution:** Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

**Issue:** Layout broken
- **Solution:** Check for missing closing tags or brackets

**Issue:** Colors not updating
- **Solution:** Make sure to update in both regular and hover states

**Issue:** Images not loading
- **Solution:** Ensure images are in `public` folder and path starts with `/`

---

Need more help? Check the main README.md for detailed documentation.

