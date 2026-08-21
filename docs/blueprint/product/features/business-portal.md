# Business Portal Features

Screens and behavior for the **Eveider business web portal** — retailers and operators who register to send parcels through the locker network.

## Purpose

Businesses onboard to Eveider, submit parcels for locker delivery, and track outcomes for their own shipments. Eveider operations handle couriers, lockers, and exceptions.

**Design:** Operational B2B workspace — same design DNA as admin; not SaaS startup UI. See [design-dna.md](../design-dna.md). All UI copy in **French**. Pricing displays **USD** and **FC** when applicable.

## Who Uses It

| User | Description |
|------|-------------|
| **Business account** | Registered company (shop, e-commerce, pharmacy, etc.) |
| **Business user** | Staff member logged into that company's portal |

One business can have multiple users (MVP: single owner user; team invites later).

Data loading for these screens follows [`docs/blueprint/ai/data-fetching.md`](../../ai/data-fetching.md): page-specific snapshots, Server Components for lists, no full KYC graph on dashboard routes.

## Screens

### Registration & Onboarding

- **Register business** — company name, contact details, business type, delivery volume estimate
- **Verification** — email / phone verification (align with platform auth)
- **Pending approval** — shown until Eveider admin activates the account (if approval gate is enabled)
- **Welcome / setup** — overview of how locker delivery works, link to create first parcel

### Business Dashboard

- Active parcels overview (by status)
- Today's submissions and completions
- Failed or exception parcels requiring attention
- Quick action: create new parcel

### Locations / lockers

Businesses need to know where they can send parcels. The **Points Eveider** screen lists the live network (read-only — no locker admin):

- Location (e.g. Casier — Gombe)
- Address
- Capacity
- Available compartments
- Operating status (active / full / offline)

From a row, the business can start a parcel pre-filled with that point. When creating a parcel, pickup/destination selection shows the same availability copy (`12 compartiments disponibles`).

### Parcel Submission

Create parcels for locker delivery:

- Recipient name and phone (for PIN SMS and customer app linking)
- Parcel reference / order ID (business-internal)
- Destination locker (select from map/list with availability and operating status)
- Optional notes (size, fragile, etc.)

Submission sets parcel status to `created` and attaches `businessId`.

Bulk import (CSV) is **out of MVP** unless added in a later phase.

### Parcel Tracking (Business Scope)

- List of all parcels belonging to the business
- Filter by status, date, locker, reference
- Detail view: lifecycle timeline, locker assignment, collection status
- **Current location** is derived (`resolveBusinessParcelLocation`) from parcel status + pickup type + latest delivery — not a second stored status. See [ADR-002](../../decisions/ADR-002.md) and [glossary](../glossary.md).
- Pickup wording differs: courier pickup includes awaiting courier / courier assigned; merchant drop-off uses awaiting drop-off and skips courier assigned.
- **Keep arrived at point vs ready for pickup distinct** on the timeline.
- **No pickup PIN display** — PIN is customer-only; business sees collection status only
- **No courier name or phone** — “courier assigned” is a location, not an ops contact
- **No business Livraisons nav** — movement stays an admin concept; relevant delivery facts appear on parcel detail only
- **Destinataires** (later, if needed): read-only grouping of this company’s parcels by phone; no independent recipient create

### Parcel Submission

### Business Profile & Settings

- View / edit company profile
- Contact and notification preferences
- Billing placeholder (out of MVP — no payment flows yet)
- Team / users (deferred — single user for MVP)

### Support

- Report parcel or delivery issue for a specific shipment
- Contact Eveider operations
- View open issues tied to business parcels

## Business Flow Summary

```
Register → (Approval) → Dashboard → Create parcel → Track until collected
```

When the business has checkout integration:

```
Customer checkout → Locker selection → Parcel created by business system → …standard lifecycle
```

## Data Access Rules

- Business users see **only parcels** belonging to their `businessId`
- Business users **cannot** access courier identity, locker admin controls, other businesses' data, or customer PINs
- Derived location may show that a courier is assigned without exposing who
- Parcel creation is allowed for `active` businesses only
- Admin can block a business — blocks new submissions; existing in-flight parcels follow normal ops rules

## Relationship to Other Roles

| Step | Business | Eveider ops | Courier | Customer |
|------|----------|-------------|---------|----------|
| Register / submit parcel | ✓ | Approve (if gated) | — | — |
| Assign & deliver | — | ✓ | ✓ | — |
| Track & collect | Status only | ✓ | Assigned only | PIN + tracking |

## MVP Priorities

1. Business registration + profile
2. Parcel submission (single parcel form)
3. Business-scoped parcel list and detail
4. Admin business approval / activate / block
5. Checkout / API integration (deferred)

## Related Docs

- [Roles & flows](../roles-and-flows.md)
- [Glossary](../glossary.md)
- [Admin dashboard](admin-dashboard.md)
- [Customer mobile](customer-mobile.md)
