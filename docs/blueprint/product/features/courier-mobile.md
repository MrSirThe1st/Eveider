# Courier Mobile Features

Screens and behavior for **courier mode** in the Eveider mobile app.

## Purpose

Couriers complete assigned deliveries: scan parcels, drop off at lockers, confirm completion, and report exceptions.

**Design:** Industrial handheld-scanner feel — large buttons, large scan area, minimal decoration. See [design-dna.md](../design-dna.md). All UI copy in **French**.

## Screens

### Delivery Dashboard

- Assigned deliveries list
- Priority and scheduled deliveries highlighted
- Filters: today, overdue, completed

**Entry point** after courier login.

### Delivery Detail

Per-assignment view:

- Parcel info (reference, size if relevant)
- Destination locker (name, address, map link)
- Customer reference (not full PII beyond operational need)
- Current status and allowed next actions

### Scan & Confirm

- Barcode / parcel scan (camera or manual entry)
- Confirm pickup from warehouse or hub
- Validates parcel matches assignment

Failed scan → surface error; do not advance status without confirmation.

### Locker Drop-off

- Select assigned locker compartment (or confirm system-assigned slot)
- Confirm drop-off completion
- Triggers parcel transition toward `delivered_to_locker` / `ready_for_pickup` per business rules

Courier must not drop off to offline or full lockers — block with clear message and issue reporting path.

### Issue Reporting

| Issue type | When |
|------------|------|
| Failed delivery | Cannot complete handoff |
| Locker unavailable | Offline, full, or access blocked |
| Parcel damaged / missing | Custody or condition problem |

Each report creates an **Issue** for admin resolution and may hold or reverse parcel status per rules.

### Delivery History

- Completed deliveries (date, locker, parcel reference)
- Performance overview (MVP: counts; advanced metrics later)

## Courier Flow Summary

```
Login → Assigned deliveries → Scan → Drop-off → Confirm
```

Exception:

```
Blocked at locker → Issue report → Admin resolves
```

## Data Access Rules

- Courier sees **only assigned** deliveries and related parcel/locker data
- No access to other couriers' assignments, customer PINs, or admin controls
- Status updates limited to courier-allowed transitions

## MVP Priorities

1. Delivery dashboard + detail
2. Scan & confirm
3. Locker drop-off + status update
4. Issue reporting
5. Delivery history

## Related Docs

- [Roles & flows](../roles-and-flows.md)
- [Glossary](../glossary.md)
- [Admin dashboard](admin-dashboard.md)
