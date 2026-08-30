# ADR 0002 — Drizzle instead of Prisma

**Status:** Accepted · 2026-08-30

## Context

The PRD v2 named Prisma. Prisma 7.10.0 is stable and its developer experience is
better. But the hardest requirement in this product is tenant isolation
(BR-001, Critical), and the strongest form of that is Postgres row-level
security driven by a per-transaction `SET LOCAL app.business_id`.

The reporting layer (BRD §14–15) is aggregate SQL — the kind of query that
fights an ORM regardless of which one is chosen.

## Decision

Drizzle ORM 0.45.x with Drizzle Kit for migrations.

## Consequences

Sits close enough to SQL that per-transaction RLS session variables and
hand-written reporting queries are natural rather than an escape hatch.
Migrations are plain SQL, which makes them reviewable and reversible.

The cost is a less polished developer experience than Prisma, and more
hand-written query code.

Prisma remains a defensible alternative **provided RLS is implemented
identically**. What is not acceptable is relying on application-level `WHERE`
clauses as the only isolation layer.
