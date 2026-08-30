# ADR 0003 — Web deferred, and not an Expo Web target

**Status:** Accepted · 2026-08-30

## Context

PRD v2 targeted iOS, Android and web together. Mobile is where daily entry
happens; web is for owner/partner review, reporting and administration.

## Decision

Ship mobile first. Web is out of scope until after mobile UAT. When it comes it
enters this repository as `apps/web` — a Next.js application importing the same
`@opsbook/contracts` and `@opsbook/core`.

## Consequences

Cuts meaningful scope from the first release without losing anything the pilot
needs on day one.

Expo Web inside `apps/mobile` would be faster to start, but desktop tables,
filters and multi-column reports in React Native are genuinely painful, and the
web surface is a different interface — not the same screens on a bigger canvas.
The monorepo makes the separate app cheap, since the contract is shared.
