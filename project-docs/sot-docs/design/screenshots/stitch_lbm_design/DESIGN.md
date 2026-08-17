---
name: Pro-Max Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#6a1edb'
  on-tertiary: '#ffffff'
  tertiary-container: '#8343f4'
  on-tertiary-container: '#f7edff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-h1:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-h2:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: '0'
  body-lead:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  3xl: 4rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  gutter: 1rem
---

## Brand & Style

The design system is a high-precision visual language engineered for SaaS, developer tools, and intelligent data interfaces. It projects an image of **authoritative innovation**—balancing the structural rigmarole of enterprise software with the refined elegance of modern Swiss minimalism.

The aesthetic is **Corporate / Modern** with a lean toward **Glassmorphism**. It utilizes a sophisticated "design dial" approach to modulate between airy marketing layouts and high-density dashboard environments. The atmosphere is defined by:
- **High-Precision Utility:** Clean geometric structures and hairline borders.
- **Controlled Depth:** Subtle ambient shadows paired with frosted glass overlays.
- **Dynamic Energy:** High-contrast focal points using vivid accent colors against a neutral, cool-toned canvas.

## Colors

The color strategy is rooted in functional roles, ensuring high WCAG contrast (4.5:1 minimum for body, 3:1 for large text). 

- **Primary (Trust Blue):** `#2563EB`. Used for structural branding, active states, and primary navigation.
- **Secondary (Blaze Orange):** `#F97316`. Reserved strictly for primary CTAs and high-conversion triggers.
- **Tertiary (Quantum Purple):** `#7C3AED`. Reserved for intelligence features, AI-driven components, and specialized tags.
- **Neutral (Charcoal Navy):** `#1E293B`. Used for primary text and high-contrast surfaces.

### Surface Hierarchy
- **Canvas:** `#F8FAFC` (Light) / `#0F172A` (Dark).
- **Surface:** `#FFFFFF` (Light) / `#1E293B` (Dark).
- **Border:** `#E2E8F0` (Light) / `#334155` (Dark).
- **Status:** Success: `#10B981`, Warning: `#F59E0B`, Error: `#DC2626`.

## Typography

This system uses a deliberate pairing of three distinct typefaces to separate marketing impact from functional utility.

- **Space Grotesk (Headlines):** Used for all display and heading roles to provide a technical, geometric edge.
- **Inter (Body):** The workhorse for all prose, data entries, and lead paragraphs.
- **JetBrains Mono (Technical Labels):** Used for metadata, status badges, code snippets, and overline headers to reinforce the "Pro" engineering aesthetic.

**Scale Rules:**
Headlines use tight line-heights (1.1–1.25x) and negative tracking for impact. Body copy uses generous leading (1.5–1.7x) to maintain legibility in information-dense views.

## Layout & Spacing

The layout is based on a **12-column fluid grid** system with strict adherence to an **8px baseline rhythm**.

### Grid Parameters
- **Desktop:** Max-width of `1200px` for marketing or `1400px` for dashboards. 12 columns with `24px` (lg) gutters.
- **Mobile:** Single column with `16px` (md) side margins.
- **Article/Focus:** Fixed centered width of `680px` to `800px`.

### Spacing Philosophy
- **Component Gaps:** Use `8px` (sm) for internal elements and `16px` (md) for standard spacing.
- **Section Breaks:** Use `48px` (2xl) or `64px` (3xl) to define major thematic shifts.
- **Alignment:** Content follows Z-pattern and F-pattern flows, alternating visual weight to maintain user interest.

## Elevation & Depth

Visual hierarchy is established through a mix of **Tonal Layers** and **Glassmorphism**.

- **Surface Stacking:** Backgrounds use `#F8FAFC` while primary containers use `#FFFFFF`. 
- **Shadows:** Ambient, extra-diffused shadows are used sparingly. Cards use a low-opacity shadow (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05)`) that intensifies on hover.
- **Glass Effects:** Modals and navigation bars use a "Frosted Glass" technique with `backdrop-filter: blur(12px) saturate(180%)` and a semi-transparent `1px` border.
- **Outlines:** Use hairline `1px` borders in `#E2E8F0` for all non-elevated containers to maintain a structured, technical feel.

## Shapes

The shape language is consistently **Pill-shaped**, reflecting modern software sensibilities with extreme roundedness. 

- **Standard (16px):** Applied to buttons, inputs, and small widgets.
- **Large (32px):** Applied to cards and primary containers.
- **Pill:** Reserved for status badges, tags, and specific chip components.
- **Oversized (48px):** Used exclusively for floating navbars to emphasize their detached, "object-like" nature.

## Components

### Buttons
- **Primary CTA:** Blaze Orange (`#F97316`) background, white text, 600 weight. Subtle lift and shadow on hover.
- **Secondary:** Transparent background with Trust Blue (`#2563EB`) 2px border.
- **Ghost:** No border or background; subtle `#F1F5F9` tint on hover.

### Cards
- White background, `1px` hairline border, and `32px` (2rem) corner radius. 
- Internal padding should scale: `24px` (lg) for desktop, `16px` (md) for mobile.

### Inputs
- Height of `48px` for touch-ready accessibility.
- `1px` border in `#CBD5E1` with `16px` (1rem) corner radius. On focus, transition to Trust Blue border with a `3px` soft blue glow.

### Navigation
- **Floating Navbar:** Positioned `16px` from the top, featuring a backdrop blur and `48px` (3rem) corner radius.
- **Sidebar:** Fixed at `256px` width, utilizing a solid white background and a right-side hairline border. Active states are indicated by a 3px vertical primary blue bar.

### Chips & Badges
- Small, uppercase JetBrains Mono text.
- Success, Warning, and Error badges use semi-transparent background tints of their respective functional colors with full-pill rounding.