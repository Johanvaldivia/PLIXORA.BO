---
name: Obsidian Cybernetic Pulse
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#becbae'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#89957a'
  outline-variant: '#3f4a34'
  surface-tint: '#7adf00'
  primary: '#ffffff'
  on-primary: '#1a3700'
  primary-container: '#8bfe00'
  on-primary-container: '#3b7100'
  inverse-primary: '#376b00'
  secondary: '#c4c6cf'
  on-secondary: '#2d3037'
  secondary-container: '#44474e'
  on-secondary-container: '#b3b5bd'
  tertiary: '#ffffff'
  on-tertiary: '#193800'
  tertiary-container: '#90fd32'
  on-tertiary-container: '#397200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#8bfe00'
  primary-fixed-dim: '#7adf00'
  on-primary-fixed: '#0d2000'
  on-primary-fixed-variant: '#285000'
  secondary-fixed: '#e1e2eb'
  secondary-fixed-dim: '#c4c6cf'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474e'
  tertiary-fixed: '#90fd32'
  tertiary-fixed-dim: '#76df00'
  on-tertiary-fixed: '#0c2000'
  on-tertiary-fixed-variant: '#275000'
  background: '#111317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies a high-caliber cybernetic fintech ethos tailored for modern digital operations, enterprise security, and algorithmic dashboards. Its character radiates precision, technical superiority, and an uncompromising modern edge. 

Designed for operators, high-net-worth liquidity managers, and technical founders, the system projects immediate trust, sovereign data protection, and low-latency performance. The aesthetic fuses **Deep Obsidian Minimalism** with **Cybernetic Glassmorphism**: pitch-black matte surfaces accented with radiant neon electric lime accents, ultra-fine microscopic translucent glass cards, and crisp micro-borders. Visual layers communicate structural integrity and institutional gravitas, avoiding visual clutter while delivering immediate high-contrast feedback.

## Colors

The palette leverages high-contrast tension between deep obsidian structural tones and electric neon bio-luminescence.

- **Primary (`#8CFF00`)**: Electric Cyber Lime. Used strictly for core focal actions, critical real-time financial triggers, active indicator states, and precise hover highlights.
- **Secondary (`#14171D`)**: Obsidian Surface Container. Serves as the elevated layer over the base abyss, providing structure to cards, panels, and floating authentication modules.
- **Tertiary (`#76E000`)**: Deepened Kinetic Lime. Used for focused interaction states, active toggle switches, pressed button states, and visual depth gradients behind data charts.
- **Neutral (`#0D0F12`)**: True Abyss Black. The foundational canvas backdrop engineered to provide absolute depth and maximum legibility for frosted panels.
- **Text & Foreground**: Crisp Pure White (`#FFFFFF`) for primary headlines, values, and high-priority metrics. Muted Slate Alpha (`rgba(255, 255, 255, 0.65)`) for secondary labels, and Translucent Dim Slate (`rgba(255, 255, 255, 0.35)`) for metadata and placeholders.
- **Glass Borders**: Ultra-refined semi-transparent borders built from `rgba(255, 255, 255, 0.08)` and highlighted focused borders using `rgba(140, 255, 0, 0.40)`.

## Typography

The typographic hierarchy is divided intentionally between structural geometric headlines and utilitarian, data-dense body presentation.

- **Headlines & Titles (Plus Jakarta Sans)**: Delivers sculpted, wide tracking for uppercase branding, clean geometric ascenders for numerical headers, and high-impact presence on portal sign-in frames and dashboard metric overviews.
- **Body & Data Displays (Inter)**: Provides exceptional readability at micro-sizes across financial matrices, code payloads, transactional tables, and multi-field inputs.
- **Numeric & Metric Display**: Large dashboard counters and portfolio values use tabular numbers (`font-variant-numeric: tabular-nums`) with `Plus Jakarta Sans` semi-bold to eliminate jitter during real-time streaming updates.

## Layout & Spacing

The layout model is anchored on an 8-point rhythmic grid configured for high-density analytical dashboards and crisp, center-stage authentication portals.

