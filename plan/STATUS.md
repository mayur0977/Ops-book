# Status

**Updated:** 2026-08-31
**Current phase:** 1 — Foundation. Design tasks and the whole Workspace block
are done; Database is next.
**Next task:** `packages/api` does not exist yet. Start the Database block —
Drizzle setup, the auth and tenancy tables, and `withTenant()` — against real
Postgres via `pnpm db:up`.

## Shipped

**Phase 1 Workspace block — complete, and this is the first application code in
the repo.** Everything before this commit was documentation.

**`@daybook/config`** — the shared toolchain. `tsconfig.base.json` lives here
and the root file extends it, not the reverse: a `../../` inside the package
resolves against the `node_modules` symlink and breaks the moment a package
consumes it. That was found and fixed, not theorised.

**`@daybook/contracts`** — Zod 4 schemas: money as a validated decimal string,
the error envelope with its status map, E.164 phone, `client_uuid`,
`Idempotency-Key`, the 39-key permission catalogue, and the auth and business
request/response shapes. 34 tests.

**`@daybook/core`** — `money.ts` on decimal.js (add, subtract, sum, multiply,
compare, and a `splitMoney` that always reconciles to the paisa) and permission
evaluation implementing the tri-state resolution order plus invariants 2, 3
and 4 from `docs/permissions.md`. Default role grants transcribed from the
matrix. 42 tests.

**Client-safety is enforced twice.** `scripts/check-client-safe.mjs` checks the
source *and* the declared dependencies — which no linter can see — and runs as
its own CI step next to the vertical-leak check. Both guards were verified with
a deliberate violation, not assumed.

**ADR 0008 — oxlint instead of ESLint.** `typescript-eslint` throws at module
load against TypeScript 7 (`does not support TS 7.0`), in its latest release and
its canary alike. The choice was TypeScript 6 or a different linter; oxlint won
because it never loads the TypeScript API, so the coupling cannot break again.

## Tested

`pnpm typecheck`, `pnpm lint`, `pnpm test` (76 tests), `pnpm check:vertical-leak`
and `pnpm check:client-safe` all green locally on Node 24.20.0. `pnpm peers check`
reports no issues — the tree has no unmet peer dependency.

Not yet tested: anything touching a database, an HTTP handler or a device. None
of it exists.

## Broken / open

**Phase 0 leftovers:**
- Node is now 24.20.0 and matches `.nvmrc` — that blocker is cleared
- No Expo account yet (`eas login`)
- Repo visibility unconfirmed; branch protection not set
- DLT registration not submitted — weeks of waiting, blocks launch not work

**New, small:**
- `.claude/settings.json` still denies `Read(./.env.*)`, which catches the safe,
  committed `.env.example`. Narrowing it needs a human — editing that file is
  blocked from inside a session.
- `.github/workflows/ci.yml` runs on `pull_request` and on pushes to `main`
  only. Under git-flow the integration branch is `develop`, so pushes there
  currently run no CI. One line to fix; not done unprompted.
- oxlint has no type-aware rules. Nothing enforced needs them today. Revisit
  ESLint when typescript-eslint supports TS 7 (their issue #10940).

**Outside this project, but a real hazard:**
- `/Users/mayurpatel/.git` exists — the home directory is a git repository with
  zero tracked files. Any `git add -A` from there would stage `.ssh/`, `.aws/`
  and shell history. `rm -rf ~/.git` unless it is deliberate.

## Git

- On `feature/phase-01-foundation`, branched from `develop`
- Changes are staged in the working tree and **not committed** — awaiting review

## Next

The Database block, in this order, because each step is testable before the
next one is worth writing:

1. Drizzle + drizzle-kit setup and the first migration
2. `users`, `sessions`, `refresh_tokens`, `otp_requests` — no tenancy yet
3. `businesses`, `business_members`, roles and permissions; seed the catalogue
   from `@daybook/contracts` and the grants from `@daybook/core`
4. `audit_logs` and `idempotency_keys`
5. RLS **enabled and forced** on every tenant table, `USING` *and* `WITH CHECK`
6. `withTenant(businessId, fn)`, then the test that the app role lacks
   `BYPASSRLS` — silently catastrophic if wrong, so it is a test, not a habit

Read `docs/ERD.md` first; it is the design this block implements.

---

### How to update this file

Rewrite the sections above at the end of each session. Keep it short — it is a
handover note, not a changelog. Git history is the changelog.
