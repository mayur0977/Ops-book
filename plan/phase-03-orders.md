# Phase 3 — Contacts & orders

**Size:** L
**Depends on:** Phase 2
**Goal:** an order moves through its full configured workflow and its timeline
reconstructs every change.

## Tasks

### Schema
- [ ] `customers`, `suppliers`
- [ ] `orders` — UNIQUE (business_id, order_number)
- [ ] `order_items` with `custom_fields`
- [ ] `order_events` (the timeline)

### API
- [ ] Customer/supplier CRUD + search
- [ ] Order CRUD; order number generation (business-scoped, gap-tolerant)
- [ ] Status transitions validated against `order_statuses`
- [ ] Timeline events written on every material change
- [ ] Additional items as separate dated events — never edits to the original
- [ ] Search/filter: number, customer, mobile, status, date range
- [ ] Duplicate-as-template

### Mobile
- [ ] Order list with filters and empty/offline/error states
- [ ] Order detail with timeline
- [ ] Create/edit order with dynamic item fields
- [ ] Customer picker with inline create
- [ ] Status change with a confirmation sheet
- [ ] Quick Add → new order

### Tests
- [ ] Full workflow traversal; terminal status blocks further transitions
- [ ] Order number uniqueness under concurrency
- [ ] Timeline reconstructs every change
- [ ] Cross-tenant 404 on all order endpoints

## Exit criteria

- [ ] An order traverses Draft → Completed on a real device
- [ ] Its timeline reconstructs every change with actor and timestamp
- [ ] Search returns correctly across all five filters
- [ ] A furniture order and a fabrication order use the same screens

## Out of scope

Payments and balance — Phase 4. An order has an amount but no money movement yet.
