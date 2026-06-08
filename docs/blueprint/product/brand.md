# Eveider Brand

Voice, naming, locale, and UX principles. Visual specs (colors, typography, components) live in [design-dna.md](design-dna.md).

## Name

**Eveider** — the product name. Use as a proper noun in UI and documentation.

Avoid abbreviations or alternate spellings in user-facing text unless a formal short form is defined later.

## Market

Eveider is built for **République Démocratique du Congo (RDC)**.

- **Language:** French for all user-facing product copy (mobile, portal, admin, website, SMS)
- **Currencies:** US dollar (USD, `$`) and franc congolais (CDF, `FC`)
- **Tone:** Professional logistics infrastructure — not Silicon Valley SaaS

## Positioning

Eveider is **reliable, clear, and operational**.

It is not a lifestyle brand or a generic delivery tracker. It is infrastructure for locker-based parcel handoff — built for people who need to know *where their parcel is*, *when they can collect it*, and *what to do next*.

**One-line description (FR)**

> Eveider connecte les entreprises, les clients, les coursiers et les opérations via des casiers de retrait intelligents.

**One-line description (EN — internal)**

> Eveider connects businesses, customers, couriers, and operations through smart pickup lockers.

## Voice & Tone

| Principle | Do | Don't |
|-----------|-----|-------|
| Clear | « Votre colis est prêt au casier Mall East. » | « Bonne nouvelle ! Votre colis continue son aventure ! » |
| Action-oriented | « Entrez le PIN au casier pour ouvrir votre compartiment. » | Long explanations before the next step |
| Calm under failure | « Livraison échouée. Nous vous informerons de la reprogrammation. » | Blame users or couriers |
| Operational precision | Use exact statuses from the glossary | Invent informal status labels in code or UI |
| Industrial confidence | Direct, structured, ALL CAPS for key labels | Playful, cute, startup hype |

See [design-dna.md](design-dna.md) for visual personality constraints (never playful, never "AI generated").

## UX Principles

1. **Status first** — Parcel status is the first thing on screen; no promo banners on customer home.
2. **PIN is sacred** — The pickup PIN is the customer's key action; prominent, readable, hard to miss.
3. **Role clarity** — Customer vs courier vs business vs admin each feel distinct; courier UI is industrial, customer UI is a control panel.
4. **Exception visibility** — Failed deliveries, offline lockers, and open issues are never buried.
5. **Green is meaning** — Brand green (`#09D40B`) only for ready / active / available / completed — see design DNA.
6. **Admin density over decoration** — Tables, KPIs, filters; not chart-heavy dashboards.

## Terminology (User-Facing)

Use consistent terms in French UI (English equivalents for internal docs):

| Français (UI) | English (internal) | Avoid |
|---------------|-------------------|-------|
| Colis | Parcel | Paquet, envoi (unless external quote) |
| Casier | Locker | Boîte, armoire |
| Compartiment | Compartment | Slot, bac |
| PIN de retrait | Pickup PIN | Code, mot de passe |
| Prêt pour retrait | Ready for pickup | Disponible, terminé |
| Coursier | Courier | Chauffeur (unless regional copy requires) |
| Entreprise | Business | Client, marchand (marketing only) |

Full domain definitions: [glossary.md](glossary.md).

## Glossaire français (UI)

Canonical French labels for statuses and primary actions. Use ALL CAPS for card titles and primary buttons per [design-dna.md](design-dna.md).

### Parcel statuses

| Status key | French UI label |
|------------|-----------------|
| `created` | CRÉÉ |
| `in_transit` | EN TRANSIT |
| `delivered_to_locker` | LIVRÉ AU CASIER |
| `ready_for_pickup` | PRÊT POUR RETRAIT |
| `collected` | RETIRÉ |

### Common actions

| Action | French UI label |
|--------|-----------------|
| Collect parcel | RETIRER LE COLIS |
| Track parcel | SUIVRE LE COLIS |
| Scan parcel | SCANNER LE COLIS |
| Confirm drop-off | CONFIRMER LE DÉPÔT |
| Find a locker | TROUVER UN CASIER |
| Business solutions | SOLUTIONS ENTREPRISES |
| Report issue | SIGNALER UN PROBLÈME |

## Notifications (French)

Short copy with actionable detail:

- **Mise à jour livraison** — statut + nom du casier
- **PIN de retrait** — PIN + adresse du casier + expiration si applicable
- **Rappel de retrait** — urgent, lien vers écran PIN
- **Échec de livraison** — ce qui s'est passé + prochaine étape

## Visual & Design

All visual rules — colors, typography, cards, buttons, icons, per-surface feel, website hero — are defined in **[design-dna.md](design-dna.md)**. Do not improvise palette or component styles outside that document.

## Related Docs

- [Design DNA](design-dna.md)
- [Overview](overview.md)
- [Roles & flows](roles-and-flows.md)
- [Glossary](glossary.md)
