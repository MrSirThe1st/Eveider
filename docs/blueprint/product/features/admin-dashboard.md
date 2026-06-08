# Admin Dashboard Features

Screens and behavior for the **Eveider admin web dashboard** — operations and management.

## Purpose

Give operations teams a single place to monitor deliveries, manage businesses/parcels/users/couriers/lockers, and resolve exceptions in real time.

**Design:** Courier Guy–inspired ops console — large KPI row, data tables, filters, minimal charts. See [design-dna.md](../design-dna.md). All UI copy in **French**.

## Screens

### Overview Dashboard

At-a-glance metrics for today:

| Metric | Description |
|--------|-------------|
| Total parcels | Created or in flight today |
| Active deliveries | In transit or drop-off pending |
| Completed deliveries | Successfully dropped off / collected |
| Failed deliveries | Open or resolved exceptions |
| Locker occupancy | Aggregate available vs. occupied compartments |

### Business Management

- Registered businesses list (pending, active, suspended, blocked)
- Business profile view (company details, contact, submission volume)
- Approve pending registrations (if approval gate enabled)
- Activate, suspend, or block businesses
- Parcels per business — drill-down from business record

### Parcel Management

- Full parcel list with filters (status, date, business, locker, courier)
- Parcel detail: lifecycle timeline, assignments, PIN status (masked/logged per policy)
- Manual status update (admin override — audit logged)

### User Management

**Customers**

- List, search, profile view
- Block / activate accounts

**Couriers**

- List, profile, activity summary
- Block / activate accounts

### Courier Management

- Assign deliveries to couriers
- View courier activity (active assignments, completions, failures)
- Performance tracking (MVP: delivery counts and failure rate)

### Locker Management

- Locker locations list (map + table)
- Per-locker status: `active`, `full`, `offline`
- Compartment grid: `available`, `occupied`, `reserved`
- Assignments overview — which compartments hold which parcels

### Delivery Monitoring (Live View)

- Real-time delivery tracking board
- Parcel movement timeline across statuses
- Exceptions and delays surfaced prominently

Designed for high scanability; supports filtering by locker, courier, and status.

### Support & Issues

- Customer complaints
- Courier reports
- Locker system issues
- Resolution tracking (open → in progress → resolved)

Link issues to parcels, lockers, and users where applicable.

### Analytics (MVP)

Simple reporting — no advanced BI in first release:

| Report | Definition |
|--------|------------|
| Daily deliveries | Count by day |
| Pickup success rate | Collected ÷ ready for pickup |
| Locker usage rate | Occupied compartments ÷ total |
| Top locations | Lockers by delivery or pickup volume |

## Admin Flow Summary

```
Dashboard → Monitor → Manage → Resolve issues
```

## Data Access Rules

- Admin has **full operational read** across all businesses and parcels on the platform
- Destructive actions (block user, manual status override) require audit trail
- PIN values may be visible for support — document access policy in ADR when implemented

## MVP Priorities

1. Overview dashboard
2. Business management (approve, activate, block)
3. Parcel management + live monitoring
4. Locker management (status + compartments)
5. Courier assignment
6. Support & issues
7. User management
8. Analytics

## Related Docs

- [Roles & flows](../roles-and-flows.md)
- [Glossary](../glossary.md)
- [Business portal](business-portal.md)
- [Courier mobile](courier-mobile.md)
