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

### Parcel Submission

Create parcels for locker delivery:

- Recipient name and phone (for PIN SMS and customer app linking)
- Parcel reference / order ID (business-internal)
- Destination locker (select from map/list with availability) or locker area preference
- Optional notes (size, fragile, etc.)

Submission sets parcel status to `created` and attaches `businessId`.

Bulk import (CSV) is **out of MVP** unless added in a later phase.

### Parcel Tracking (Business Scope)

- List of all parcels belonging to the business
- Filter by status, date, locker, reference
- Detail view: lifecycle timeline, locker assignment, collection status
- **No pickup PIN display** — PIN is customer-only; business sees collection status only

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
- Business users **cannot** access courier assignments, locker admin controls, other businesses' data, or customer PINs
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
