# Pickup Locker Design DNA

Visual and interaction standards for Eveider. All surfaces — mobile, business portal, admin, and marketing website — share this **refined logistics UI** system, inspired by [InPost](https://inpost.co.uk/) parcel flows.

Implementation tokens live in `packages/config-ui` and mirror values here exactly.

## Visual Personality

Imagine if:

- InPost parcel tracking & locker networks
- The Courier Guy operational branding
- Modern airport wayfinding systems
- Industrial logistics equipment

had a child.

The result must feel:

- Professional
- Structured
- Operational
- Reliable
- Clean and spacious
- High-contrast (readable in sunlight / warehouse)

**Never:** playful, cute, startup-ish, glassmorphism, gradient heroes, heavy neo-brutalist shadows, or "AI generated".

**Target reaction:** *"This is the software behind a serious logistics network."*

---

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Primary brand | `#09D40B` | Main CTAs, ready/available states — **max ~5% of screen** |
| Secondary | `#121212` | Primary text, emphasis borders, selected states |
| Surface | `#FFFFFF` | Cards, panels, primary content areas |
| Background | `#F5F6F7` | Page / screen background |
| Border subtle | `#DDE1E6` | Default structural borders — cards, inputs, dividers |
| Border emphasis | `#121212` | Selected states, primary CTAs, active nav |
| Text muted | `#64748B` | Body secondary copy, inactive labels |
| Success | `#09D40B` | Same as primary — positive operational state |
| Warning | `#FFB800` | Attention required (e.g. livré au casier) |
| Danger | `#E53935` | Failure, blocked, critical |
| Info | `#1677FF` | Informational states |

### Color Distribution

| Share | Color | Role |
|-------|-------|------|
| 60% | White | Surfaces, cards, content |
| 25% | Light grey (`#F5F6F7`) | Background, structure |
| 10% | Black (`#121212`) | Typography, emphasis |
| 5% | Green (`#09D40B`) | Meaning only — CTAs & ready states |

**Green means something.** Use it like InPost uses yellow — sparingly, for action and status. Do not use green decoratively.

**Avoid:** diffuse drop shadows (`box-shadow: 0 4px 12px rgba(...)`), gradient backgrounds, purple accents, glassmorphism, blurred panels.

---

## Borders & Shadows

| Property | Default | Selected / emphasis |
|----------|---------|---------------------|
| Border width | `1px` | `2px` |
| Border color | `#DDE1E6` | `#121212` |
| Border style | `solid` | `solid` |
| Card shadow | **None** | **None** |

Flat surfaces only. Thick black borders are reserved for **selected** options and primary CTAs — not every card and input.

---

## Typography

| Property | Value |
|----------|-------|
| Font family | **Inter** (500, 600, 700) |
| Page headings | Sentence case, `font-weight: 700`, tight letter-spacing |
| Section labels | Sentence case, `font-weight: 600` |
| Body copy | Sentence case, `font-weight: 500` |

**Avoid:** ALL CAPS labels everywhere, excessive letter-spacing, shouty micro-copy.

---

## Corners

| Element | Radius |
|---------|--------|
| Cards, buttons, inputs | `2px` (nearly sharp) |
| Status badges | Pill (`border-radius: 999px`) — small badges only |

---

## Cards

Cards feel like **clean operational panels** — not sticker-like blocks with hard shadows.

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Radius | `2px` |
| Border | None |
| Shadow | None |

---

## Buttons

### Primary CTA

| Property | Value |
|----------|-------|
| Background | `#09D40B` |
| Text | `#121212`, sentence case, `font-weight: 600` |
| Height | `52px` |
| Border | `2px solid #121212` |
| Radius | `2px` |
| Shadow | None |

### Secondary / outline

Transparent background, `1–2px solid #121212` border, black text, no shadow.

---

## Status Badges

Outlined pills with status-specific fills:

| Status | Fill |
|--------|------|
| Prêt pour retrait | `#09D40B` |
| Livré au casier | `#FFB800` |
| Other | `#FFFFFF` or `#F5F6F7` |

---

## Icons

| Property | Value |
|----------|-------|
| Library | **Lucide Icons** (web), Feather (mobile) |
| Stroke width | `2` |

---

## Marketing Website (InPost-inspired)

- Hero: large headline + tracking input with green flat CTA
- Feature cards: white, thin grey border, no shadow, nearly sharp corners
- No glass header, no gradient text, no dot-grid backgrounds
- Green used only for CTAs and live-status dots

---

## Surface-Specific Feel

### Customer Mobile

Live parcel control panel. Status → Parcel → Action.

### Courier Mobile

Industrial handheld scanner — large buttons, high contrast, minimal decoration.

### Admin / Business Portal

Operational workspace — KPI tiles with thin borders, scannable tables, filter chips with emphasis on selection.

---

## Related Docs

- [Brand voice & French UI terms](brand.md)
- [Customer mobile features](features/customer-mobile.md)
- [Courier mobile features](features/courier-mobile.md)
- [Admin dashboard features](features/admin-dashboard.md)
- [Business portal](features/business-portal.md)
