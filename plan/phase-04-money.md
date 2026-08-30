# Phase 4 — Money

**Size:** M
**Depends on:** Phase 3
**Goal:** order balance and per-payer contribution reconcile exactly against
hand-computed fixtures.

## Why now

Wages (Phase 5) are built on the payment primitives defined here.

## Tasks

### Schema
- [ ] `payments` — amount NUMERIC(14,2), payer, method, reference, order link
- [ ] `expenses` — category, payer, method, links to order/stock/machine/labour
- [ ] `expense_categories` already seeded in Phase 2

### Core
- [ ] `@opsbook/core/money.ts` — add, subtract, allocate, format (decimal.js)
- [ ] Order balance calculation
- [ ] Per-payer contribution aggregation

### API
- [ ] Record payment (idempotent), void with reason (never hard delete)
- [ ] Expense CRUD with links
- [ ] Order balance on the order response
- [ ] **Audit every financial write** with before/after
- [ ] Completion requires zero balance, or `orders.complete.override` + reason

### Mobile
- [ ] Record payment sheet — `decimal-pad`, payer default = current user
- [ ] Expense entry with category picker
- [ ] Order balance prominent on the detail screen
- [ ] Payment history list with tabular figures

### Tests
- [ ] **Money is never a float** — a fixture set of awkward decimals reconciles
- [ ] Balance after partial payments is exact
- [ ] Per-payer totals match hand calculation
- [ ] Completion blocked with an outstanding balance; override path audited
- [ ] Voided payments leave an audit trail and do not vanish

## Exit criteria

- [ ] Order balance and per-payer contribution reconcile to hand-computed
      fixtures, including amounts like 1/3 splits
- [ ] Every financial mutation writes an audit row in the same transaction
- [ ] No `z.number()` on any money field anywhere
- [ ] Completion rule enforced, override audited

## Out of scope

Reports and summaries — Phase 10. This phase records; it does not analyse.
