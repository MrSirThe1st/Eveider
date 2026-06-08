# Customer Mobile Features

Screens and behavior for **customer mode** in the Eveider mobile app.

## Purpose

Customers track parcels, receive pickup PINs, and collect items from lockers without coordinating with a courier.

**Design:** Live parcel control panel — status card first, no promo banners. See [design-dna.md](../design-dna.md). All UI copy in **French**.

## Screens

### Home Dashboard

- Active parcels overview
- Delivery status cards (lifecycle at a glance)
- Quick access to pickup PINs for `ready_for_pickup` parcels
- Notifications preview

**Primary actions:** Open tracking, open PIN screen, view notifications.

### Parcel Tracking

**List** — All parcels for the logged-in customer, sortable by status and date.

**Detail** — Per-parcel view with full status timeline:

| Status | Customer-facing label |
|--------|----------------------|
| `created` | Created |
| `in_transit` | In transit |
| `delivered_to_locker` | Delivered to locker |
| `ready_for_pickup` | Ready for pickup |
| `collected` | Collected |

Show locker name, address, and compartment reference when assigned.

### Locker Selection (business checkout)

When a **registered business** offers locker delivery at purchase / checkout:

- Map or list of locker locations
- Locker detail: address, availability indicator, distance from user

Selection binds the parcel to a locker location; the business submits the parcel to Eveider and the standard delivery flow continues.

### Pickup Screen

Shown when parcel is `ready_for_pickup`:

- **Pickup PIN** — large, copy-friendly display
- Parcel details (reference, sender if available)
- Locker location and directions
- **How to collect** — step-by-step instructions at the locker

PIN must not be shown before `ready_for_pickup`.

### Notifications

| Event | Channel | Content |
|-------|---------|---------|
| Delivery status change | Push / in-app | Status + locker reference |
| PIN ready | SMS + in-app | PIN + locker location |
| Pickup reminder | Push / SMS | Time-sensitive nudge to PIN screen |
| Failed delivery | Push / in-app | What happened + next steps |

### Support

- Report an issue (links to parcel if applicable)
- Contact support
- Parcel problem form (wrong item, damaged, missing PIN)

Issues create **Issue** records visible to admin.

## Customer Flow Summary

```
Login → Home → Tracking → PIN Screen → Collected
```

Optional: `Checkout → Locker selection → …`

## Data Access Rules

- Customer sees **only their own** parcels, PINs, and notifications
- Locker availability is read-only
- No courier assignment or admin actions

## MVP Priorities

1. Home + tracking + status detail
2. PIN pickup screen
3. Notifications (especially SMS PIN)
4. Support / issue reporting
5. Locker selection at checkout (when integrated)

## Related Docs

- [Roles & flows](../roles-and-flows.md)
- [Glossary](../glossary.md)
- [Brand](../brand.md)
