# Design System — Arma

## Product Context
- **What this is:** AI-powered educational platform — upload PDFs, YouTube videos, or web articles and get summaries, flashcards, quizzes, and an AI tutor
- **Who it's for:** Students and self-learners (bilingual: Russian/English)
- **Space/industry:** EdTech (peers: Coursera, Brilliant, Khan Academy, Notion)
- **Project type:** Web app / dashboard

## Aesthetic Direction
- **Direction:** Dark premium — clean surfaces, warm accent, glass panels
- **Decoration level:** Intentional — subtle glow effects, glass blur, ambient orb on hero
- **Mood:** Calm, focused, premium. The app should feel like a high-end study environment, not a busy classroom. Dark backgrounds reduce eye strain for long study sessions.
- **Key visual elements:** Orange ambient orb on dashboard hero, glass panel utility class (`glass-panel`), subtle gradient lines on container tops

## Typography
- **Font family:** Satoshi (from Fontshare)
- **Display/Hero:** Satoshi 700 — geometric, modern, high readability at large sizes
- **Body:** Satoshi 400 — clean and legible at small sizes
- **UI/Labels:** Satoshi 500
- **Data/Tables:** Satoshi 400 (supports tabular-nums)
- **Code:** System monospace (no custom code font loaded)
- **Loading:** `https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap`
- **Scale:**
  - Display: 48px (desktop) / 24px (mobile)
  - H1: 30px (desktop) / 24px (mobile) — `text-3xl md:text-5xl` → `text-2xl md:text-5xl`
  - H2: 24px — `text-xl md:text-2xl`
  - H3: 20px — `text-lg md:text-xl`
  - Body: 16px — `text-base`
  - UI Label: 14px — `text-sm`
  - Caption: 12px — `text-xs`
  - Overline: 11px uppercase — `text-[11px]`

## Color
- **Approach:** Restrained — one warm accent + cool neutrals
- **Primary:** `#FF8A3D` — warm orange-amber, used for CTAs, active states, accent glows
- **Amber accent:** `#F59E0B` — secondary warmth, charts
- **Background:** `#0C0C0F` — near-black, the page canvas
- **Surface:** `#121215` at 80% opacity — card/frame background (desktop only)
- **Foreground:** `#F3F3F3` — warm off-white text
- **Muted:** `#9CA3AF` — secondary text, labels
- **Border:** `rgba(255, 255, 255, 0.06)` — barely visible structure lines
- **Semantic:** success `#22C55E`, warning `#F59E0B`, error `#EF4444`, info `#3B82F6`
- **Dark mode:** This IS dark mode. No light mode currently.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Mobile adjustments:** Reduce padding by ~50% on mobile (e.g., `p-4 md:p-8`)

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 1 column (mobile) / 2 columns (tablet) / 3 columns (desktop)
- **Max content width:** `max-w-2xl` for primary input, full-width for grids
- **Border radius:**
  - sm: 4px (tags, small elements)
  - md: 8px (chips, small buttons)
  - lg: 12px (buttons, inputs, cards)
  - xl: 16px (panels, modals)
  - 2xl: 20px (mobile frame) / 32px (desktop frame)
  - full: 9999px (pills, avatars, FAB)

## Mobile-Specific Rules

### Edge-to-Edge on Mobile
- **The dashboard frame dissolves on mobile.** No rounded corners, no border, no shadow, no outer padding. Content goes edge-to-edge.
- Desktop: `rounded-[32px] border border-white/[0.08] bg-[#121215]/80 backdrop-blur-2xl shadow-2xl`
- Mobile: `rounded-none border-0 bg-[#0C0C0F] shadow-none` (matches page background)
- Decorative inner ring and top gradient line: `hidden md:block`

### Hero Section
- Orb: `w-20 h-20` on mobile (80px), `w-40 h-40` on desktop (160px)
- Ambient glow background: `w-[400px] h-[400px]` on mobile, `w-[800px] h-[800px]` on desktop
- Heading: `text-2xl` on mobile, `text-5xl` on desktop
- Subtitle: `text-base` on mobile, `text-2xl` on desktop
- No double padding — hero section gets `px-4`, inner text div gets `px-0`

### Bottom Navigation
- Height: 64px fixed
- FAB: 56px circle, positioned `bottom-[80px] right-4`
- Content bottom padding: `pb-20` (80px) to clear nav + FAB

### Side Panels (ProjectDetailView)
- Desktop: inline panels (260px left outline, 264px right metadata)
- Mobile: Sheet drawers (Radix) triggered by header buttons, `w-[280px]`
- Never show both inline panels on mobile — they squeeze content to near-zero

### Touch Targets
- Minimum: 44x44px for interactive elements
- Bottom nav items: `p-2` with 20px icons + 10px labels
- Action buttons: `py-2 px-4` minimum

### Padding Conventions
| Element | Mobile | Desktop |
|---------|--------|---------|
| Page content | `px-4` | `px-8` |
| Cards/sections | `p-4` | `p-6` |
| Modals | `p-4` | `p-6` or `p-8` |
| Header bar | `px-4 h-10` | `px-6 h-14` |
| Input areas | `p-3` | `p-6` |

## Motion
- **Approach:** Intentional — subtle entrance animations, meaningful state transitions
- **Easing:** enter(ease-out via `[0.22, 1, 0.36, 1]`) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Patterns:** Framer Motion `AnimatePresence` for panel show/hide, `initial={{ opacity: 0, y: 10 }}` for list items
- **Ambient:** `animate-pulse` on the hero orb glow (subtle, not distracting)

## Custom Utilities
- `glass-panel` — `bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-2xl`
- `glass-panel-hover` — `hover:bg-white/[0.05] transition-all duration-300`
- `orange-glow` — `box-shadow: 0 0 20px -5px rgba(255, 138, 61, 0.3)`
- `text-glow` — `text-shadow: 0 0 20px rgba(255, 138, 61, 0.5)`
- `scrollbar-hide` — hides scrollbar across browsers

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Added Satoshi font | System fonts are generic — Satoshi gives Arma typographic personality while staying clean and modern |
| 2026-03-20 | Frame dissolves on mobile | Rounded card frame wastes horizontal space on phones, creates "phone in phone" effect |
| 2026-03-20 | Orb reduced to 80px on mobile | 128px orb pushed content below the fold on small screens |
| 2026-03-20 | Removed double padding on greeting | Nested `px-4` on hero section + greeting div caused text clipping |
| 2026-03-20 | Created DESIGN.md | Codified existing design decisions and mobile-specific rules |
