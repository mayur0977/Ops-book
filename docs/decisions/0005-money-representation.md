# ADR 0005 — Money as NUMERIC, string on the wire, decimal in code

**Status:** Accepted · 2026-08-30

## Context

The product's core purpose is accountability for money: who paid, how much, for
what. BRD §7 exists because partners dispute contributions and workers dispute
wages. JavaScript numbers are IEEE-754 floats; `0.1 + 0.2 !== 0.3`.

## Decision

- **Storage:** `NUMERIC(14,2)` in Postgres
- **Transport:** JSON **string** — never a JSON number
- **Computation:** `decimal.js`, in `@opsbook/core`, on both server and device
- **Currency:** from `businesses.currency`, default INR

## Consequences

Slightly more ceremony at every boundary: parse on read, serialise on write. In
exchange, a rounding paisa can never appear in a partner settlement or a wage
payout — which is the exact class of bug that would destroy trust in the product.

`z.number()` for a money field is a review-blocking error. Contracts use
`z.string()` with a decimal refinement.
