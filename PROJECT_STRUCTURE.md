# Project Structure

This document explains the organization of your portfolio website.

## 📁 Directory Structure

```
portfolio/
├── app/
│   ├── components/           # All React components
│   │   ├── About.tsx        # About Me section
│   │   ├── About.module.css
│   │   ├── Contact.tsx      # Contact form section
│   │   ├── Contact.module.css
│   │   ├── Education.tsx    # Education & Certifications
│   │   ├── Education.module.css
│   │   ├── Experience.tsx   # Work experience timeline
│   │   ├── Experience.module.css
│   │   ├── Footer.tsx       # Footer with social links
│   │   ├── Footer.module.css
│   │   ├── Hero.tsx         # Hero/landing section
│   │   ├── Hero.module.css
│   │   ├── Navigation.tsx   # Sticky navigation bar
│   │   ├── Navigation.module.css
│   │   ├── Projects.tsx     # Projects showcase
│   │   ├── Projects.module.css
│   │   ├── Services.tsx     # Services offered
│   │   ├── Services.module.css
│   │   ├── Skills.tsx       # Skills & tech stack
│   │   ├── Skills.module.css
│   │   ├── Stats.tsx        # Statistics with animations
│   │   └── Stats.module.css
│   ├── favicon.ico          # Site favicon
│   ├── globals.css          # Global styles & animations
│   ├── layout.tsx           # Root layout & metadata
│   └── page.tsx             # Main page (imports all components)
├── public/                  # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .gitignore
├── CUSTOMIZATION_GUIDE.md   # Quick customization guide
├── eslint.config.mjs        # ESLint configuration
├── next-env.d.ts            # Next.js TypeScript definitions
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies & scripts
├── postcss.config.mjs       # PostCSS configuration
├── PROJECT_STRUCTURE.md     # This file
├── README.md                # Main documentation
└── tsconfig.json            # TypeScript configuration
```

## 🧩 Component Breakdown

### Navigation.tsx
- **Purpose:** Sticky navigation bar with smooth scroll
- **Features:**
  - Auto-highlights active section
  - Smooth scroll to sections
  - Transparent background that becomes solid on scroll
  - Responsive mobile menu
- **Customization:** Lines 42-51 (navigation items)

### Hero.tsx
- **Purpose:** First section visitors see
- **Features:**
  - Large name display with gradient
  - Professional title
  - Compelling tagline
  - Two CTA buttons
  - Profile image placeholder
  - Animated scroll indicator
- **Customization:** Lines 24-29 (personal info)

### About.tsx
- **Purpose:** Personal introduction
- **Features:**
  - Three paragraphs about background
  - Three highlight cards (Problem Solver, Team Player, Continuous Learner)
  - Hover animations
- **Customization:** Lines 9-45 (all content)

### Skills.tsx
- **Purpose:** Display technical skills
- **Features:**
  - Four categories (Frontend, Backend, DevOps, Tools)
  - Animated progress bars
  - Percentage indicators
  - Hover effects on cards
- **Customization:** Lines 6-49 (all skills)

### Experience.tsx
- **Purpose:** Work history timeline
- **Features:**
  - Vertical timeline with markers
  - Company, role, duration for each position
  - Achievement lists
  - Hover animations
- **Customization:** Lines 6-57 (all positions)

### Projects.tsx
- **Purpose:** Showcase portfolio projects
- **Features:**
  - Grid layout (6 projects)
  - Project image/emoji
  - Description & highlights
  - Technology tags
  - Links to live demo & GitHub
- **Customization:** Lines 6-77 (all projects)

### Education.tsx
- **Purpose:** Academic background & certifications
- **Features:**
  - Education cards with degrees
  - Certification grid
  - Icons for each certification
  - Dates and institutions
- **Customization:** Lines 6-55 (all education data)

### Services.tsx
- **Purpose:** Services offered for freelancing
- **Features:**
  - Six service cards
  - Icon for each service
  - Feature lists
  - Hover animations
- **Customization:** Lines 6-78 (all services)

### Stats.tsx
- **Purpose:** Impressive numbers/metrics
- **Features:**
  - Four stat cards
  - Animated counters (count up on scroll)
  - Icons for each stat
  - Gradient background
- **Customization:** Lines 11-30 (all statistics)

### Contact.tsx
- **Purpose:** Contact form & information
- **Features:**
  - Working contact form (needs backend)
  - Contact information cards
  - Email, phone, location
  - Form validation
- **Customization:** Lines 50-66 (contact info)

### Footer.tsx
- **Purpose:** Site footer with social links
- **Features:**
  - Personal branding
  - Five social media links with icons
  - Copyright notice
  - Animated heart