- **Desktop (>= 1280px)**: 12-column dynamic fluid grid bounded by a maximum container of `1600px`. Standard gutters are fixed at `1.5rem` (`24px`), with outer section margins at `2rem` (`32px`). Authentication views center within a fixed `440px` glass column.
- **Tablet (768px - 1279px)**: 8-column layout. Metric cards collapse to 2-up or 4-up grids. Gutters remain `1.5rem` while navigation shifts to an expandable frosted rail or overlay drawer.
- **Mobile (< 768px)**: 4-column single-flow layout with condensed `1rem` gutters and outer canvas margins. Multi-column financial tables convert into swipeable cards or horizontal scrollers with masked gradient edges.

## Elevation & Depth

Depth is constructed through physical light transmission, frosted layering, and laser-precise luminescence rather than muddy drop shadows.

- **Tier 0 (Abyss)**: `#0D0F12` background featuring subtle ambient radial glows of `#8CFF00` at 3-5% opacity positioned behind central widgets and portal entry cards.
- **Tier 1 (Surface Tiles & Glass Cards)**: Translucent obsidian `#14171D` at 70% opacity backed by `backdrop-filter: blur(20px) saturate(160%)`. Outlined with a microscopic `1px` inner rim of `rgba(255, 255, 255, 0.08)`.
- **Tier 2 (Floating Modals & Flyouts)**: Elevated container of `#181C24` at 85% opacity, blur radius `32px`, bordered by `rgba(255, 255, 255, 0.12)`, supported by a dual-stage shadow: `0 20px 40px -10px rgba(0, 0, 0, 0.7)` combined with an ambient `0 0 24px 0 rgba(140, 255, 0, 0.06)`.
- **Tier 3 (Active Focus & Tooltips)**: Solidified obsidian with an active rim neon halo: `box-shadow: 0 0 16px rgba(140, 255, 0, 0.25)`.

## Shapes

The shape system adopts modern tech roundedness: crisp, balanced, and engineered.

- Standard UI items (buttons, text inputs, chips) carry a base `0.5rem` (`8px`) curvature.
- Structural cards, sign-in panels, and data widgets use `rounded-lg` (`1rem` / `16px`).
- Floating system modals, dialog sheets, and top-level authentication containers use `rounded-xl` (`1.5rem` / `24px`).
- System badges, status indicators, and pill toggles use full pill radii (`9999px`) to contrast cleanly against rectangular metric grids.

## Components

### Buttons
- **Primary Cyber Action**: Solid `#8CFF00` background with deep obsidian `#0D0F12` bold typography. Hover introduces an outer kinetic neon glow (`box-shadow: 0 0 20px rgba(140, 255, 0, 0.45)`) and slight brightness elevation.
- **Secondary Ghost Glass**: `#14171D` with 60% opacity, `1px` border of `rgba(255, 255, 255, 0.15)`, pure white text. Hover transitions border color to `#8CFF00` with an subtle background shift to `rgba(140, 255, 0, 0.08)`.
- **Tertiary Utility**: Flat transparent background, slate text, crisp hover color shift to `#FFFFFF`.

### Inputs & Authentication Fields
- Inputs feature a dark glass backdrop (`rgba(20, 23, 29, 0.6)`), `1px` stroke in `rgba(255, 255, 255, 0.10)`, and text set in pure white.
- Focused state transforms the border into solid `#8CFF00` backed by an inset micro-glow `0 0 8px rgba(140, 255, 0, 0.2)`. Labels float with clean typography and `12px` font size.

### Cards & Analytical Widgets
- Built with frosted glass backing (`backdrop-filter: blur(16px)`), `#14171D` background tint at 75%, and a `1px` border gradient that transitions from `rgba(255, 255, 255, 0.12)` at the top edge to `rgba(255, 255, 255, 0.02)` at the bottom.
- Header sections feature uppercase micro-labels and right-aligned lime status beacons.

### Checkboxes, Radios & Toggles
- Checkboxes maintain square profiles with `4px` corner rounding, filled with dark obsidian and outlined with `rgba(255, 255, 255, 0.2)`. Active state triggers an `#8CFF00` fill with an obsidian checkmark icon.
- Toggles feature an obsidian pill track, transitioning to `#76E000` when enabled, with an off-white circular knob gliding smoothly across states.

### Badges & Status Chips
- Pill-shaped chips configured with low-opacity cybernetic fills: `rgba(140, 255, 0, 0.12)` background, `#8CFF00` text, and a pulsing `6px` circular neon status beacon to denote real-time connectivity or verified authentication status.