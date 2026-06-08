# Roles & Flows

How users interact with Eveider across mobile, business, and admin surfaces.

## User Roles

| Role | Surface | Primary goal |
|------|---------|--------------|
| **Customer** | Mobile app | Track parcels, receive PIN, collect from locker |
| **Courier** | Mobile app | Complete assigned deliveries via scan and locker drop-off |
| **Business** | Business portal | Register company, submit parcels, track own shipments |
| **Admin** | Admin dashboard | Monitor operations, manage businesses and entities, resolve issues |

A single mobile app serves customers and couriers. After login, the UI and navigation reflect the user's role. Business users use a separate web portal scoped to their company.

## Core Journeys (MVP)

### Customer

```
Login → Home → Tracking → PIN Screen → Pickup complete
```

1. **Login / register** — OTP or SMS verification
2. **Home** — Active parcels, delivery status cards, PIN quick access, notification preview
3. **Tracking** — Full parcel list and status detail per parcel
4. **PIN screen** — Active pickup code, parcel details, locker location, collection instructions
5. **Collected** — Terminal state; parcel moves off active home view

Optional path (when business checkout integration exists):

```
Business checkout → Locker selection → Parcel created → …standard flow
```

### Business

```
Register → (Approval) → Dashboard → Create parcel → Track until collected
```

1. **Register** — Company details, verification, pending approval if gated
2. **Dashboard** — Active parcels, submissions today, exceptions
3. **Create parcel** — Recipient, reference, destination locker; status → `created`
4. **Track** — Business-scoped list and timeline until `collected`
5. **Support** — Raise issues on specific parcels

Business users do not see pickup PINs or other businesses' data.

### Courier

```
Login → Assigned deliveries → Scan → Drop-off → Confirm
```

1. **Login** — Same auth stack as customer; role routes to courier dashboard
2. **Delivery dashboard** — Assigned deliveries, priority / scheduled items
3. **Delivery detail** — Parcel info, destination locker, customer reference
4. **Scan & confirm** — Barcode / parcel scan; confirm pickup from warehouse or hub
5. **Locker drop-off** — Select compartment, confirm drop-off completion
6. **Complete** — Delivery recorded; appears in delivery history

Exception path:

```
Drop-off blocked → Issue report → Admin resolution
```

### Admin

```
Dashboard → Monitor → Manage → Resolve issues
```

1. **Overview** — Today's parcels, active/completed/failed deliveries, locker occupancy
2. **Monitor** — Live delivery board, movement timeline, exceptions
3. **Manage** — Businesses, parcels, users, couriers, lockers, assignments
4. **Resolve** — Customer complaints, courier reports, locker system issues

## Shared Mobile Screens

Both customers and couriers use:

| Area | Screens |
|------|---------|
| Authentication | Splash, login, register, OTP / SMS verification |
| Profile | View profile, edit profile, settings, logout |

## Authorization Boundaries

| Action | Customer | Courier | Business | Admin |
|--------|----------|---------|----------|-------|
| View own parcels | ✓ | — | ✓ (own business) | ✓ (all) |
| Create / submit parcels | — | — | ✓ | ✓ |
| View assigned deliveries | — | ✓ | — | ✓ (all) |
| Update parcel to locker / collected | — | ✓ (assigned) | — | ✓ |
| View pickup PIN | ✓ (own) | — | — | ✓ |
| Assign deliveries to couriers | — | — | — | ✓ |
| Register / manage businesses | — | — | — | ✓ |
| Block / activate users or businesses | — | — | — | ✓ |
| Manage locker locations & status | — | — | — | ✓ |

Server-side role checks are required on every protected operation. See [AGENT_RULES.md](../ai/AGENT_RULES.md).

## Parcel Lifecycle (Cross-Role)

```
Created → In transit → Delivered to locker → Ready for pickup → Collected
```

| Status | Typical actor | Customer sees | Business sees | Courier sees | Admin sees |
|--------|---------------|---------------|---------------|--------------|------------|
| Created | Business / system | Tracking | Submitted | — | Parcel list |
| In transit | Courier / system | Tracking update | In transit | Active delivery | Live board |
| Delivered to locker | Courier | Notification | Delivered to locker | Confirm complete | Occupancy update |
| Ready for pickup | System (PIN issued) | PIN screen | Ready for pickup | — | Awaiting collection |
| Collected | Customer / locker | Complete | Collected | — | Analytics |

Details: [glossary.md](glossary.md).

## Related Docs

- [Overview](overview.md)
- [Customer mobile](features/customer-mobile.md)
- [Courier mobile](features/courier-mobile.md)
- [Business portal](features/business-portal.md)
- [Admin dashboard](features/admin-dashboard.md)
