# Eveider Node-RED / PLC reference

Phase 6 connects the Phase 5 locker authorization contract to hardware without
moving business rules into Node-RED or the PLC.

```text
Eveider backend
      ↕  HTTPS (locker API token)
   Node-RED
      ↕  LockerHardwareAdapter
      PLC  (protocol later: Modbus / OPC-UA / HTTP / serial / vendor)
      ↕
Terminal / doors / sensors
```

## Responsibility split

| Layer | Owns | Must not own |
| --- | --- | --- |
| Eveider | Parcel lifecycle, Livraison, Return, commercial authorization, compartment allocation, locker action sessions, collection credential issuance | Door actuation, local keypad, offline PIN compare at the terminal |
| Node-RED | Terminal routing, calling Eveider when online auth is required, passing OPEN to the adapter, durable outbox, pull-sync of credentials, local validation via `@eveider/locker-runtime` | Pricing, PawaPay, `paid=true`, parcel state machines |
| PLC | Keypad, latches, door/sensor runtime, optional local credential compare if the adapter pushes hashed credentials | Payment rules, driver assignment, return approval |

Online-required actions (deposit, driver pickup, business return pickup) **fail closed** if Eveider cannot authorize them. Only recipient collection may use a previously synchronized ACTIVE credential.

## Configuration

Set these in Node-RED environment / a local file that is **not** committed:

```text
EVEIDER_API_BASE_URL=https://<web-manager-host>
EVEIDER_LOCKER_API_TOKEN=<secret matching EVEIDER_LOCKER_API_TOKENS>
LOCKER_ID=<uuid>                 # optional local cache; backend identity comes from the token
SYNC_INTERVAL_MS=15000           # operational; do not hardcode in domain code
RETRY_INTERVAL_MS=5000
OCCUPANCY_REQUIRED=false         # true when compartment sensors are commissioned
HARDWARE_ADAPTER=stub            # stub until the PLC protocol is specified
```

Eveider backend:

```text
EVEIDER_LOCKER_API_TOKENS={"<lockerUuid>":"<secret>"}
EVEIDER_LOCKER_ACTION_TTL_SECONDS=180
EVEIDER_LOCKER_MAINTENANCE_TOKEN=<cron secret>
```

Default sync/retry intervals belong in operations, not domain code.

## Backend contracts

Authenticated with `Authorization: Bearer <locker secret>` (same Phase 5 tokens):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/locker/actions/authorize` | Online session + compartment |
| POST | `/api/locker/actions/:sessionId/confirm` | Physical success → domain transition |
| POST | `/api/locker/actions/:sessionId/cancel` | Abandon / hardware failure |
| GET | `/api/locker/sync/collection-credentials?since=<cursor>` | Pull credential changes |
| POST | `/api/locker/events/recipient-collection` | Offline Stage IV physical report |

Maintenance (`EVEIDER_LOCKER_MAINTENANCE_TOKEN`):

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/locker/maintenance/expire-sessions` | Reconcile expired reservations |
| GET | `/api/locker/maintenance/integrity` | Inconsistency report |

Schedule expiry with whatever cron the deployment already has, for example every minute:

```bash
curl -X POST "$EVEIDER_API_BASE_URL/api/locker/maintenance/expire-sessions" \
  -H "Authorization: Bearer $EVEIDER_LOCKER_MAINTENANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

This repository does not configure a cloud cron provider.

## Credential sync

Monotonic `sync_seq` cursor. Node-RED stores the last cursor and asks for `since=<cursor>`.
Changes: `activate` | `revoke` | `consume`. Pending unpaid credentials are **not** published.

Plaintext PIN remains in `pickup_pins` (and WhatsApp). The sync record stores `pin_hash` (SHA-256 hex of the trimmed PIN) only.

## Local state (minimum)

Persist in Node-RED **file-backed context** (or an equivalent local JSON file):

* locker identity / adapter config
* sync cursor
* active/consumed/revoked local credentials (id, version, hashes, compartment)
* pending physical confirmation events
* stable `deviceEventId`s

Do not persist the Eveider parcel database.

**Durability assumption:** Node-RED `contextStorage` with `module: "localfilesystem"` (or a small JSON file next to the flows). After restart, consumed credentials stay consumed and queued events keep their original `deviceEventId`. This is not a message broker.

## Hardware adapter

`packages/locker-runtime` defines `LockerHardwareAdapter`. The stub records OPEN + simulated evidence.

Physical success:

* Deposit: correct door opened, then closed, occupancy occupied when sensing is enabled
* Removal: opened, closed, occupancy empty when sensing is enabled

An OPEN command accepted is **not** a deposit or removal.

Sensor occupancy without a locker action session or a synchronized collection credential must not change parcel state.

## Import

Import `flows.json` into Node-RED as a reference skeleton. Keep Function nodes thin: call `@eveider/locker-runtime` or HTTP only. Do not copy commercial rules into the flow.
