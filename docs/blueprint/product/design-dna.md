# Pickup Locker Design DNA

Visual and interaction standards for Eveider. All surfaces — mobile, business portal, admin, and marketing website — share this system.

Implementation tokens should live in `packages/config-ui` (or equivalent) and mirror values here exactly.

## Visual Personality

Imagine if:

- The Courier Guy
- Tesla's software UI
- Modern airport wayfinding systems
- Industrial logistics equipment

had a child.

The result must feel:

- Professional
- Structured
- Operational
- Reliable
- Industrial
- Modern

**Never:** playful, cute, startup-ish, or "AI generated".

**Target reaction:** *"This is the software behind a serious logistics network."*  
Not: *"This is a startup trying to become a logistics network."*

---

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Primary brand | `#09D40B` | Active, ready, available, completed — use sparingly |
| Secondary | `#121212` | Primary text, strong UI chrome |
| Surface | `#FFFFFF` | Cards, panels, primary content areas |
| Background | `#F5F6F7` | Page / screen background |
| Border | `#E7EAEC` | Card borders, dividers |
| Success | `#09D40B` | Same as primary — positive operational state |
| Warning | `#FFB800` | Attention required, non-blocking |
| Danger | `#E53935` | Failure, blocked, critical |
| Info | `#1677FF` | Informational states, links |

### Color Distribution

| Share | Color | Role |
|-------|-------|------|
| 60% | White | Surfaces, cards, content |
| 25% | Light grey (`#F5F6F7`, borders) | Background, structure |
| 10% | Black (`#121212`) | Typography, emphasis |
| 5% | Green (`#09D40B`) | Meaning only — rare |

**Green means something.** When users see green, they immediately know: ready, active, available, completed. Do not use green decoratively.

**Avoid:** gradient backgrounds, purple accents, glassmorphism, blurred panels, animated blobs, abstract SaaS illustrations.

---

## Typography

| Property | Value |
|----------|-------|
| Font family | **Inter** |
| Weights allowed | 500, 600, 700 only |
| Weights forbidden | 300, 400, 800, 900 |

Bold operational typography — same discipline as The Courier Guy.

### Heading Style

Headings and card titles use **ALL CAPS** (French: same rule — majuscules for operational labels).

| Correct | Wrong |
|---------|-------|
| TRACK YOUR PARCEL | Track your parcel |
| READY FOR COLLECTION | Ready for Collection |
| SUIVEZ VOTRE COLIS | Suivez votre colis |
| PRÊT POUR RETRAIT | Prêt pour retrait |

Sentence-case is allowed for body copy and long-form marketing paragraphs only.

---

## Cards

Cards are the heart of the system. They should feel like **physical operational panels** — airport check-in kiosks, parcel counters, control panels.

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` |
| Radius | `12px` |
| Border | `1px solid #E7EAEC` |
| Shadow | Very subtle — never floating |

**Never:** glassmorphism, heavy elevation, blurred backgrounds.

### Example (customer PIN card)

```
┌─────────────────────┐
 PRÊT POUR RETRAIT

 Colis :
 PK-28473

 Casier :
 Mall East

 PIN :
 4831

 [RETIRER LE COLIS]
└─────────────────────┘
```

---

## Buttons

### Primary

| Property | Value |
|----------|-------|
| Background | `#09D40B` |
| Text | `#121212` |
| Height | `52px` |
| Radius | `10px` |
| Font weight | `600` |
| Label style | ALL CAPS preferred for primary actions |

Buttons must feel **solid** — not pill-shaped, not futuristic capsules.

Secondary and destructive buttons use white/grey surfaces with `#121212` or `#E53935` text; green remains reserved for forward / success actions.

---

## Icons

| Property | Value |
|----------|-------|
| Library | **Lucide Icons** |
| Stroke width | `2` |

Preferred icons: Package, MapPin, Truck, Lock, Shield, CheckCircle.

**No** illustrations, mascots, emoji-style graphics, or custom cartoon assets.

---

## Surface-Specific Feel

### Customer Mobile App

On open, the **first thing visible is parcel status** — not promotions, banners, or announcements.

The app is a **live parcel control panel**.

**Screen structure**

1. Header
2. Current parcel status card
3. Quick actions
4. Recent activity

**Visual hierarchy:** Status → Parcel → Action. Everything else is secondary.

### Courier Mobile App

Tougher, almost **industrial**. Think warehouse handheld scanner — not a consumer lifestyle app.

- Large buttons
- Large scan area
- Big status indicators
- Very little decoration
- High contrast for outdoor / warehouse use

### Admin Dashboard

Strongest Courier Guy inspiration.

```
┌──────┬──────┬──────┬──────┐
│ Parc │ Lock │ Fail │ Live │
└──────┴──────┴──────┴──────┘
```

- Large KPI row at top
- Data tables below — operations teams trust tables
- Filters, operational feeds, maps, status indicators
- Avoid excessive charts; prefer scannable tabular data

### Business Portal

Same design DNA as admin — operational B2B workspace, not SaaS marketing UI. Tables, filters, clear parcel submission forms. White cards on grey background.

### Marketing Website

**Not** a SaaS startup landing page.

| Use | Avoid |
|-----|-------|
| Large photography (real lockers, parcels, locations) | Abstract illustrations, 3D renders |
| Black typography, green actions | Gradient heroes, purple palettes |
| Strong spacing, large sections | Glass cards, animated blobs |

#### Landing hero pattern

- White background
- Large ALL CAPS headline
- Generous whitespace
- Real locker photography on the right — no illustration

**Example (French — primary market)**

```
RETIREZ VOS COLIS.
À TOUT MOMENT.

Casiers sécurisés à travers le Congo.

[TROUVER UN CASIER]  [SOLUTIONS ENTREPRISES]
```

---

## Market & Locale

Eveider operates in the **Democratic Republic of Congo (RDC)**.

| Aspect | Standard |
|--------|----------|
| Primary UI language | **French** |
| Secondary language | English (internal docs, agent rules — not default user UI) |
| Currencies | **USD** (`$`) and **Franc congolais** (`FC` / `CDF`) |
| Currency display | Show both when pricing/fees apply; use locale-appropriate formatting (e.g. `1 250 FC`, `$12.00`) |
| Date / time | Format for DRC users; 24h clock acceptable for operational UI |

All user-facing copy in apps, portal, admin, SMS templates, and public website defaults to **French**. Status labels and button text follow ALL CAPS rules where specified above.

French terminology aligns with [brand.md](brand.md#glossaire-français-ui).

---

## Photography & Imagery

Use only:

- Real locker hardware
- Real parcels and handoff moments
- Real Congolese locations and urban context where possible

Never stock "startup team high-fiving" or generic logistics clip-art.

---

## Related Docs

- [Brand voice & French UI terms](brand.md)
- [Customer mobile features](features/customer-mobile.md)
- [Courier mobile features](features/courier-mobile.md)
- [Admin dashboard features](features/admin-dashboard.md)
- [Business portal](features/business-portal.md)
