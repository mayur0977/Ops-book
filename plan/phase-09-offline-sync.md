# Phase 9 — Offline sync engine

**Size:** XL
**Depends on:** Phase 8 (and on Phase 1's idempotency groundwork)
**Goal:** a full day of offline entry across every module syncs with zero
duplicates under forced retries.

## Why now, and not earlier

The **contract** was fixed in Phase 1 — `Idempotency-Key`, `client_uuid`,
`version` columns. That is what makes this phase tractable rather than a rewrite.
Individual screens have been offline-capable since Phase 5; this generalises it.

## Tasks

### Local (mobile)
- [ ] expo-sqlite schema mirroring recent tenant data
- [ ] `outbox` table + state machine (pending/syncing/synced/failed/conflict)
- [ ] TanStack Query persistence for cold-start reads
- [ ] Sync cursors in MMKV

### API
- [ ] `POST /sync/push` — batch, per-operation results, partial success
- [ ] `GET /sync/pull` — per-entity cursor with tombstones
- [ ] Conflict detection via `version`
- [ ] Batch size limits and payload caps

### Mobile
- [ ] Sync orchestrator: backoff with jitter, foreground/background triggers
- [ ] **Conflict inbox** — money, attendance and status are never auto-resolved
- [ ] Visible sync chip: synced / N pending / N needs attention
- [ ] Visible failed queue with manual retry
- [ ] Photo queue separate from record queue

### Tests
- [ ] A day of offline entry across every module → zero duplicates
- [ ] Forced retry storm creates nothing extra
- [ ] Money conflict surfaces rather than overwriting
- [ ] Attendance conflict surfaces
- [ ] Tombstoned deletes propagate
- [ ] Airplane-mode E2E for the full daily flow

## Exit criteria

- [ ] Full offline day syncs cleanly with zero duplicates under forced retries
- [ ] No financial or attendance conflict is ever silently resolved
- [ ] Sync state is visible and accurate at all times
- [ ] Failed items are visible and manually retryable
