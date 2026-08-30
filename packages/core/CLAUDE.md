# @opsbook/core

Pure business logic shared by the API and the mobile app: money arithmetic,
wage calculation, permission evaluation, order status rules.

## Why this package exists

The muster roll shows a worker's payable wage while the device is offline. The
server computes the same figure at settlement. If those were two
implementations they would eventually disagree — and that disagreement is an
argument with a worker about their pay. One implementation, two callers.

## Rules

- **Pure functions only.** No I/O, no dates from `Date.now()` passed implicitly
  (take a clock argument), no randomness. Everything here must be trivially
  unit-testable and deterministic.
- **Client-safe** — same restriction as `@opsbook/contracts`.
- **The server is still the authority.** On-device results are for display and
  offline confidence; the server recomputes on receipt and its answer wins.
- Money via `decimal.js`. Never a JS float, never `toFixed` for arithmetic.
- Wage functions take an explicit wage profile and attendance set — they never
  fetch anything.
