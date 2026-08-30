# DayBook — Operations Platform

A mobile-first operations tracker for small production and service businesses.
Records orders, payments, expenses, materials, **labour attendance and wages**,
machinery, tasks and photographic evidence — offline-first, multi-tenant.

> **Name:** DayBook — the bookkeeping term for the book of original entry,
> the first place a transaction is written down. Decided 2026-08-30 (Phase 0).
> Bundle identifiers derive from it and are permanent once published.

## Source of truth

| Question | Read |
|---|---|
| What are we building, and why | `docs/PRD.md`, `docs/BRD.md` |
| What are we building **right now** | `plan/STATUS.md` ← always read this first |
| What order | `plan/ROADMAP.md`, `plan/phase-NN-*.md` |
| Why is it built this way | `docs/decisions/` (ADRs) |
| How does the generic/vertical config work | `docs/verticals.md` |
| Security rules | `docs/security.md` |
| Mobile design — look | `docs/design/design-system.md` |
| Mobile design — behaviour | `docs/design/apple-hig.md` |
| Mobile design — motion | `docs/design/motion.md` |
| Offline sync contract | `docs/sync-contract.md` |
| Running on a real device (free) | `docs/device-testing.md` |
| OTP / SMS in India | `docs/otp-sms.md` |

## Structure

```
apps/api        Fastify + Postgres. Owns schema, authorization, money, jobs.
apps/mobile     Expo (iOS + Android). Offline-first daily entry.
packages/contracts   Zod schemas + inferred types. THE API contract.
packages/core        Money, wage math, permissions, status rules. Shared.
packages/verticals   Per-industry seed packs. The ONLY vertical-aware code.
packages/config      Shared tsconfig / eslint / prettier.
```

One repo, two deployables. Both apps import the same schemas, so contract
drift is impossible rather than merely detected. See ADR 0001.

## How we work — phase by phase

This is a large project built in small, complete slices. **Do not build ahead.**

1. Read `plan/STATUS.md` to see where we are.
2. Open the current `plan/phase-NN-*.md`. Work only on unchecked tasks in it.
3. Build a vertical slice: schema → API → tests → screens. Never a layer at a time.
4. Tick tasks in the phase file as they land.
5. At the end of a session, update `plan/STATUS.md`: what shipped, what is
   tested, what is broken, what is next. Five lines is enough.
6. A phase is done only when every one of its exit criteria passes. Then move
   the phase to Done in `plan/ROADMAP.md`.

If asked for something belonging to a later phase, say so and ask before
starting it. Scope creep is the main risk to a project this size.

## Non-negotiable rules

These are not style preferences. Breaking one is a bug.

1. **Tenant isolation.** Every tenant table has `business_id`. Every query runs
   inside a transaction that sets `app.business_id` for row-level security. No
   handler ever reads `business_id` from a request body. Every new collection
   endpoint gets a cross-tenant negative test in the same PR.
2. **Money is never a float.** `NUMERIC(14,2)` in Postgres, **string** in JSON,
   `decimal.js` in code. A rounding paisa in a partner settlement is the exact
   dispute this product exists to prevent.
3. **No vertical vocabulary in core code.** The words furniture, teakwood,
   polish, carpentry etc. may appear only in `packages/verticals/` and `docs/`.
   CI enforces this (`pnpm check:vertical-leak`).
4. **Shared packages are client-safe.** `packages/contracts` and
   `packages/core` must not import a database client, `process.env`, secrets,
   or Node built-ins. They are bundled into the mobile app; the bundle is public.
5. **Every mutation defines four things:** validation, authorization, audit
   record, idempotency behaviour. If any is missing the endpoint is not done.
6. **Audit writes in the same transaction** as the change they describe.
   Audit tables are append-only — no UPDATE, no DELETE.
7. **Offline-creatable rows carry `client_uuid`.** Every mutating endpoint
   accepts `Idempotency-Key`. This is designed in Phase 1, not retrofitted.
8. **No mock persistence in a production flow.** Tests run against real Postgres.
9. **Secrets never in the repo, the app bundle, or an EAS build profile.**
10. **Wage and attendance records are append-only.** Corrections post a
    reversing entry with a reason. A settled wage period is immutable.
11. **Design tokens only in the app.** A hardcoded colour, radius, font size or
    animation duration is a review-blocking error. The identity is defined once
    in `docs/design/design-system.md` and implemented once in
    `apps/mobile/src/ui/theme/`.
12. **Motion is feedback, not decoration.** Reanimated worklets only, nothing
    over 240ms on a data-entry path, `useReducedMotion()` always handled.

## Commands

```bash
pnpm db:up              # postgres + redis + minio
pnpm dev                # all apps
pnpm typecheck          # whole workspace
pnpm test               # everything
pnpm test:affected      # only what changed vs origin/main
pnpm check:vertical-leak
```

## Working agreement

- **Never `git add`, `git commit` or `git push` without asking.** Make the
  changes, then stop and show what changed — the file list plus a point-wise
  summary of what was added or modified — and wait for approval. Editing files
  unprompted is fine; putting them into history is not.
- **`/commit` is the approval.** Running it means the changes have been reviewed
  and cleared, so it stages and commits without asking again. `/commit push`
  also pushes. Nothing else may reach git history unprompted.
- **End every piece of work with a point-wise summary**, grouped by area, saying
  what each change does rather than restating filenames. Separate "added" from
  "changed". It is a review aid, not a changelog.

## Conventions

- **Commits:** `type(scope): summary` — e.g. `feat(labour): muster roll batch upsert`.
  Scopes: `api`, `mobile`, `contracts`, `core`, `verticals`, `ci`, `docs`.
- **Branches:** `phase-NN/short-description`.
- **Migrations** are reviewed as their own commit, and are reversible or ship
  with a written backout plan.
- **Tags:** `api-v*` and `app-v*`. The two deployables do not release in lockstep.
- Prefer editing an existing file over adding a new one.
- Match the surrounding code's idiom. Comment density: low, and only for
  decisions that are not obvious from the code.

## Things that will bite

- Metro + pnpm: `.npmrc` sets `node-linker=hoisted`. Do not remove it without
  testing a physical-device build.
- The API Docker image builds from the **repo root**, not `apps/api` — it needs
  `packages/*`.
- `EXPO_PUBLIC_*` env vars are baked into the app bundle and are public.
