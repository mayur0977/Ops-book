# Phase 7 — Stock & machinery

**Size:** L
**Depends on:** Phase 6
**Goal:** available quantity derives purely from movements, and landed cost per
unit is correct.

## Tasks

### Schema
- [ ] `materials` with custom fields
- [ ] `stock_entries`, `landed_cost_lines`, `stock_movements`
- [ ] `machines`, `machine_purchases`, `maintenance_logs`

### API
- [ ] Material master CRUD
- [ ] Stock entry with landed cost lines (transport, loading, unloading,
      processing — categories configured per business)
- [ ] Movements: purchase, consumption, adjustment, return, wastage, transfer
- [ ] Available quantity **derived from movements**, never stored
- [ ] Adjustments require a reason
- [ ] Machine CRUD, purchase record, maintenance history
- [ ] Warranty expiry and next-service dates (reminders wired in Phase 8)
- [ ] Planned purchase → actual purchase conversion

### Mobile
- [ ] Stock entry with landed cost lines and supplier bill photo
- [ ] Material list with derived available quantity
- [ ] Movement history
- [ ] Machine list, detail, maintenance log entry

### Tests
- [ ] Available quantity matches the sum of movements in every case
- [ ] Landed cost per unit correct with multiple cost lines
- [ ] Adjustment without a reason is rejected
- [ ] Cross-tenant 404 on all endpoints

## Exit criteria

- [ ] Quantity is derived, never stored, and reconciles
- [ ] Landed cost per unit verified against a hand calculation
- [ ] Maintenance history is independent of the purchase record

## Out of scope

Inventory valuation methods (FIFO/weighted average) — future scope, per the PRD.
