# Courier Mobile Features

Screens and behavior for **courier mode** in the Eveider mobile app.

## Purpose

Couriers complete assigned deliveries: scan parcels, drop off at lockers **with a photo of the deposit**, confirm completion, and report exceptions.

**Design:** Industrial handheld-scanner feel — large buttons, large scan area, minimal decoration. See [design-dna.md](../design-dna.md). All UI copy in **French**.

## Screens

### Delivery Dashboard

- Assigned deliveries list, ordered by a suggested nearest-locker itinerary for active stops
- 90-day performance strip (completed, failed, success rate) opening history
- WhatsApp contact to dispatch (communication only — does not change delivery state)
- Filters: in progress, incidents, completed (90-day window)

**Entry point** after courier login.

### Delivery Detail

Per-assignment view:

- Parcel info (reference, size if relevant)
- Destination locker (name, address, map link)
- Customer reference (not full PII beyond operational need)
- Current status and allowed next actions
- WhatsApp dispatch contact

### Scan & Confirm

- Barcode / parcel scan (camera or manual entry)
- Confirm pickup from warehouse or hub
- Validates parcel matches assignment

Failed scan → surface error; do not advance status without confirmation.

### Locker Drop-off

- Confirm arrival at locker (`drop_off_pending`)
- Photograph the parcel in the compartment (required)
- Confirm drop-off completion with that photo
- Triggers parcel transition toward `delivered_to_locker` / `ready_for_pickup` per business rules

On a **return** delivery (`kind = return`), the same scan → arrive → photo sequence remits the parcel to the merchant: compartment released, PIN invalidated, parcel status unchanged.

Courier must not drop off to offline or full lockers — block with clear message and issue reporting path. Recipient signature is **out of scope** — Eveider is locker-first. Return remittance is not blocked by locker fullness.

### Issue Reporting

| Issue type | When |
|------------|------|
| Failed delivery | Cannot complete handoff |
| Locker unavailable | Offline, full, or access blocked |
| Parcel damaged / missing | Custody or condition problem |

Each report creates an **Issue** for admin resolution and may fail the delivery. WhatsApp is for talking to dispatch, not for changing delivery state.

### Delivery History

- Completed and failed deliveries for the last **90 days**
- Operational metrics: completed count, failed count, success rate
- No earnings / pay

### Notifications

In-app inbox for couriers:

- New assignment
- Destination locker blocked (offline / full / archived)

No recipient courier-arrival ETA. Recipients are notified when the parcel is ready at the locker.

## Courier Flow Summary

```
Login → Assigned deliveries → Scan → Arrive at locker → Photo proof → Confirm
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