- **Customization:** Lines 10-64 (social links & info)

## 🎨 Styling System

### CSS Modules
Each component has its own `.module.css` file:
- **Scoped styles:** Styles only apply to that component
- **No conflicts:** Class names are automatically unique
- **Easy maintenance:** Styles are co-located with components

### Global Styles (globals.css)
- CSS reset
- Scrollbar styling
- Selection colors
- Focus states for accessibility
- Animation keyframes
- Utility classes
- Responsive typography

### Color Variables
Colors are used consistently throughout:
- **Primary:** `rgb(184, 174, 191)` - Light purple
- **Secondary:** `rgb(65, 27, 94)` - Deep purple
- **Accent:** `rgb(62, 84, 172)` - Blue

## 🔄 Data Flow

```
page.tsx (Main Page)
    ↓
Imports all components
    ↓
Each component renders its section
    ↓
Styled with CSS Modules
```

### Component Hierarchy
```
page.tsx
├── Navigation (sticky, always visible)
├── main
│   ├── Hero
│   ├── About
│   ├── Skills
│   ├── Experience
│   ├── Projects
│   ├── Education
│   ├── Services
│   ├── Stats
│   └── Contact
└── Footer
```

## 📱 Responsive Breakpoints

```css
/* Desktop: Default styles */

/* Tablet: 768px - 968px */
@media (max-width: 968px) { }

/* Mobile: < 768px */
@media (max-width: 768px) { }

/* Small Mobile: < 640px */
@media (max-width: 640px) { }
```

## 🎭 Animations

### Global Animations (globals.css)
- `fadeIn` - Simple fade in
- `fadeInUp` - Fade in with upward motion
- `fadeInDown` - Fade in with downward motion
- `slideInLeft` - Slide from left
- `slideInRight` - Slide from right

### Component-Specific Animations
- **Hero:** Fade in animations on load
- **Stats:** Number counter animation
- **Experience:** Timeline slide-in
- **Projects:** Card hover lift
- **Footer:** Heartbeat animation

## 🚀 Performance Features

1. **CSS Modules:** Automatic code splitting
2. **No external CSS libraries:** Faster load times
3. **Semantic HTML:** Better SEO
4. **Smooth scroll:** Native CSS `scroll-behavior`
5. **Optimized animations:** GPU-accelerated transforms
6. **Lazy loading ready:** Components can be lazy loaded

## 🔧 Configuration Files

### next.config.ts
- Next.js configuration
- Image optimization settings
- Build settings

### tsconfig.json
- TypeScript compiler options
- Path aliases
- Type checking rules

### eslint.config.mjs
- Code quality rules
- Next.js specific linting

### postcss.config.mjs
- CSS processing (minimal, no Tailwind)

## 📦 Dependencies

### Production Dependencies
- `next` (16.1.1) - React framework
- `react` (19.2.3) - UI library
- `react-dom` (19.2.3) - React DOM renderer

### Development Dependencies
- `typescript` - Type safety
- `@types/*` - TypeScript definitions
- `eslint` - Code linting
- `eslint-config-next` - Next.js ESLint rules

## 🎯 Key Features

1. **No Tailwind:** Pure CSS Modules as requested
2. **Fully Responsive:** Works on all devices
3. **Smooth Animations:** Professional transitions
4. **SEO Optimized:** Proper metadata & semantic HTML
5. **Accessible:** WCAG compliant
6. **Type Safe:** Full TypeScript support
7. **Production Ready:** Optimized build
8. **Easy to Customize:** Well-documented & organized

## 📝 Adding New Sections

To add a new section:

1. Create component files:
   ```
   app/components/NewSection.tsx
   app/components/NewSection.module.css
   ```

2. Import in `app/page.tsx`:
   ```tsx
   import NewSection from './components/NewSection';
   ```

3. Add to page:
   ```tsx
   <NewSection />
   ```

4. Add to navigation in `Navigation.tsx`:
   ```tsx
   { id: 'newsection', label: 'New Section' }
   ```

5. Add section ID to component:
   ```tsx
   <section id="newsection">
   ```

## 🔍 Finding Things Quickly

**Need to change:**
- **Your name?** → `Hero.tsx`, `Footer.tsx`, `layout.tsx`
- **Colors?** → Search `rgb(184, 174, 191)` in all `.module.css` files
- **Skills?** → `Skills.tsx` lines 6-49
- **Projects?** → `Projects.tsx` lines 6-77
- **Contact info?** → `Contact.tsx` lines 50-66
- **Social links?** → `Footer.tsx` lines 10-63

---

For detailed customization instructions, see `CUSTOMIZATION_GUIDE.md`

