# ADR 0004 — Industry configuration as data, not code

**Status:** Accepted · 2026-08-30

## Context

The requirements were written for one furniture business, with furniture
concepts modelled as fixed columns (length/width/height, material, finish) and
fixed taxonomies (Polish/Paint, Wood Levelling). The product needs to be
adoptable by businesses in other trades without a fork per industry.

## Decision

Four mechanisms, all data:

1. `field_definitions` + `custom_fields JSONB` — per-business entity fields
2. `order_statuses` — workflow as rows
3. `businesses.label_overrides` — terminology
4. `businesses.modules_enabled` — module toggles

Vertical seed packs in `packages/verticals/` run **once** at business creation.
The vertical is never consulted at runtime.

## Consequences

Adding an industry is a new seed file, not a code change. If adding one requires
touching `apps/`, the abstraction has a hole — fix the abstraction, not the seed.

Enforced by `scripts/check-vertical-leak.sh` in CI: vertical vocabulary outside
`packages/verticals/` fails the build. This is crude and it is the single most
effective guard against the pilot vertical creeping back into the core.

**Not configurable, deliberately:** money arithmetic, tenant isolation, the audit
trail, the wage ledger's append-only discipline, the sync contract.
Configurability there would be a bug.
