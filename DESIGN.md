---
name: FORZA.EVENTS
description: Neon Pits — midnight Discord Activity, violet glow, Inter, Cover-led event covers.
colors:
  base: "#06060e"
  surface: "#0b0d1c"
  card: "#0e1020"
  card-hover: "#12152a"
  ink: "#f1f5f9"
  muted: "#4b5680"
  muted-light: "#6b728a"
  accent-purple: "#8b5cf6"
  accent-purple-light: "#a78bfa"
  accent-purple-dark: "#7c3aed"
  accent-cyan: "#22d3ee"
  accent-orange: "#f97316"
  accent-green: "#10b981"
  accent-red: "#ef4444"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  badge: "6px"
  control: "8px"
  panel: "12px"
  modal: "16px"
spacing:
  control: "10px 14px"
  button: "10px 16px"
  chip: "10px 16px"
  card: "14px 16px"
  panel: "20px"
  sidebar: "13.5rem"
  content-max: "42rem"
components:
  button-primary:
    backgroundColor: "rgba(139, 92, 246, 0.10)"
    textColor: "{colors.accent-purple-light}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  button-primary-hover:
    backgroundColor: "rgba(139, 92, 246, 0.15)"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  button-primary-solid:
    backgroundColor: "{colors.accent-purple-dark}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.panel}"
  event-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "{spacing.control}"
---

# Design System: FORZA.EVENTS

## Overview

**Creative North Star: "Neon Pits"**

Shipped Discord Activity look (git `master` / HEAD). Midnight navy ground, violet accent, Inter, soft glass panels, and purple glow on interactive chrome. Custom event covers sit on cards; filters are chip rows. Dark-First Console (graphite + syntax-blue, system UI sans, hairline-only) is a discarded experiment — do not reapply it.

**Key Characteristics:**
- Ground `#06060e` with twin radial washes (violet top, cyan corner).
- Accent purple `#8b5cf6` / `#a78bfa` / `#7c3aed` for nav, focus, Join, hover glow.
- Inter as the UI face.
- `.glass` = backdrop blur; `.glow-purple` / `.text-glow-purple` are in-world.
- Left sidebar `13.5rem` from `lg`; centered `42rem` content column.

## Colors

Midnight navy canvas; violet is the interaction voice. Cyan is atmosphere + car-rule chrome, not a second primary.

### Primary
- **Accent Purple** (`#8b5cf6`): Default accent — borders, chips, glow.
- **Accent Purple Light** (`#a78bfa`): Active nav, wordmark `.EVENTS`, hover labels.
- **Accent Purple Dark** (`#7c3aed`): Solid primary fills (modal confirms) and gradient starts.

### Secondary
- **Accent Cyan** (`#22d3ee`): Canvas wash, optional glow, car-rule badges.

### Tertiary (semantic)
- **Green** (`#10b981`): Open / success / online.
- **Red** (`#ef4444`): Leave / danger.
- **Orange** (`#f97316`): Dirt type and related chips.
- Game/status badges keep their own tints (FH5/FH6, ranked amber).

### Neutral
- **Base** (`#06060e`): Body, boot splash, hero fade.
- **Surface** (`#0b0d1c`): Sidebar / raised chrome.
- **Card** (`#0e1020`): Panels, option menus.
- **Card Hover** (`#12152a`): Hovered card fill.
- **Muted** (`#4b5680`) / **Muted Light** (`#6b728a`): Labels, idle nav.
- **Ink** (`#f1f5f9` / slate-100): Body text.

### Named Rules
**The Violet Voice Rule.** Purple is the interaction color. Green / orange / red / fuchsia stay semantic (status, event type, game).

**The Glow-Is-Material Rule.** Soft violet bloom on hover, active nav drop-shadow, and text-glow on active labels are part of this world — not a defect to strip.

## Typography

**Display / Body / Label:** Inter, system-ui, -apple-system, sans-serif.

**Character:** Gaming-social Discord Activity. 10px UPPERCASE tracked labels; 14px body; card titles around `text-lg` / `text-xl`.

### Named Rules
**The Caps-Label Rule.** Field labels and nav items are 10px, weight 700, UPPERCASE, tracked; body copy is never caps.

## Layout

Fixed left sidebar (`--app-sidebar-width: 13.5rem`) from `lg`; below `lg`, sticky brand bar + top icon nav. Main column centered at `--app-content-max-width: 42rem`. Browse: chip filter rows (Game / Type / Ranked) plus a sort control, then a single-column event feed.

## Elevation & Depth

Glass panels (`backdrop-filter: blur(16px)`). Cards use a dark rest shadow; hover adds purple ring + deeper shadow (`shadow-card-hover` / `.card-glow-border`).

### Shadow Vocabulary
- **Glow purple** (`0 0 22px rgba(139,92,246,0.55), 0 0 50px rgba(139,92,246,0.15)`): Primary bloom.
- **Glow purple sm:** Nav/icon emphasis.
- **Card hover:** Dark lift plus `1px` purple ring.

## Shapes

Controls `8px` (`rounded-lg`), panels `12px` (`rounded-xl`), modals `16px` (`rounded-2xl`), badges `6px`. Active nav: 2px gradient bar (side or top) plus icon drop-shadow.

## Components

### Buttons
- **Primary (pages):** Soft glass — `border-accent-purple/35 bg-accent-purple/10`, light purple label.
- **Primary solid (modals):** Violet gradient fill + glow.
- **Secondary / ghost:** White-alpha borders; hover may pick up purple.
- **Open / Leave / Full:** Tinted chips.

### Cards
Cover-led event unit on `#0e1020` with white/7 hairline; hover purple ring. Quiet FH5/FH6 badge by organiser. No FULL / Waitlisted chips.

### Navigation
Desktop: glass sidebar, uppercase tracked items, gradient active bar, text-glow on the active label. Mobile: brand bar + equal top tabs.

### Inputs
`8px`, `border-white/8`, `bg-white/3`. Focus brightens the white border (not a syntax-blue hairline).

## Do's and Don'ts

### Do:
- **Do** keep midnight navy `#06060e` and violet `#8b5cf6` as the structural pair.
- **Do** ship Inter.
- **Do** use glass + purple glow on interactive chrome.
- **Do** keep Browse filters as chip rows (current HEAD), not console selects.
- **Do** use in-app `ConfirmDialog` — Activity iframe blocks native modals.

### Don't:
- **Don't** reapply Dark-First Console — graphite `#0d1117`, syntax-blue `#58a6ff`, hairline-only elevation, or banning Inter.
- **Don't** replace violet with a developer-console blue while class names still say `accent-purple`.
- **Don't** flatten `.glass` to opaque panels or delete glow utilities as "slop" unless the user asks for a new world.
- **Don't** invent social proof or metrics PRODUCT.md does not attest.
