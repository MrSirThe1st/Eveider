# Glossary

Domain terms, entities, and status definitions for Eveider. Use these names in code, APIs, and UI unless an external integration requires otherwise.

## Entities

| Entity | Description |
|--------|-------------|
| **User** | Account with a role: customer, courier, business, or admin |
| **Business** | Registered company that submits parcels for delivery through Eveider |
| **Parcel** | An item being delivered through the locker network; belongs to a business and a recipient customer |
| **Locker** | A physical locker installation at a location |
| **Compartment** | A single slot within a locker; holds one parcel at a time |
| **Delivery** | Courier assignment linking a parcel to a route action (scan, drop-off) |
| **PickupPIN** | Short-lived code the customer uses to open the compartment |
| **Notification** | SMS or in-app message tied to parcel or account events |
| **Issue** | Support ticket or operational exception (failed delivery, damaged parcel, offline locker) |

## Parcel Statuses

Canonical lifecycle — implement as an enum; reject invalid transitions.

| Status | Meaning |
|--------|---------|
| `created` | Parcel submitted by a business (or system); not yet in courier custody |
| `in_transit` | Courier has custody; en route to locker |
| `delivered_to_locker` | Courier confirmed drop-off; compartment assigned |
| `ready_for_pickup` | PIN issued; customer may collect |
| `collected` | Customer retrieved parcel; terminal state |

### Valid Transitions

```
created          → in_transit
in_transit       → delivered_to_locker
delivered_to_locker → ready_for_pickup
ready_for_pickup → collected
```

Failed delivery and admin overrides may introduce exception paths — document each in `project-updates.md` and an ADR when implemented.

## Business Account States

| State | Meaning |
|-------|---------|
| `pending` | Registered; awaiting Eveider approval (if approval gate enabled) |
| `active` | Can submit new parcels |
| `suspended` | Cannot submit new parcels; existing in-flight parcels continue |
| `blocked` | Account disabled; no new activity |

## Locker & Compartment States

| State | Applies to | Meaning |
|-------|------------|---------|
| `active` | Locker | Online and accepting operations |
| `offline` | Locker | Not reachable; no new drop-offs |
| `full` | Locker | No free compartments |
| `available` | Compartment | Empty and assignable |
| `occupied` | Compartment | Holds a parcel |
| `reserved` | Compartment | Held for incoming delivery (if supported) |

## Delivery (Courier) States

Operational labels for courier UI and admin monitoring — align with parcel status but may include assignment metadata:

| Label | Meaning |
|-------|---------|
| Assigned | Courier owns the delivery task |
| Scanned | Parcel scanned at warehouse / hub |
| Drop-off pending | En route or at locker, not yet confirmed |
| Completed | Drop-off confirmed |
| Failed | Exception raised; requires resolution |

## Issue Types

| Type | Reporter | Examples |
|------|----------|----------|
| Failed delivery | Courier | Recipient locker full, access blocked |
| Locker unavailable | Courier / system | Offline, mechanical fault |
| Parcel problem | Customer | Wrong item, damaged, missing PIN |
| Locker system | Admin / monitoring | Sync failure, sensor error |

## Acronyms & Integrations

| Term | Meaning |
|------|---------|
| OTP | One-time password for login verification |
| PIN | Pickup code for compartment access |
| SMS | Primary channel for OTP and pickup PIN delivery (MVP) |

## Related Docs

- [Overview](overview.md)
- [Roles & flows](roles-and-flows.md)
- [Brand terminology](brand.md)
