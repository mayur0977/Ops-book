# Phase 5 — Labour attendance & wages

**Size:** XL — the sponsor's priority module
**Depends on:** Phase 4
**Goal:** a month of attendance settles to a payable figure that matches a
manual calculation, and the muster roll works with the network off.

## Why now

It is the highest-frequency screen in the product, it is the sponsor's stated
priority, and it depends only on Phase 4's payment primitives. The pilot
business gets real daily value the moment it lands.

## Tasks

### Schema
- [ ] `workers` — profile, photo, joining date, status, custom fields
- [ ] `labour_groups` — contractor/thekedar crews
- [ ] `wage_profiles` — wage_type, rate, effective_from, OT threshold &
      multiplier, half-day factor
- [ ] `muster_days`, `attendance_entries`
      — **UNIQUE (business_id, work_date, worker_id)**
- [ ] `piece_work_entries`
- [ ] `wage_advances`, `wage_deductions`, `wage_payments`
- [ ] `wage_periods` (with `locked_at`), `wage_settlements`
- [ ] `labour_ledger_entries` — append-only
- [ ] `holiday_calendar`
- [ ] Optional `attendance_order_allocations` for job costing

### Core — shared, and the reason `@daybook/core` exists
- [ ] `wages.ts`: earned-per-period for all four wage types
      - `daily` — (full + half × factor) × rate + OT
      - `hourly` — normal × rate + OT hours × rate × multiplier
      - `piece_rate` — Σ (units × rate per unit)
      - `monthly` — salary × (payable days ÷ period days)
- [ ] Ledger balance: earned − advances − deductions − paid
- [ ] Pure functions, explicit clock, fully unit-tested

### API
- [ ] Worker & group CRUD; wage profile with effective-from history
- [ ] **Batch muster upsert** — idempotent, partial success, one transaction
- [ ] Attendance query by date range / worker
- [ ] Attendance modes: `muster | punch | punch_photo | punch_geo`
      (geo flags out-of-radius, never auto-rejects)
- [ ] Advances, deductions, payments — all with payer and method
- [ ] Period settlement: compute → record payment → **lock period**
- [ ] Amend locked attendance: requires `labour.attendance.amend` + reason,
      posts an adjustment into the **next** period
- [ ] Registers: muster grid, wage register, outstanding wages, advances

### Mobile — the muster roll is a designed screen, not a list
- [ ] **Muster roll**: date header, worker rows, large segmented P/A/H/L,
      one tap cycles, "Mark all present", single batch save
- [ ] **Works fully offline** — build this path first
- [ ] Target: 12 workers marked in under 15 seconds
- [ ] Worker detail: ledger, advances, attendance history
- [ ] Advance / payment entry sheets
- [ ] Wage period settlement flow with a pre-save summary
- [ ] Muster register month grid (horizontally scrollable)
- [ ] Read `docs/design/apple-hig.md` §6 before building this

### Tests
- [ ] Wage maths per type against hand-computed fixtures
- [ ] Effective-from rate change does not rewrite settled history
- [ ] Muster batch is idempotent — double submit marks once
- [ ] Locked period rejects mutation; amendment lands in the next period
- [ ] Group settlement pays once while attendance stays per-worker
- [ ] Holiday/weekly-off not counted as absence
- [ ] Ledger balance reconciles across a full period
- [ ] Cross-tenant 404 on every labour endpoint

## Exit criteria

- [ ] A month of attendance for 10+ workers settles to a payable figure
      **matching a manual calculation**
- [ ] The muster roll opens, marks and saves in aircraft mode, and syncs on
      reconnection **without duplicates**
- [ ] A settled period is immutable; a later correction appears as an
      adjustment in the following period
- [ ] All four wage types compute correctly
- [ ] A contractor group settles as one payment
- [ ] Muster and wage registers reconcile to the ledger
- [ ] The app states, visibly, that this is not statutory payroll

## Out of scope

PF, ESI, professional tax, TDS, statutory registers. This is an operational
wage ledger — say so in the app so nobody files from it.

## Notes

Wage figures shown on-device use the **same** `@daybook/core` functions the
server runs at settlement. Never reimplement the maths in the app: two
implementations that drift is an argument with a worker about their pay.
