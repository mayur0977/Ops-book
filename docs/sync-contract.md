# Offline Sync Contract

**Designed in Phase 1. Implemented in Phase 9. Retrofitting it is a rewrite.**

Workshop users mark attendance at 8am in the part of the premises with the worst
signal. Offline is not a degraded mode here; it is the normal mode.

## The one rule that prevents most of the pain

Every mutating endpoint accepts an `Idempotency-Key` header. Every
offline-creatable row carries the `client_uuid` the device generated. The server
stores processed keys for 30 days and **replays the original response** on a
repeat.

That single rule kills the duplicate-payment class of bug before any sync code
is written. It is why this is a Phase 1 concern, not a Phase 9 one.

## Local storage

`expo-sqlite` holds a mirror of recent tenant data plus an outbox:

```
outbox(id, entity, op, payload, base_version, state, attempts, last_error, created_at)
state ∈ pending | syncing | synced | failed | conflict
```

## Push

`POST /api/v1/sync/push` takes a batch and returns a **per-operation** result:

```json
{ "results": [
  { "clientUuid": "…", "status": "applied",   "serverId": "…", "version": 3 },
  { "clientUuid": "…", "status": "duplicate", "serverId": "…" },
  { "clientUuid": "…", "status": "conflict",  "server": { … } },
  { "clientUuid": "…", "status": "rejected",  "error": { … } }
]}
```

Partial success is the normal case and must be handled. Do not fail a batch
because one item was rejected.

## Pull

`GET /api/v1/sync/pull?entity=<e>&since=<cursor>` — an updated-at cursor per
entity, with tombstones for deletions. Cursors are stored in MMKV.

## Conflict policy

| Data | Policy |
|---|---|
| Notes, descriptions, free text | Last write wins |
| **Money** (payments, expenses, wages) | **Never auto-resolve** — conflict inbox |
| **Attendance** | **Never auto-resolve** — conflict inbox |
| Order status | Never auto-resolve — conflict inbox |

Silently overwriting a financial record is the failure mode BRD §7 exists to
prevent. Surface it and let a person decide.

## Retry

Exponential backoff with jitter. After N failures an item moves to a **visible
failed queue** — never an infinite retry loop draining the battery.

## Attendance specifics

The muster roll batch is idempotent on `(business_id, work_date, worker_id)`.
A retry after a dead network cannot double-mark anyone. This is enforced by a
unique constraint, not by application logic.

## Media

Photos queue **separately** from records. The record syncs immediately; a 4MB
photo waits for a better connection. A slow upload must never block a payment
from reaching the server.

## Visible state

A persistent chip: `Synced` · `3 pending` · `1 needs attention`. Users tolerate
delay. They do not tolerate not knowing.
