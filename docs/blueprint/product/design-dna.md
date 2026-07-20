# Pickup Locker Design DNA

Visual and interaction standards for Eveider. All surfaces — mobile, business portal, admin, and marketing website — share this **Industrial Neo-Brutalist** system, inspired by [InPost](https://inpost.co.uk/) logistics UI.

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
- Industrial
- High-contrast (readable in sunlight / warehouse)

**Never:** playful, cute, startup-ish, glassmorphism, gradient heroes, or "AI generated".

**Target reaction:** *"This is the software behind a serious logistics network."*

---

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Primary brand | `#09D40B` | Main CTAs, active nav, ready/available states — **max ~5% of screen** |
| Secondary | `#121212` | Primary text, borders, heavy headers |
| Surface | `#FFFFFF` | Cards, panels, primary content areas |
| Background | `#F5F6F7` | Page / screen background (concrete canvas) |
| Border | `#121212` | **All** structural borders — cards, inputs, buttons |
| Text muted | `#475569` | Body secondary copy, inactive labels |
| Success | `#09D40B` | Same as primary — positive operational state |
| Warning | `#FFB800` | Attention required (e.g. livré au casier) |
| Danger | `#E53935` | Failure, blocked, critical |
| Info | `#1677FF` | Informational states |

### Color Distribution

| Share | Color | Role |
|-------|-------|------|
| 60% | White | Surfaces, cards, content |
| 25% | Light grey (`#F5F6F7`) | Background, structure |
| 10% | Black (`#121212`) | Typography, borders, emphasis |
| 5% | Green (`#09D40B`) | Meaning only — CTAs & ready states |

**Green means something.** Use it like InPost uses yellow — sparingly, for action and status. Do not use green decoratively.

**Avoid:** `#E7EAEC` soft 1px borders, gradient backgrounds, purple accents, glassmorphism, blurred panels, diffuse drop shadows (`box-shadow: 0 4px 12px rgba(...)`).

---

## Borders & Shadows

| Property | Value |
|----------|-------|
| Border width | `2px` |
| Border color | `#121212` |
| Border style | `solid` |
| Card shadow | `3px 3px 0 #121212` (hard offset block) or none |
| Diffuse blur shadow | **Forbidden** |

Every card, container, button, and input uses `border: 2px solid #121212`.

---

## Typography

| Property | Value |
|----------|-------|
| Font family | **Inter** (500, 600, 700) |
| Operational headings & labels | ALL CAPS, `font-weight: 700`, letter-spacing |
| Body copy | Sentence case, `font-weight: 500` |

---

## Corners

| Element | Radius |
|---------|--------|
| Cards, buttons, inputs | `8px` max |
| Status badges | Pill (`border-radius: 999px`) — small badges only |

**Avoid:** rounded-full primary buttons, floating cards without borders.

---

## Cards

Cards feel like **physical operational panels** — parcel counters, kiosk screens.

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Radius | `8px` |
| Border | `2px solid #121212` |
| Shadow | `3px 3px 0 #121212` |

---

## Buttons

### Primary CTA

| Property | Value |
|----------|-------|
| Background | `#09D40B` |
| Text | `#121212`, ALL CAPS, `font-weight: 700` |
| Height | `52px` |
| Border | `2px solid #121212` |
| Radius | `8px` |
| Shadow | `3px 3px 0 #121212` optional |

### Secondary

White surface, `2px solid #121212` border, black uppercase text, hard shadow.

---

## Status Badges

Black-outlined pills (`2px solid #121212`) with status-specific fills:

| Status | Fill |
|--------|------|
| PRÊT POUR RETRAIT | `#09D40B` |
| LIVRÉ AU CASIER | `#FFB800` |
| Other | `#FFFFFF` or `#F5F6F7` |

---

## Icons

| Property | Value |
|----------|-------|
| Library | **Lucide Icons** (web), Feather (mobile) |
| Stroke width | `2` |

---

## Marketing Website (InPost-inspired)

- Hero: large ALL CAPS headline + **tracking input** with green "SUIVRE MON COLIS" CTA
- Feature cards: white, 2px border, hard shadow, 8px radius
- No glass header, no gradient text, no dot-grid backgrounds
- Green used only for CTAs and live-status dots

---

## Surface-Specific Feel

### Customer Mobile

Live parcel control panel. Status → Parcel → Action.

### Courier Mobile

Industrial handheld scanner — large buttons, high contrast, minimal decoration.

### Admin / Business Portal

Operational workspace — KPI tiles with hard borders, scannable tables, filter chips with block shadows.

---

## Related Docs

- [Brand voice & French UI terms](brand.md)
- [Customer mobile features](features/customer-mobile.md)
- [Courier mobile features](features/courier-mobile.md)
- [Admin dashboard features](features/admin-dashboard.md)
- [Business portal](features/business-portal.md)
